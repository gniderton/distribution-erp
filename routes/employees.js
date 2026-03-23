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

// @route   GET /api/employees/profile - Filter by Email (for Retool)
router.get('/profile', async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const result = await pool.query(
            'SELECT * FROM view_employee_details WHERE email = $1 LIMIT 1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/employees - List Employees
router.get('/', async (req, res) => {
    try {
        const { role, limit = 50, offset = 0 } = req.query;

        let query = 'SELECT * FROM view_employee_details WHERE employment_status = \'Active\'';
        const params = [];
        let pIdx = 1;

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
                bank_name, account_no, ifsc_code
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
            const { employee_id, amount, payment_mode, from_account_id, bank_statement_entry_id } = adv;

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
                    COUNT(*) FILTER (WHERE status = 'Absent') as absent_days,
                    COUNT(*) FILTER (WHERE status = 'Half-Day') as half_days
                FROM employee_attendance
                WHERE attendance_date BETWEEN $1 AND $2
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
            LoanStats AS (
                SELECT 
                    party_id as employee_id,
                    SUM(emi_amount) as total_emi
                FROM loans
                WHERE party_type = 'EMPLOYEE' AND status = 'Active'
                GROUP BY party_id
            )
            SELECT 
                e.id, e.full_name, e.employee_code, e.salary as base_salary,
                COALESCE(att.absent_days, 0) as absent_days,
                COALESCE(att.half_days, 0) as half_days,
                COALESCE(adv.total_advances, 0) as advance_deduction,
                COALESCE(ls.total_emi, 0) as loan_deduction
            FROM employees e
            LEFT JOIN AttendanceStats att ON e.id = att.employee_id
            LEFT JOIN AdvanceStats adv ON e.id = adv.employee_id
            LEFT JOIN LoanStats ls ON e.id = ls.employee_id
            WHERE e.status = 'Active'
        `;

        const { rows } = await pool.query(query, [startDate, endDate]);

        const detailedPreview = rows.map(r => {
            const salary = Number(r.base_salary);
            const perDay = salary / 30;
            const perHalfDay = salary / 60;

            const deductibleAbsent = Math.max(0, r.absent_days - 1);
            const deductibleHalf = Math.max(0, r.half_days - 1);

            const leaveDeduction = (perDay * deductibleAbsent) + (perHalfDay * deductibleHalf);
            const totalDeductions = leaveDeduction + Number(r.advance_deduction) + Number(r.loan_deduction);
            const netSalary = Math.max(0, salary - totalDeductions);

            return {
                ...r,
                leave_deduction: leaveDeduction.toFixed(2),
                net_salary: netSalary.toFixed(2)
            };
        });

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
            const { employee_id, base_salary, absent_days, half_days, leave_deduction, advance_deduction, loan_deduction, net_salary } = p;
            totalBatchNet += Number(net_salary);

            // 1. Insert Salary Record
            const salRes = await client.query(`
                INSERT INTO employee_salaries (
                    employee_id, month, year, base_salary, absent_days, half_days,
                    leave_deduction, advance_deduction, loan_deduction, net_salary,
                    payment_mode, from_account_id, bank_statement_entry_id, created_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING id
            `, [
                employee_id, month, year, base_salary, absent_days, half_days,
                leave_deduction, advance_deduction, loan_deduction, net_salary,
                payment_mode, from_account_id, bank_statement_entry_id || null, user_id
            ]);

            const salaryId = salRes.rows[0].id;

            // 2. Settle Advances
            if (Number(advance_deduction) > 0) {
                await client.query(`
                    UPDATE employee_advances 
                    SET is_settled = TRUE, salary_payment_id = $1 
                    WHERE employee_id = $2 AND is_settled = FALSE
                `, [salaryId, employee_id]);
            }

            // 3. Record Loan Installment
            if (Number(loan_deduction) > 0) {
                const loanRes = await client.query(`
                    SELECT id FROM loans WHERE party_type = 'EMPLOYEE' AND party_id = $1 AND status = 'Active'
                `, [employee_id]);

                for (const loan of loanRes.rows) {
                    const emi = p.loan_deduction;
                    await client.query(`
                        INSERT INTO loan_transactions (loan_id, transaction_date, amount, principal_portion, transaction_type, payment_mode, remarks)
                        VALUES ($1, CURRENT_DATE, $2, $2, 'INSTALLMENT', $3, $4)
                    `, [loan.id, emi, payment_mode, `Salary Deduction - ${month}/${year}`]);

                    await client.query(`
                        UPDATE loans SET balance_principal = balance_principal - $1 WHERE id = $2
                    `, [emi, loan.id]);
                }
            }

            // 4. Create Journal Entry (Professional "Gross-Debit" Pattern)
            // 5010: Salary Expense (Dr) - GROSS
            // 5011: Salary Deduction (Cr) - ADJ
            // 1020: Salary Advance (Cr)
            // 1105: Loans Receivable (Cr)
            // 1002/1003: Bank/Cash (Cr)
            const creditAccountCode = payment_mode === 'Online' ? 1002 : 1003;
            const journalLines = [
                { code: 5010, debit: base_salary, credit: 0 } // Gross contractual
            ];

            if (Number(leave_deduction) > 0) journalLines.push({ code: 5011, debit: 0, credit: leave_deduction });
            if (Number(advance_deduction) > 0) journalLines.push({ code: 1020, debit: 0, credit: advance_deduction });
            if (Number(loan_deduction) > 0) journalLines.push({ code: 1105, debit: 0, credit: loan_deduction });
            
            const payoutAmount = Number(net_salary);
            if (payoutAmount > 0) {
                journalLines.push({ code: creditAccountCode, debit: 0, credit: payoutAmount });
            }

            const journalRes = await client.query(`
                SELECT create_journal_entry($1, $2, $3, $4, $5) as entry_id
            `, [
                new Date(),
                `Monthly Salary - Emp ID: ${employee_id} (${month}/${year})`,
                'SALARY_PAYMENT',
                salaryId,
                JSON.stringify(journalLines)
            ]);

            const journalEntryId = journalRes.rows[0].entry_id;
            await client.query(`UPDATE employee_salaries SET journal_entry_id = $1 WHERE id = $2`, [journalEntryId, salaryId]);
        }

        // 5. Update Bank Statement (Bulk Consumption)
        if (payment_mode === 'Online' && bank_statement_entry_id) {
            await client.query(`
                UPDATE bank_statement_entries 
                SET consumed_amount = consumed_amount + $1,
                    status = CASE 
                        WHEN (consumed_amount + $1) >= amount THEN 'Exhausted' 
                        ELSE 'Partially Consumed' 
                    END
                WHERE id = $2
            `, [totalBatchNet, bank_statement_entry_id]);
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

module.exports = router;
