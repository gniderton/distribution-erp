const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// @route   GET /api/employees/designations - List Master Designations
router.get('/designations', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, code, title, department FROM designations ORDER BY title ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/employees/profile - Flexible Profile (Email or ID query)
router.get('/profile', async (req, res) => {
    try {
        const { email, id: queryId } = req.query;
        let id = queryId;

        if (email) {
            const empRes = await pool.query('SELECT id FROM employees WHERE email = $1', [email]);
            if (empRes.rows.length === 0) return res.status(404).json({ error: 'Employee with this email not found' });
            id = empRes.rows[0].id;
        }

        if (!id) return res.status(400).json({ error: 'Employee ID or Email is required' });

        // Execute all queries in parallel
        const [
            profileRes,
            advanceRes,
            liabilityRes,
            loanRes,
            salaryHistoryRes,
            paymentHistoryRes,
            attendanceRes
        ] = await Promise.all([
            pool.query('SELECT * FROM view_employee_details WHERE id = $1', [id]),
            pool.query('SELECT COALESCE(SUM(amount), 0) as total FROM employee_advances WHERE employee_id = $1 AND is_settled = FALSE', [id]),
            pool.query('SELECT COALESCE(SUM(amount), 0) as total FROM employee_liabilities WHERE employee_id = $1 AND status = \'PENDING\'', [id]),
            pool.query(`
                SELECT l.id, l.loan_type, l.balance_principal, l.emi_amount, l.status 
                FROM loans l
                JOIN loan_entities le ON l.party_id = le.id
                WHERE le.reference_id = $1 AND le.entity_type = 'Employee' AND l.status = 'Active'
            `, [id]),
            pool.query('SELECT * FROM employee_salary_history WHERE employee_id = $1 ORDER BY effective_date DESC', [id]),
            pool.query('SELECT * FROM employee_salaries WHERE employee_id = $1 ORDER BY year DESC, month DESC LIMIT 6', [id]),
            pool.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE status = 'Present') as present_days,
                    COUNT(*) FILTER (WHERE status = 'Absent') as absent_days,
                    COUNT(*) FILTER (WHERE status = 'Half-Day') as half_days
                FROM employee_attendance 
                WHERE employee_id = $1 AND attendance_date > CURRENT_DATE - INTERVAL '30 days'
            `, [id])
        ]);

        if (profileRes.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });

        const baseProfile = profileRes.rows[0];

        // Combine for compatibility: Top level has flat profile fields, plus forensic objects
        res.json({
            ...baseProfile, // Legacy compatibility (getMe.data.id works)
            profile: baseProfile, // New dashboard structure
            financials: {
                outstanding_advance: advanceRes.rows[0].total,
                outstanding_liability: liabilityRes.rows[0].total,
                active_loans: loanRes.rows,
                total_loan_balance: loanRes.rows.reduce((sum, l) => sum + Number(l.balance_principal), 0)
            },
            career: {
                salary_progression: salaryHistoryRes.rows,
                recent_payments: paymentHistoryRes.rows
            },
            performance: {
                attendance_30d: attendanceRes.rows[0]
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/employees/profile/:id - Full Forensic Profile (URL Param)
router.get('/profile/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'Employee ID is required' });

        // Execute all queries in parallel for maximum performance
        const [
            profileRes,
            advanceRes,
            liabilityRes,
            loanRes,
            salaryHistoryRes,
            paymentHistoryRes,
            attendanceRes
        ] = await Promise.all([
            // 1. Basic Profile
            pool.query('SELECT * FROM view_employee_details WHERE id = $1', [id]),
            
            // 2. Financials: Advances
            pool.query('SELECT COALESCE(SUM(amount), 0) as total FROM employee_advances WHERE employee_id = $1 AND is_settled = FALSE', [id]),
            
            // 3. Financials: Liabilities
            pool.query('SELECT COALESCE(SUM(amount), 0) as total FROM employee_liabilities WHERE employee_id = $1 AND status = \'PENDING\'', [id]),
            
            // 4. Financials: Active Loans
            pool.query(`
                SELECT l.id, l.loan_type, l.balance_principal, l.emi_amount, l.status 
                FROM loans l
                JOIN loan_entities le ON l.party_id = le.id
                WHERE le.reference_id = $1 AND le.entity_type = 'Employee' AND l.status = 'Active'
            `, [id]),

            // 5. Career: Salary History
            pool.query('SELECT * FROM employee_salary_history WHERE employee_id = $1 ORDER BY effective_date DESC', [id]),

            // 6. History: Last 6 Payments
            pool.query('SELECT * FROM employee_salaries WHERE employee_id = $1 ORDER BY year DESC, month DESC LIMIT 6', [id]),

            // 7. Attendance: Last 30 Days Summary
            pool.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE status = 'Present') as present_days,
                    COUNT(*) FILTER (WHERE status = 'Absent') as absent_days,
                    COUNT(*) FILTER (WHERE status = 'Half-Day') as half_days
                FROM employee_attendance 
                WHERE employee_id = $1 AND attendance_date > CURRENT_DATE - INTERVAL '30 days'
            `, [id])
        ]);

        if (profileRes.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.json({
            profile: profileRes.rows[0],
            financials: {
                outstanding_advance: advanceRes.rows[0].total,
                outstanding_liability: liabilityRes.rows[0].total,
                active_loans: loanRes.rows,
                total_loan_balance: loanRes.rows.reduce((sum, l) => sum + Number(l.balance_principal), 0)
            },
            career: {
                salary_progression: salaryHistoryRes.rows,
                recent_payments: paymentHistoryRes.rows
            },
            performance: {
                attendance_30d: attendanceRes.rows[0]
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/employees/bulk-bonus - Record Multiple Bonuses
router.post('/bulk-bonus', async (req, res) => {
    const { bonuses } = req.body;
    if (!bonuses || !Array.isArray(bonuses)) return res.status(400).json({ error: 'Bonuses array required' });
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const b of bonuses) {
            await client.query(`
                INSERT INTO employee_bonuses (employee_id, amount, bonus_date, bonus_type, remarks)
                VALUES ($1, $2, $3, $4, $5)
            `, [b.employee_id, b.amount, b.bonus_date || new Date(), b.bonus_type || 'MANUAL', b.remarks]);
        }
        await client.query('COMMIT');
        res.json({ success: true, message: `Successfully queued ${bonuses.length} bonuses` });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// @route   GET /api/employees - List Employees
router.get('/', async (req, res) => {
    try {
        const { role, employment_status, limit = 50, offset = 0 } = req.query;

        let query = 'SELECT * FROM view_employee_details WHERE 1=1';
        const params = [];
        let pIdx = 1;

        // 1. Employment Status Filter (Default to Active)
        let statusList = ['Active'];
        if (employment_status) {
            // Handle both array-like strings from Appsmith and comma-separated lists
            statusList = employment_status.toString().replace(/[\[\]"]/g, '').split(',').map(s => s.trim());
        }
        
        query += ` AND employment_status = ANY($${pIdx})`;
        params.push(statusList);
        pIdx++;

        // 2. Role Filter
        if (role) {
            if (role.toUpperCase() === 'DSE') {
                query += ` AND designation_id IN (11, 14)`;
            } else {
                query += ` AND (designation_id = $${pIdx} OR designation_name ILIKE $${pIdx})`;
                params.push(role);
                pIdx++;
            }
        }

        query += ` ORDER BY full_name ASC LIMIT $${pIdx} OFFSET $${pIdx + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});


// @route   POST /api/employees - Create Comprehensive
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            full_name,
            designation_id,
            email,
            contact_primary,
            contact_secondary,
            address,
            joining_date,
            salary, // Initial salary
            gender,
            aadhar_no,
            license_no,
            bank_name,
            account_no,
            ifsc_code,
            user_id // Who created this
        } = req.body;

        await client.query('BEGIN');

        // 1. Generate Employee Code
        const seqRes = await client.query(
            "SELECT prefix || LPAD(current_number::text, 4, '0') as code, id FROM document_sequences WHERE document_type = 'EMPLOYEE' FOR UPDATE"
        );
        if (seqRes.rows.length === 0) throw new Error("Employee sequence not found");
        const employeeCode = seqRes.rows[0].code;
        await client.query("UPDATE document_sequences SET current_number = current_number + 1 WHERE id = $1", [seqRes.rows[0].id]);

        // 2. Insert Employee
        const empRes = await client.query(`
            INSERT INTO employees (
                employee_code, full_name, designation_id, email, contact_primary, contact_secondary,
                address, joining_date, gender, aadhar_no, license_no,
                bank_name, account_no, ifsc_code, login_pin
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, '1234')
            RETURNING id
        `, [
            employeeCode, full_name, designation_id, email, contact_primary, contact_secondary,
            address, joining_date || new Date(), gender, aadhar_no, license_no,
            bank_name, account_no, ifsc_code
        ]);
        const employeeId = empRes.rows[0].id;

        // 3. Record Initial Salary in History
        if (salary && Number(salary) > 0) {
            await client.query(`
                INSERT INTO employee_salary_history (
                    employee_id, effective_date, previous_salary, new_salary, 
                    reason, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                employeeId, joining_date || new Date(), 0, salary,
                'Joining Salary', user_id
            ]);
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, id: employeeId, employee_code: employeeCode });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// @route   POST /api/employees/:id/salary-update
router.post('/:id/salary-update', async (req, res) => {
    try {
        const { id } = req.params;
        const { effective_date, new_salary, reason, user_id } = req.body;

        // Get Current Salary from history
        const currentSalaryRes = await pool.query(
            "SELECT new_salary FROM employee_salary_history WHERE employee_id = $1 ORDER BY effective_date DESC, created_at DESC LIMIT 1",
            [id]
        );
        const previousSalary = currentSalaryRes.rows.length > 0 ? Number(currentSalaryRes.rows[0].new_salary) : 0;
        await pool.query(`
            INSERT INTO employee_salary_history (
                employee_id, effective_date, previous_salary, new_salary, 
                reason, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [id, effective_date || new Date(), previousSalary, new_salary, reason, user_id]);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/employees/:id/salary-history
router.get('/:id/salary-history', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM employee_salary_history WHERE employee_id = $1 ORDER BY effective_date DESC, created_at DESC",
            [req.params.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/employees/bulk-salary-update
router.post('/bulk-salary-update', async (req, res) => {
    const client = await pool.connect();
    try {
        const { updates, effective_date, reason, user_id } = req.body;
        // updates = [{ employee_id, new_salary }, ...]

        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ error: "Updates array is required" });
        }

        await client.query('BEGIN');

        for (const update of updates) {
            const { employee_id, new_salary } = update;

            // Get Current Salary
            const currentSalaryRes = await client.query(
                "SELECT new_salary FROM employee_salary_history WHERE employee_id = $1 ORDER BY effective_date DESC, created_at DESC LIMIT 1",
                [employee_id]
            );
            const previousSalary = currentSalaryRes.rows.length > 0 ? Number(currentSalaryRes.rows[0].new_salary) : 0;

            await client.query(`
                INSERT INTO employee_salary_history (
                    employee_id, effective_date, previous_salary, new_salary, 
                    reason, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [employee_id, effective_date || new Date(), previousSalary, new_salary, reason, user_id]);
        }

        await client.query('COMMIT');
        res.json({ success: true, count: updates.length });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// @route   POST /api/employees/bulk-attendance
router.post('/bulk-attendance', async (req, res) => {
    const client = await pool.connect();
    try {
        const { employee_ids, status, attendance_date, remarks } = req.body;

        if (!Array.isArray(employee_ids) || employee_ids.length === 0) {
            return res.status(400).json({ error: "employee_ids array is required" });
        }

        if (!status || !['Absent', 'Half-Day'].includes(status)) {
            return res.status(400).json({ error: "Valid status (Absent/Half-Day) is required" });
        }

        await client.query('BEGIN');

        for (const empId of employee_ids) {
            await client.query(`
                INSERT INTO employee_attendance (employee_id, attendance_date, status, remarks)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (employee_id, attendance_date) 
                DO UPDATE SET status = EXCLUDED.status, remarks = EXCLUDED.remarks, created_at = NOW()
            `, [empId, attendance_date || new Date(), status, remarks || null]);
        }

        await client.query('COMMIT');
        res.json({ success: true, count: employee_ids.length });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// @route   GET /api/employees/attendance/report - Company-wide report
router.get('/attendance/report', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({ error: "start_date and end_date are required" });
        }

        const query = `
            SELECT 
                e.id as employee_id,
                e.full_name,
                e.employee_code,
                d.title as designation_name,
                COUNT(ea.id) FILTER (WHERE ea.status = 'Absent') as total_absent,
                COUNT(ea.id) FILTER (WHERE ea.status = 'Half-Day') as total_half_day
            FROM employees e
            LEFT JOIN designations d ON e.designation_id = d.id
            LEFT JOIN employee_attendance ea ON e.id = ea.employee_id 
                AND ea.attendance_date BETWEEN $1 AND $2
            WHERE e.employment_status = 'Active'
            GROUP BY e.id, e.full_name, e.employee_code, d.title
            ORDER BY e.full_name ASC
        `;

        const result = await pool.query(query, [start_date, end_date]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/employees/attendance/details - Detailed lines for all employees
router.get('/attendance/details', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({ error: "start_date and end_date are required" });
        }

        const query = `
            SELECT 
                ea.id,
                ea.employee_id,
                e.full_name,
                e.employee_code,
                ea.attendance_date,
                ea.status,
                ea.remarks
            FROM employee_attendance ea
            JOIN employees e ON ea.employee_id = e.id
            WHERE ea.attendance_date BETWEEN $1 AND $2
            ORDER BY ea.attendance_date DESC, e.full_name ASC
        `;

        const result = await pool.query(query, [start_date, end_date]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/employees/:id/attendance
router.get('/:id/attendance', async (req, res) => {
    try {
        const { id } = req.params;
        const { start_date, end_date } = req.query;

        let query = 'SELECT * FROM employee_attendance WHERE employee_id = $1';
        const params = [id];
        let pIdx = 2;

        if (start_date && end_date) {
            query += ` AND attendance_date BETWEEN $${pIdx} AND $${pIdx + 1}`;
            params.push(start_date, end_date);
            pIdx += 2;
        }

        query += ' ORDER BY attendance_date DESC';

        const history = await pool.query(query, params);

        // Calculate Totals
        const summaryRes = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'Absent') as total_absent,
                COUNT(*) FILTER (WHERE status = 'Half-Day') as total_half_day
            FROM employee_attendance 
            WHERE employee_id = $1 ${start_date && end_date ? 'AND attendance_date BETWEEN $2 AND $3' : ''}
        `, params);

        res.json({
            history: history.rows,
            summary: summaryRes.rows[0]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/employees/liabilities - Record Employee Liability
router.post('/liabilities', async (req, res) => {
    const client = await pool.connect();
    try {
        const { employee_id, amount, description, type, invoice_id, user_id } = req.body;
        if (!employee_id || !amount || !description || !type) {
            return res.status(400).json({ error: "Missing required fields: employee_id, amount, description, type" });
        }

        await client.query('BEGIN');

        // 1. Record the liability
        const result = await client.query(`
            INSERT INTO employee_liabilities (employee_id, amount, description, type, invoice_id, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `, [employee_id, amount, description, type, invoice_id || null, user_id]);
        const liabilityId = result.rows[0].id;

        // 2. If Invoice ID provided, do immediate adjustment to customer ledger
        if (invoice_id) {
            // A. Get Customer Info
            const invRes = await client.query('SELECT customer_id, invoice_number FROM sales_invoices WHERE id = $1', [invoice_id]);
            if (invRes.rows.length === 0) throw new Error("Invoice not found");
            const { customer_id, invoice_number } = invRes.rows[0];

            // B. Create Customer Payment (Internal Adjustment)
            const payRes = await client.query(`
                INSERT INTO customer_payments (
                    customer_id, amount, payment_mode, transaction_ref, 
                    status, verification_status, payment_date, collected_by, remarks
                ) VALUES ($1, $2, 'EMPLOYEE_ADJUSTMENT', $3, 'Verified', 'Verified', NOW(), $4, $5)
                RETURNING id
            `, [customer_id, amount, `EMP-LIAB-${liabilityId}`, user_id, `Employee Liability Recovery - ${description}`]);
            const paymentId = payRes.rows[0].id;

            // C. Create Allocation
            await client.query(`
                INSERT INTO customer_payment_allocations (payment_id, invoice_id, amount, status)
                VALUES ($1, $2, $3, 'ACTIVE')
            `, [paymentId, invoice_id, amount]);

            // D. Update Invoice Balance/Status
            await client.query(`
                UPDATE sales_invoices 
                SET amount_paid = COALESCE(amount_paid, 0) + $1,
                    paid_amount = COALESCE(paid_amount, 0) + $1,
                    status = CASE 
                        WHEN (grand_total - (COALESCE(paid_amount, 0) + $1)) <= 1 THEN 'Paid'
                        ELSE 'Partially Paid' 
                    END
                WHERE id = $2
            `, [amount, invoice_id]);

            // E. Journal Entry: Dr 1020 (Emp Advance/Liab), Cr 1101 (Accounts Receivable)
            const lines = [
                { code: 1020, debit: amount, credit: 0 },
                { code: 1101, debit: 0, credit: amount }
            ];
            await client.query(`
                SELECT create_journal_entry($1, $2, $3, $4, $5)
            `, [new Date(), `Emp Liab Adjustment: ${invoice_number} (Ref: ${liabilityId})`, 'EMP_LIAB_ADJ', liabilityId, JSON.stringify(lines)]);
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, id: liabilityId });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// @route   GET /api/employees/:id/liabilities - List PENDING Liabilities
router.get('/:id/liabilities', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT el.*, si.invoice_number 
            FROM employee_liabilities el
            LEFT JOIN sales_invoices si ON el.invoice_id = si.id
            WHERE el.employee_id = $1 AND el.status = 'PENDING'
            ORDER BY el.created_at DESC
        `, [id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   DELETE /api/employees/liabilities/:id - Cancel/Remove Liability
router.delete('/liabilities/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("UPDATE employee_liabilities SET status = 'CANCELLED' WHERE id = $1", [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/employees/bulk-salary-advance
router.post('/bulk-salary-advance', async (req, res) => {
    const client = await pool.connect();
    try {
        const { advances, advance_date, remarks, user_id } = req.body;

        if (!Array.isArray(advances) || advances.length === 0) {
            return res.status(400).json({ error: "advances array is required" });
        }

        await client.query('BEGIN');

        for (const adv of advances) {
            let { employee_id, amount, payment_mode, from_account_id, bank_statement_entry_id } = adv;

            // Intelligently determine from_account_id if a bank statement entry was selected
            if (payment_mode === 'Online' && bank_statement_entry_id) {
                const bRes = await client.query('SELECT bank_account_id FROM bank_statement_entries WHERE id = $1', [bank_statement_entry_id]);
                if (bRes.rows.length > 0) {
                    from_account_id = bRes.rows[0].bank_account_id;
                }
            }

            // 1. Insert Advance Record
            const advRes = await client.query(`
                INSERT INTO employee_advances (
                    employee_id, advance_date, amount, payment_mode, 
                    from_account_id, bank_statement_entry_id, remarks, created_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id
            `, [
                employee_id, advance_date || new Date(), amount, payment_mode,
                from_account_id, bank_statement_entry_id || null, remarks || 'Salary Advance', user_id
            ]);

            const advanceId = advRes.rows[0].id;

            // 2. Create Journal Entry
            // Account 1020: Employee Salary Advances (Asset)
            // Account 1002: Bank (Asset) or 1003: Cash (Asset)
            const creditAccountCode = payment_mode === 'Online' ? 1002 : 1003;
            
            const lines = [
                { code: 1020, debit: amount, credit: 0 },
                { code: creditAccountCode, debit: 0, credit: amount }
            ];

            const journalRes = await client.query(`
                SELECT create_journal_entry($1, $2, $3, $4, $5) as entry_id
            `, [
                advance_date || new Date(),
                `Salary Advance - Emp ID: ${employee_id}`,
                'SALARY_ADVANCE',
                advanceId,
                JSON.stringify(lines)
            ]);

            const journalEntryId = journalRes.rows[0].entry_id;

            // 3. Link Journal Entry to Advance
            await client.query(`
                UPDATE employee_advances SET journal_entry_id = $1 WHERE id = $2
            `, [journalEntryId, advanceId]);

            // 4. Update Bank Statement Entry (Reconciliation)
            if (payment_mode === 'Online' && bank_statement_entry_id) {
                await client.query(`
                    UPDATE bank_statement_entries 
                    SET consumed_amount = consumed_amount + $1,
                        status = CASE 
                            WHEN (consumed_amount + $1) >= amount THEN 'Exhausted' 
                            ELSE 'Partially Consumed' 
                        END
                    WHERE id = $2
                `, [amount, bank_statement_entry_id]);
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, count: advances.length });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// @route   GET /api/employees/salary-preview
router.get('/salary-preview', async (req, res) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) return res.status(400).json({ error: "month and year required" });

        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];

        const query = `
            WITH AttendanceStats AS (
                SELECT 
                    employee_id,
                    COUNT(*) FILTER (WHERE status = 'Absent')::int as absent_days,
                    COUNT(*) FILTER (WHERE status = 'Half-Day')::int as half_days
                FROM employee_attendance
                WHERE attendance_date::date BETWEEN $1::date AND $2::date
                GROUP BY employee_id
            ),
            AdvanceStats AS (
                SELECT 
                    employee_id,
                    SUM(amount) as total_advances
                FROM employee_advances
                WHERE is_settled = FALSE
                GROUP BY employee_id
            ),
            BonusStats AS (
                SELECT 
                    employee_id,
                    SUM(amount) as total_bonuses
                FROM employee_bonuses
                WHERE is_settled = FALSE
                GROUP BY employee_id
            ),
            LoanStats AS (
                SELECT 
                    le.reference_id as employee_id,
                    SUM(l.emi_amount) as total_emi
                FROM loans l
                JOIN loan_entities le ON l.party_id = le.id
                WHERE l.party_type = 'EMPLOYEE' 
                  AND l.status = 'Active'
                GROUP BY le.reference_id
            ),
            LiabilityStats AS (
                SELECT 
                    employee_id,
                    SUM(amount) as total_liabilities
                FROM employee_liabilities
                WHERE status = 'PENDING'
                GROUP BY employee_id
            ),
            CurrentSalary AS (
                SELECT DISTINCT ON (employee_id) employee_id, new_salary 
                FROM employee_salary_history 
                ORDER BY employee_id, effective_date DESC, created_at DESC
            ),
            PaidStatus AS (
                SELECT employee_id 
                FROM employee_salaries
                WHERE month = $3 AND year = $4
            )
            SELECT 
                e.id, e.full_name, e.employee_code, e.joining_date, e.resignation_date, e.employment_status,
                COALESCE(cs.new_salary, 0) as base_salary,
                COALESCE(att.absent_days, 0) as absent_days,
                COALESCE(att.half_days, 0) as half_days,
                COALESCE(adv.total_advances, 0) as advance_deduction,
                COALESCE(bs.total_bonuses, 0) as bonus_addition,
                COALESCE(ls.total_emi, 0) as loan_deduction,
                COALESCE(liab.total_liabilities, 0) as misc_liabilities,
                CASE WHEN ps.employee_id IS NOT NULL THEN true ELSE false END as is_paid
            FROM employees e
            LEFT JOIN CurrentSalary cs ON e.id = cs.employee_id
            LEFT JOIN AttendanceStats att ON e.id = att.employee_id
            LEFT JOIN AdvanceStats adv ON e.id = adv.employee_id
            LEFT JOIN BonusStats bs ON e.id = bs.employee_id
            LEFT JOIN LoanStats ls ON e.id = ls.employee_id
            LEFT JOIN LiabilityStats liab ON e.id = liab.employee_id
            LEFT JOIN PaidStatus ps ON e.id = ps.employee_id
            WHERE (e.joining_date::date <= $2::date) 
              AND (e.resignation_date IS NULL OR e.resignation_date::date >= $1::date)
        `;

        const { rows } = await pool.query(query, [startDate, endDate, month, year]);

        const detailedPreview = await Promise.all(rows.map(async r => {
            const salary = Number(r.base_salary);
            const daysInMonth = new Date(year, month, 0).getDate();
            const perDay = salary / daysInMonth;

            // Pro-rating logic (Simple & Clean)
            const mStart = new Date(startDate);
            const mEnd = new Date(endDate);
            const jDate = r.joining_date ? new Date(r.joining_date) : mStart;
            const resDate = r.resignation_date ? new Date(r.resignation_date) : mEnd;

            // Normalize to month boundaries
            const effStart = jDate > mStart ? jDate : mStart;
            const effEnd = resDate < mEnd ? resDate : mEnd;

            // Calculate worked days
            const workedTime = Math.max(0, effEnd.getTime() - effStart.getTime());
            const workedDays = Math.round(workedTime / (1000 * 60 * 60 * 24)) + 1;
            
            // If they were active the whole month, workedDays should equal daysInMonth
            // We use this to calculate adjusted salary
            const adjustedBaseSalary = (workedDays >= daysInMonth) ? salary : (workedDays * perDay);

            const deductibleAbsent = Math.max(0, r.absent_days - 1);
            const deductibleHalf = Math.max(0, r.half_days - 1);

            let leaveEncashment = 0;
            if (Number(month) === 3) { // March logic
                const fiscalYearStart = Number(year) - 1;
                const dateFrom = `${fiscalYearStart}-04-01`;
                const dateTo = `${year}-03-31`;

                const attHistory = await pool.query(`
                    SELECT 
                        EXTRACT(MONTH FROM attendance_date) as month,
                        COUNT(*) FILTER (WHERE status = 'Absent')::int as absent_days,
                        COUNT(*) FILTER (WHERE status = 'Half-Day')::int as half_days
                    FROM employee_attendance
                    WHERE employee_id = $1 AND attendance_date::date BETWEEN $2::date AND $3::date
                    GROUP BY 1
                `, [r.id, dateFrom, dateTo]);

                let unusedFull = 0;
                let unusedHalf = 0;
                for (let m = 1; m <= 12; m++) {
                    const h = attHistory.rows.find(h => Number(h.month) === m);
                    const abs = h ? Number(h.absent_days) : 0;
                    const hlf = h ? Number(h.half_days) : 0;
                    unusedFull += Math.max(0, 1 - Math.min(1, abs));
                    unusedHalf += Math.max(0, 0.5 - (Math.min(1, hlf) * 0.5));
                }
                leaveEncashment = (unusedFull * perDay) + (unusedHalf * perDay);
            }

            const leaveDeduction = (perDay * deductibleAbsent) + ((perDay / 2) * deductibleHalf);
            const totalDeductions = leaveDeduction + Number(r.advance_deduction) + Number(r.loan_deduction) + Number(r.misc_liabilities);
            const totalAdditions = Number(r.bonus_addition) + leaveEncashment;
            const netSalary = Math.max(0, adjustedBaseSalary - totalDeductions + totalAdditions);

            return {
                ...r,
                adjusted_base_salary: adjustedBaseSalary.toFixed(2),
                leave_deduction: leaveDeduction.toFixed(2),
                bonus_addition: Number(r.bonus_addition).toFixed(2),
                leave_encashment: leaveEncashment.toFixed(2),
                total_deductions: totalDeductions.toFixed(2),
                total_additions: totalAdditions.toFixed(2),
                net_salary: netSalary.toFixed(2)
            };
        }));

        res.json(detailedPreview);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});


// @route   POST /api/employees/bulk-salary-payment
router.post('/bulk-salary-payment', async (req, res) => {
    const client = await pool.connect();
    try {
        const { payments, month, year, from_account_id, payment_mode, bank_statement_entry_id, user_id } = req.body;

        await client.query('BEGIN');

        let totalBatchNet = 0;

        for (const p of payments) {
            const { 
                employee_id, id, base_salary, adjusted_base_salary, absent_days, half_days, 
                leave_deduction, advance_deduction, loan_deduction, net_salary,
                payment_mode: p_mode, from_account_id: p_account, bank_statement_entry_id: p_bank_entry
            } = p;
            
            const finalEmpId = employee_id || id;
            if (!finalEmpId) continue; // Skip if no ID found

            totalBatchNet += Number(net_salary);

            // Use line-level details if provided, otherwise fallback to batch-level
            let finalMode = p_mode || payment_mode;
            let finalAccount = p_account || from_account_id;
            const finalBankEntry = p_bank_entry || bank_statement_entry_id;

            // Intelligently determine from_account_id if a bank statement entry was selected
            if (finalMode === 'Online' && finalBankEntry) {
                const bRes = await client.query('SELECT bank_account_id FROM bank_statement_entries WHERE id = $1', [finalBankEntry]);
                if (bRes.rows.length > 0) {
                    finalAccount = bRes.rows[0].bank_account_id;
                }
            }

            // Initialize Journal Lines early (needed for both deductions and final entry)
            // 5014: Salary Expense (Use Adjusted Salary for pro-rated joiners/resigners)
            const finalBaseAmount = Number(adjusted_base_salary || base_salary);
            const journalLines = [
                { code: 5014, debit: finalBaseAmount, credit: 0 } 
            ];

            // 1. Insert Salary Record
            const salRes = await client.query(`
                INSERT INTO employee_salaries (
                    employee_id, month, year, base_salary, adjusted_base_salary, 
                    absent_days, half_days, leave_deduction, advance_deduction, 
                    loan_deduction, misc_liabilities, bonus_addition, leave_encashment,
                    total_deductions, total_additions, net_salary,
                    payment_mode, from_account_id, bank_statement_entry_id, created_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
                RETURNING id
            `, [
                finalEmpId, month, year, base_salary, adjusted_base_salary || base_salary,
                absent_days, half_days, leave_deduction, advance_deduction, 
                loan_deduction, p.misc_liabilities || 0, p.bonus_addition || 0, p.leave_encashment || 0,
                p.total_deductions || 0, p.total_additions || 0, net_salary,
                finalMode, finalAccount, finalBankEntry || null, user_id
            ]);

            const salaryId = salRes.rows[0].id;

            // 2. Settle Advances (same logic)
            if (Number(advance_deduction) > 0) {
                await client.query(`
                    UPDATE employee_advances 
                    SET is_settled = TRUE, salary_payment_id = $1 
                    WHERE employee_id = $2 AND is_settled = FALSE
                `, [salaryId, finalEmpId]);
            }
            // 2.5 Settle Miscellaneous Liabilities
            if (Number(p.misc_liabilities) > 0) {
                // Fetch liabilities to determine if they are invoice-linked (1020) or general (4103)
                const liabRes = await client.query(`
                    SELECT amount, invoice_id FROM employee_liabilities 
                    WHERE employee_id = $1 AND status = 'PENDING'
                `, [finalEmpId]);

                for (const l of liabRes.rows) {
                    if (l.invoice_id) {
                        // 1. Accounting: Clear from 1020 (Emp Receivable)
                        journalLines.push({ code: 1020, debit: 0, credit: Number(l.amount) });

                        // 2. Operational Check: Has this invoice already been adjusted via /api/employees/liabilities?
                        // We check if a payment already exists with this liability reference
                        const checkPay = await client.query(`
                            SELECT id FROM customer_payments WHERE transaction_ref = $1
                        `, [`EMP-LIAB-${l.id}`]);

                        if (checkPay.rows.length === 0) {
                            // If NO payment exists, create it now (the "Right Way")
                            const invRes = await client.query('SELECT customer_id FROM sales_invoices WHERE id = $1', [l.invoice_id]);
                            if (invRes.rows.length > 0) {
                                const customerId = invRes.rows[0].customer_id;
                                
                                // A. Create Payment
                                const payRes = await client.query(`
                                    INSERT INTO customer_payments (
                                        customer_id, amount, payment_mode, transaction_ref, 
                                        status, verification_status, payment_date, remarks
                                    ) VALUES ($1, $2, 'EMPLOYEE_ADJUSTMENT', $3, 'Verified', 'Verified', NOW(), $4)
                                    RETURNING id
                                `, [customerId, l.amount, `EMP-LIAB-${l.id}`, `Settled via Salary Payment - ${p.month}/${p.year}`]);
                                const paymentId = payRes.rows[0].id;

                                // B. Create Allocation
                                await client.query(`
                                    INSERT INTO customer_payment_allocations (payment_id, invoice_id, amount, status)
                                    VALUES ($1, $2, $3, 'ACTIVE')
                                `, [paymentId, l.invoice_id, l.amount]);

                                // C. Update Invoice Balance & Status
                                await client.query(`
                                    UPDATE sales_invoices 
                                    SET 
                                        paid_amount = COALESCE(paid_amount, 0) + $1,
                                        status = CASE 
                                            WHEN (grand_total - (COALESCE(paid_amount, 0) + $1)) <= 1 THEN 'Paid'
                                            ELSE 'Partially Paid'
                                        END
                                    WHERE id = $2
                                `, [Number(l.amount), l.invoice_id]);
                            }
                        }
                    } else {
                        // Not linked (Damage/Shortage): Credit Income 4103
                        journalLines.push({ code: 4103, debit: 0, credit: Number(l.amount) });
                    }
                }

                await client.query(`
                    UPDATE employee_liabilities 
                    SET status = 'SETTLED', salary_payment_id = $1 
                    WHERE employee_id = $2 AND status = 'PENDING'
                `, [salaryId, finalEmpId]);
            }

            // 3. Record Loan Installment (Split Principal vs Interest)
            if (Number(loan_deduction) > 0) {
                const loanRes = await client.query(`
                    SELECT l.id, l.balance_principal, l.interest_rate_pa, l.emi_amount
                    FROM loans l
                    JOIN loan_entities le ON l.party_id = le.id
                    WHERE l.party_type = 'EMPLOYEE' 
                      AND le.reference_id = $1 
                      AND l.status = 'Active'
                      AND le.entity_type = 'Employee'
                `, [finalEmpId]);

                for (const loan of loanRes.rows) {
                    const emi = Number(loan.emi_amount);
                    const interestPortion = Math.round((Number(loan.balance_principal) * (Number(loan.interest_rate_pa) / 100) / 12) * 100) / 100;
                    const principalPortion = emi - interestPortion;

                    await client.query(`
                        INSERT INTO loan_transactions (
                            loan_id, transaction_date, amount, 
                            principal_portion, interest_portion, 
                            transaction_type, payment_mode, remarks
                        )
                        VALUES ($1, CURRENT_DATE, $2, $3, $4, 'INSTALLMENT', $5, $6)
                    `, [loan.id, emi, principalPortion, interestPortion, finalMode, `Salary Deduction - ${month}/${year}`]);

                    await client.query(`
                        UPDATE loans 
                        SET balance_principal = balance_principal - $1 
                        WHERE id = $2
                    `, [principalPortion, loan.id]);

                    // Add to journal lines
                    if (principalPortion > 0) journalLines.push({ code: 1105, debit: 0, credit: principalPortion });
                    if (interestPortion > 0) journalLines.push({ code: 4101, debit: 0, credit: interestPortion });
                }
            } else {
                // No loan deduction, but check if we need to remove placeholders or handle nothing?
                // The journalLines logic below will handle it if we don't push anything.
            }

            // 4. Create Journal Entry (use finalMode and finalAccount)
            // Skip journal entry if base salary is 0 (prevents empty transactions)
            if (Number(base_salary) > 0) {
                const creditAccountCode = finalMode === 'Online' ? 1002 : 1003;

                if (Number(leave_deduction) > 0) journalLines.push({ code: 5015, debit: 0, credit: Number(leave_deduction) });
                if (Number(advance_deduction) > 0) journalLines.push({ code: 1020, debit: 0, credit: Number(advance_deduction) });
                
                // Record Bonus Addition as Expense
                if (Number(p.bonus_addition) > 0) {
                    journalLines.push({ code: 5016, debit: Number(p.bonus_addition), credit: 0 }); // Dr Bonus Expense
                }

                // Record Leave Encashment as Expense
                if (Number(p.leave_encashment) > 0) {
                    journalLines.push({ code: 5017, debit: Number(p.leave_encashment), credit: 0 }); // Dr Encashment Expense
                }

                // Loan lines (1105 and 4101) were pushed dynamically in Step 3
                
                const payoutAmount = Number(net_salary);
                if (payoutAmount > 0) {
                    journalLines.push({ code: creditAccountCode, debit: 0, credit: payoutAmount });
                }

                // Check if this is a final settlement (if they have a resignation date)
                const empInfo = await client.query('SELECT resignation_date FROM employees WHERE id = $1', [finalEmpId]);
                const isFinal = empInfo.rows[0]?.resignation_date !== null;

                const journalRes = await client.query(`
                    SELECT create_journal_entry($1, $2, $3, $4, $5) as entry_id
                `, [
                    new Date(),
                    `${isFinal ? 'Final Settlement' : 'Monthly Salary'} - Emp ID: ${finalEmpId} (${month}/${year})`,
                    'SALARY_PAYMENT',
                    salaryId,
                    JSON.stringify(journalLines)
                ]);

                const journalEntryId = journalRes.rows[0].entry_id;
                await client.query(`UPDATE employee_salaries SET journal_entry_id = $1 WHERE id = $2`, [journalEntryId, salaryId]);

                // Settle manual bonuses
                await client.query(`
                    UPDATE employee_bonuses 
                    SET is_settled = TRUE, salary_payment_id = $1 
                    WHERE employee_id = $2 AND is_settled = FALSE
                `, [salaryId, finalEmpId]);

                // If final settlement, mark employee as officially 'Resigned'
                if (isFinal) {
                    await client.query(`UPDATE employees SET employment_status = 'Resigned' WHERE id = $1`, [finalEmpId]);
                }
            }

            // 5. Update Bank Statement (per-line Consumption)
            if (finalMode === 'Online' && finalBankEntry) {
                await client.query(`
                    UPDATE bank_statement_entries 
                    SET consumed_amount = consumed_amount + $1,
                        status = CASE 
                            WHEN (consumed_amount + $1) >= amount THEN 'Exhausted' 
                            ELSE 'Partially Consumed' 
                        END
                    WHERE id = $2
                `, [net_salary, finalBankEntry]);
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, count: payments.length });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// @route   GET /api/employees/salaries
router.get('/salaries', async (req, res) => {
    try {
        const { employee_id, month, year } = req.query;
        let query = `
            SELECT es.*, e.full_name, e.employee_code 
            FROM employee_salaries es
            JOIN employees e ON es.employee_id = e.id
            WHERE 1=1
        `;
        const params = [];

        if (employee_id) {
            params.push(employee_id);
            query += ` AND es.employee_id = $${params.length}`;
        }
        if (month) {
            params.push(month);
            query += ` AND es.month = $${params.length}`;
        }
        if (year) {
            params.push(year);
            query += ` AND es.year = $${params.length}`;
        }

        query += ` ORDER BY es.year DESC, es.month DESC, es.created_at DESC`;

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/employees/salary-batch-summary
router.get('/salary-batch-summary', async (req, res) => {
    try {
        const query = `
            SELECT 
                month, 
                year,
                COUNT(id)::int as total_employees,
                SUM(net_salary)::numeric(12,2) as total_net_payout,
                MAX(created_at) as processed_at
            FROM employee_salaries
            GROUP BY month, year
            ORDER BY year DESC, month DESC
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/employees/salary-payment-headers
router.get('/salary-payment-headers', async (req, res) => {
    try {
        const { month, year, employee_id } = req.query;
        let query = `
            SELECT 
                es.id, 
                es.employee_id, 
                e.full_name, 
                e.employee_code, 
                es.month, 
                es.year, 
                es.net_salary, 
                es.payment_mode, 
                es.payment_date,
                es.created_at as processed_at,
                ba.bank_name as source_account
            FROM employee_salaries es
            JOIN employees e ON es.employee_id = e.id
            LEFT JOIN bank_accounts ba ON es.from_account_id = ba.id
            WHERE 1=1
        `;
        const params = [];

        if (month) { params.push(month); query += ` AND es.month = $${params.length}`; }
        if (year) { params.push(year); query += ` AND es.year = $${params.length}`; }
        if (employee_id) { params.push(employee_id); query += ` AND es.employee_id = $${params.length}`; }

        query += ` ORDER BY es.created_at DESC`;

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/employees/salary-payment-details/:id
router.get('/salary-payment-details/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Main Header Info
        const salaryRes = await pool.query(`
            SELECT 
                es.*, 
                e.full_name, 
                e.employee_code, 
                e.joining_date,
                ba.bank_name as source_account,
                admin.full_name as processed_by
            FROM employee_salaries es
            JOIN employees e ON es.employee_id = e.id
            LEFT JOIN bank_accounts ba ON es.from_account_id = ba.id
            LEFT JOIN employees admin ON es.created_by = admin.id
            WHERE es.id = $1
        `, [id]);

        if (salaryRes.rows.length === 0) return res.status(404).json({ error: "Salary record not found" });
        const salary = salaryRes.rows[0];

        // 2. Addition Breakdown (Bonuses)
        const bonuses = await pool.query(`
            SELECT amount, bonus_type, remarks, created_at 
            FROM employee_bonuses WHERE salary_payment_id = $1
        `, [id]);

        // 3. Deduction Breakdown (Advances)
        const advances = await pool.query(`
            SELECT amount, remarks, advance_date as date 
            FROM employee_advances WHERE salary_payment_id = $1
        `, [id]);

        // 4. Deduction Breakdown (Liabilities)
        const liabilities = await pool.query(`
            SELECT el.amount, el.type, el.description, el.invoice_id, si.invoice_number 
            FROM employee_liabilities el
            LEFT JOIN sales_invoices si ON el.invoice_id = si.id
            WHERE el.salary_payment_id = $1
        `, [id]);

        // 5. Deduction Breakdown (Loans)
        const loans = await pool.query(`
            SELECT lt.amount, lt.principal_portion, lt.interest_portion, lt.transaction_date, l.id as loan_id
            FROM loan_transactions lt
            JOIN loans l ON lt.loan_id = l.id
            WHERE lt.remarks LIKE $1
        `, [`%Salary Deduction - ${salary.month}/${salary.year}%`]);

        res.json({
            header: salary,
            breakdown: {
                base_salary: {
                    original: salary.base_salary,
                    adjusted: salary.adjusted_base_salary
                },
                additions: {
                    bonuses: bonuses.rows,
                    leave_encashment: salary.leave_encashment,
                    total: salary.total_additions
                },
                deductions: {
                    leave: {
                        absent_days: salary.absent_days,
                        half_days: salary.half_days,
                        amount: salary.leave_deduction
                    },
                    advances: advances.rows,
                    liabilities: liabilities.rows,
                    loans: loans.rows,
                    total: salary.total_deductions
                },
                summary: {
                    net_salary: salary.net_salary
                }
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/employees/salaries/:id
router.get('/salaries/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT es.*, e.full_name, e.employee_code, ba.bank_name as source_account
            FROM employee_salaries es
            JOIN employees e ON es.employee_id = e.id
            LEFT JOIN bank_accounts ba ON es.from_account_id = ba.id
            WHERE es.id = $1
        `;
        const { rows } = await pool.query(query, [id]);
        if (rows.length === 0) return res.status(404).json({ error: "Salary record not found" });

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});


// @route   POST /api/employees/:id/resign
router.post('/:id/resign', async (req, res) => {
    try {
        const { id } = req.params;
        const { resignation_date } = req.body;
        
        await pool.query(
            "UPDATE employees SET employment_status = 'Resigned', resignation_date = $1 WHERE id = $2",
            [resignation_date || new Date(), id]
        );
        
        res.json({ success: true, message: 'Employee marked as resigned successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/employees/advances
// @desc    List all employee advances with optional filtering by employee_id or is_settled status
router.get('/advances', async (req, res) => {
    try {
        const { employee_id, is_settled } = req.query;
        let query = `
            SELECT ea.*, e.full_name as employee_name, e.employee_code
            FROM employee_advances ea
            JOIN employees e ON ea.employee_id = e.id
            WHERE 1=1
        `;
        const params = [];

        if (employee_id) {
            params.push(employee_id);
            query += ` AND ea.employee_id = $${params.length}`;
        }

        if (is_settled !== undefined) {
            params.push(is_settled === 'true');
            query += ` AND ea.is_settled = $${params.length}`;
        }

        query += ' ORDER BY ea.advance_date DESC, ea.created_at DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// @route   DELETE /api/employees/advances/:id
// @desc    Void/Delete an employee advance, reversing journal entries and bank reconciliation
router.delete('/advances/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Fetch advance details
        const advRes = await client.query('SELECT * FROM employee_advances WHERE id = $1', [id]);
        if (advRes.rows.length === 0) {
            throw new Error('Advance record not found');
        }
        const advance = advRes.rows[0];

        // 2. Prevent deleting settled advances
        if (advance.is_settled) {
            throw new Error('Settled advances cannot be deleted directly. You must delete the corresponding salary payment first.');
        }

        // 3. Revert Bank Statement Entry (unconsume it)
        if (advance.payment_mode === 'Online' && advance.bank_statement_entry_id) {
            await client.query(`
                UPDATE bank_statement_entries 
                SET consumed_amount = GREATEST(0, COALESCE(consumed_amount, 0) - $1),
                    status = CASE 
                        WHEN GREATEST(0, COALESCE(consumed_amount, 0) - $1) = 0 THEN 'Available'
                        ELSE 'Partially Consumed'
                    END
                WHERE id = $2
            `, [advance.amount, advance.bank_statement_entry_id]);
        }

        // 4. Nullify journal_entry_id on employee_advances to avoid foreign key constraint violation
        await client.query(`
            UPDATE employee_advances SET journal_entry_id = NULL WHERE id = $1
        `, [id]);

        // 5. Delete the associated Journal Entry
        if (advance.journal_entry_id) {
            await client.query(`
                DELETE FROM journal_entries WHERE id = $1
            `, [advance.journal_entry_id]);
        } else {
            // Fallback: delete by reference if ID is not linked directly
            await client.query(`
                DELETE FROM journal_entries 
                WHERE reference_type = 'SALARY_ADVANCE' AND reference_id = $1
            `, [id]);
        }

        // 6. Delete the employee advance record
        await client.query('DELETE FROM employee_advances WHERE id = $1', [id]);

        await client.query('COMMIT');
        res.json({ success: true, message: 'Employee advance deleted successfully and accounting reversed.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// @route   GET /api/employees/:id - Get Details (Generic fallback)
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM view_employee_details WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/employees/:id/register-device
router.post('/:id/register-device', async (req, res) => {
    try {
        const { id } = req.params;
        const { device_id } = req.body;
        
        if (!device_id) return res.status(400).json({ error: 'device_id is required' });

        // Check if device_id is already set
        const empRes = await pool.query('SELECT device_id FROM employees WHERE id = $1', [id]);
        if (empRes.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
        
        if (empRes.rows[0].device_id) {
            return res.status(400).json({ error: 'Device is already registered for this employee' });
        }

        await pool.query('UPDATE employees SET device_id = $1 WHERE id = $2', [device_id, id]);
        res.json({ success: true, message: 'Device registered successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/employees/:id/clear-device
router.post('/:id/clear-device', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('UPDATE employees SET device_id = NULL WHERE id = $1', [id]);
        res.json({ success: true, message: 'Device binding cleared successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
