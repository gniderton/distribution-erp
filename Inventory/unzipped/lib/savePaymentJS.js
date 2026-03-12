const vendor = varSelectedVendor.value;
const totalAmount = payAmount.value;
const isRefund = payType.value === 'REFUND';

// Validate
if (!totalAmount || totalAmount <= 0) {
    utils.showNotification({ title: "Error", description: "Enter valid amount", notificationType: "error" });
    return;
}

let allocations = [];
// ONLY calculate allocations if it is a PAYMENT
if (!isRefund) {
    const selectedBills = tblPendingBills.selectedSourceRows || []; 
    if (selectedBills.length > 0) {
        // FIFO Logic
        let remainingPayment = Number(totalAmount);
        for (const bill of selectedBills) {
            if (remainingPayment <= 0) break;
            const billBalance = Number(bill['Balance $']);
            const allocAmount = Math.min(billBalance, remainingPayment);
            
            if (allocAmount > 0) {
                allocations.push({
                    invoice_id: bill.id,
                    amount: allocAmount
                });
                remainingPayment -= allocAmount;
            }
        }
    }
}

// Trigger API
apiMakePayment.trigger({
    additionalScope: {
        payload: {
            vendor_id: vendor.id,
            amount: totalAmount,
            payment_date: moment(payDate.value).format("YYYY-MM-DD"),
            mode: payMode.value,
            // [NEW] Unified Reference logic
            transaction_ref: payMode.value === 'Online' ? selBankRefVendor.selectedItem.bank_ref_id : (payMode.value === 'Cheque' ? payChqNo.value : payRef.value),
            bank_statement_entry_id: payMode.value === 'Online' ? selBankRefVendor.selectedItem.id : null,
            remarks: payRemarks.value,
            transaction_type: payType.value,
            allocations: isRefund ? [] : allocations,
            bank_account_id: selPaymentBank.value,
            // [NEW] Cheque Details
            cheque_no: payChqNo.value,
            cheque_date: payChqDate.value,
            bank_name: payChqBank.value
        }
    },
    onSuccess: function() {
        modalMakePayment.close();
        getVendorLedger.trigger();
        getVendorPendingBills.trigger();
        utils.showNotification({ title: "Success", description: "Transaction Recorded", notificationType: "success" });
    }
});
