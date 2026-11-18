/**
 * Shared ground-truth Invoice Balance & Return Allocation Helper (Backened).
 *
 * Ensures customer_payment_allocations (status = 'ACTIVE') AND advance_utilizations
 * are both accounted for consistently across Delivery Returns, Sales Returns,
 * Unified Sales views, Payment Reconciliation, and Cheque Bounce reversals.
 */

function round2(n) {
    const num = Number(n || 0);
    if (!Number.isFinite(num)) return 0;
    return Math.round((num + (num >= 0 ? 1e-12 : -1e-12)) * 100) / 100;
}

/**
 * Computes live remaining balance of an invoice from ground-truth active
 * allocations + advance_utilizations while holding a FOR UPDATE row lock.
 */
async function getInvoiceLiveBalance(client, invoiceId) {
    const invRes = await client.query(`
        SELECT id, customer_id, invoice_number, grand_total, status,
               COALESCE((
                   SELECT SUM(amount) FROM customer_payment_allocations
                   WHERE invoice_id = si.id AND status = 'ACTIVE'
               ), 0) AS cpa_active,
               COALESCE((
                   SELECT SUM(amount) FROM advance_utilizations
                   WHERE invoice_id = si.id
               ), 0) AS adv_util
        FROM sales_invoices si
        WHERE si.id = $1
        FOR UPDATE
    `, [invoiceId]);

    if (invRes.rows.length === 0) return null;
    const row = invRes.rows[0];
    const grandTotal = round2(row.grand_total);
    const paid = round2(Number(row.cpa_active) + Number(row.adv_util));
    const balance = String(row.status || '') === 'Cancelled'
        ? 0
        : Math.max(0, round2(grandTotal - paid));

    return {
        id: row.id,
        customer_id: row.customer_id,
        invoice_number: row.invoice_number,
        grand_total: grandTotal,
        status: row.status,
        cpa_active: round2(row.cpa_active),
        adv_util: round2(row.adv_util),
        paid_amount: paid,
        balance
    };
}

/**
 * Recomputes and updates sales_invoices (amount_paid, paid_amount, balance_amount, status)
 * strictly from active allocations + advance_utilizations.
 */
async function syncInvoiceFromAllocations(client, invoiceId) {
    const info = await getInvoiceLiveBalance(client, invoiceId);
    if (!info) return null;

    if (String(info.status || '') === 'Cancelled') {
        await client.query(`
            UPDATE sales_invoices
            SET amount_paid = 0, paid_amount = 0, balance_amount = 0
            WHERE id = $1
        `, [invoiceId]);
        return { ...info, balance: 0, status: 'Cancelled' };
    }

    let nextStatus = 'Unpaid';
    if (info.balance <= 0.01 && info.grand_total > 0) {
        nextStatus = 'Paid';
    } else if (info.paid_amount > 0.01) {
        nextStatus = 'Partially Paid';
    }

    await client.query(`
        UPDATE sales_invoices
        SET amount_paid = $1,
            paid_amount = $1,
            status = $2
        WHERE id = $3
    `, [info.paid_amount, nextStatus, invoiceId]);

    return { ...info, status: nextStatus };
}

/**
 * Applies a Sales Return / Credit Note amount against customer's open invoices
 * (priority: specificInvoiceIds -> trip invoices -> customer's remaining unpaid invoices)
 * using live balance (grand_total - ACTIVE CPA - advance_utilizations),
 * and parks any remaining unutilized credit into customer_advances.
 */
