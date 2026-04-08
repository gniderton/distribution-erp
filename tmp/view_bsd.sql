 SELECT bse.id AS statement_entry_id,
    bse.transaction_date,
    bse.bank_account_id,
    ba.bank_name AS account,
    bse.particulars AS bank_narration,
    bse.debit_amount,
    bse.credit_amount,
    bse.status AS reconciliation_status,
        CASE
            WHEN (cp.id IS NOT NULL) THEN 'Sales Receipt'::text
            WHEN (vp.id IS NOT NULL) THEN 'Vendor Payment'::text
            WHEN (ex.id IS NOT NULL) THEN 'Expense'::text
            WHEN (oi.id IS NOT NULL) THEN 'Other Income'::text
            WHEN ((tr_from.id IS NOT NULL) OR (tr_to.id IS NOT NULL)) THEN 'Internal Transfer'::text
            WHEN (ea.id IS NOT NULL) THEN 'Salary Advance'::text
            WHEN (at.id IS NOT NULL) THEN
            CASE
                WHEN (at.transaction_type = 'PAYMENT'::text) THEN 'Asset Purchase'::text
                WHEN (at.transaction_type = 'SALE_PAYMENT'::text) THEN 'Asset Sale'::text
                ELSE 'Asset Trans'::text
            END
            WHEN (lt.id IS NOT NULL) THEN 'Loan Transaction'::text
            WHEN (es.id IS NOT NULL) THEN 'Salary Payment'::text
            ELSE 'Unreconciled'::text
        END AS transaction_type,
    COALESCE(cp.payment_number, (vp.payment_number)::character varying, (ex.expense_number)::character varying, (oi.income_number)::character varying, (tr_from.reference_no)::character varying, (tr_to.reference_no)::character varying, (('ADV-'::text || ea.id))::character varying, (('SAL-'::text || es.id))::character varying, 'N/A'::character varying) AS erp_reference,
    COALESCE(custom.customer_name, vend.vendor_name, ee.name, ie.name, ea_emp.full_name, es_emp.full_name, 'Internal/System'::text) AS party_name,
    COALESCE(ex.description, oi.description, vp.remarks, tr_from.remarks, tr_to.remarks, ea.remarks, at.remarks, lt.remarks, 'N/A'::text) AS user_narration,
    COALESCE(emp.full_name, ea_creator.full_name, 'System'::text) AS recorded_by,
    COALESCE(cp.payment_date, vp.payment_date, ex.expense_date, oi.transaction_date, tr_from.transfer_date, tr_to.transfer_date, ea.advance_date, at.transaction_date, lt.transaction_date, (es.created_at)::date) AS erp_date,
    COALESCE(cp.created_at, vp.created_at, ex.created_at, oi.created_at, tr_from.created_at, tr_to.created_at, ea.created_at, (at.created_at)::timestamp with time zone, lt.created_at, es.created_at) AS erp_recorded_at
   FROM (((((((((((((((((((bank_statement_entries bse
     LEFT JOIN bank_accounts ba ON ((bse.bank_account_id = ba.id)))
     LEFT JOIN customer_payments cp ON ((bse.id = cp.bank_statement_entry_id)))
     LEFT JOIN customers custom ON ((cp.customer_id = custom.id)))
     LEFT JOIN vendor_payments vp ON ((bse.id = vp.bank_statement_entry_id)))
     LEFT JOIN vendors vend ON ((vp.vendor_id = vend.id)))
     LEFT JOIN expenses ex ON ((bse.id = ex.bank_statement_entry_id)))
     LEFT JOIN expense_entities ee ON ((ex.entity_id = ee.id)))
     LEFT JOIN other_income oi ON ((bse.id = oi.bank_statement_entry_id)))
     LEFT JOIN income_entities ie ON ((oi.entity_id = ie.id)))
     LEFT JOIN internal_transfers tr_from ON ((bse.id = tr_from.from_bank_statement_entry_id)))
     LEFT JOIN internal_transfers tr_to ON ((bse.id = tr_to.to_bank_statement_entry_id)))
     LEFT JOIN employee_advances ea ON ((bse.id = ea.bank_statement_entry_id)))
     LEFT JOIN employees ea_emp ON ((ea.employee_id = ea_emp.id)))
     LEFT JOIN asset_transactions at ON ((bse.id = at.bank_statement_entry_id)))
     LEFT JOIN loan_transactions lt ON ((bse.id = lt.bank_statement_entry_id)))
     LEFT JOIN employee_salaries es ON ((bse.id = es.bank_statement_entry_id)))
     LEFT JOIN employees es_emp ON ((es.employee_id = es_emp.id)))
     LEFT JOIN employees emp ON ((COALESCE(ex.created_by, oi.created_by) = emp.id)))
     LEFT JOIN employees ea_creator ON ((ea.created_by = ea_creator.id)));