async function allocateReturnCreditToInvoicesAndAdvance(client, {
    returnId,
    customerId,
    totalCredit,
    specificInvoiceIds = [],
    tripId = null,
    syncId = null,
    minThreshold = 0.01
}) {
    let creditRemaining = round2(totalCredit);
    const visitedIds = new Set();
    const allocationsCreated = [];

    let resolvedTripId = tripId;
    if (!resolvedTripId && syncId) {
        const slRes = await client.query(`SELECT trip_id FROM sync_logs WHERE id = $1`, [syncId]);
        resolvedTripId = slRes.rows[0]?.trip_id || null;
    }

    const tryApplyInvoice = async (invId) => {
        if (!invId || creditRemaining <= minThreshold) return;
        const key = String(invId);
        if (visitedIds.has(key)) return;
        visitedIds.add(key);

        const invInfo = await getInvoiceLiveBalance(client, invId);
        if (!invInfo) return;
        if (String(invInfo.customer_id) !== String(customerId)) return;
        if (String(invInfo.status || '') === 'Cancelled') return;
        if (invInfo.balance <= 0.01) return;

        const apply = round2(Math.min(creditRemaining, invInfo.balance));
        if (apply <= 0.01) return;

        const expectedBalance = Math.max(0, round2(invInfo.balance - apply));
        await client.query(`
            INSERT INTO customer_payment_allocations (
                invoice_id, amount, allocated_at, return_id, status, expected_invoice_balance
            ) VALUES ($1, $2, NOW(), $3, 'ACTIVE', $4)
        `, [invInfo.id, apply, returnId, expectedBalance]);

        await syncInvoiceFromAllocations(client, invInfo.id);
        creditRemaining = Math.max(0, round2(creditRemaining - apply));
        allocationsCreated.push({ invoice_id: invInfo.id, amount: apply, expected_balance: expectedBalance });
    };

    // Layer 1: Explicitly linked / invoice_id targets
    for (const invId of specificInvoiceIds) {
        await tryApplyInvoice(invId);
    }

    // Layer 2: Invoices on the current delivery trip for this customer
    if (resolvedTripId && creditRemaining > minThreshold) {
        const tripInvoices = await client.query(`
            SELECT DISTINCT si.id, si.invoice_date
            FROM sales_invoices si
            JOIN trip_invoices ti ON ti.invoice_id = si.id
            WHERE ti.trip_id::text = $1::text
              AND si.customer_id = $2
              AND si.status != 'Cancelled'
            ORDER BY si.invoice_date DESC, si.id DESC
        `, [resolvedTripId, customerId]);

        for (const inv of tripInvoices.rows) {
            if (creditRemaining <= minThreshold) break;
            await tryApplyInvoice(inv.id);
        }
    }

    // Layer 3: Any other open unpaid invoices for this customer
    if (creditRemaining > minThreshold) {
        const openInvs = await client.query(`
            SELECT si.id
            FROM sales_invoices si
            WHERE si.customer_id = $1
              AND si.status != 'Cancelled'
              AND (
                  si.grand_total
                  - COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = si.id AND status = 'ACTIVE'), 0)
                  - COALESCE((SELECT SUM(amount) FROM advance_utilizations WHERE invoice_id = si.id), 0)
              ) > 0.01
            ORDER BY si.invoice_date DESC, si.id DESC
        `, [customerId]);

        for (const inv of openInvs.rows) {
            if (creditRemaining <= minThreshold) break;
            await tryApplyInvoice(inv.id);
        }
    }

    // Layer 4: Remaining unutilized credit becomes an active Customer Advance
    let advanceId = null;
    let advanceAmount = 0;
    if (creditRemaining > 0.01) {
        const advRes = await client.query(`
            INSERT INTO customer_advances (customer_id, return_id, amount, balance)
            VALUES ($1, $2, $3, $3)
            RETURNING id
        `, [customerId, returnId, creditRemaining]);
        advanceId = advRes.rows[0].id;
        advanceAmount = creditRemaining;
    }

    return {
        appliedAmount: round2(totalCredit - advanceAmount),
        advanceAmount,
        advanceId,
        allocationsCreated
    };
}

module.exports = {
    round2,
    getInvoiceLiveBalance,
    syncInvoiceFromAllocations,
    allocateReturnCreditToInvoicesAndAdvance
};
