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
                    SUM(l.emi_amount) as total_emi,
                    SUM(ROUND(l.balance_principal * (l.interest_rate_pa / 100.0) / 12.0, 2)) as total_interest,
                    SUM(l.emi_amount - ROUND(l.balance_principal * (l.interest_rate_pa / 100.0) / 12.0, 2)) as total_principal
                FROM loans l
                JOIN loan_entities le ON l.party_id = le.id
                WHERE l.party_type = 'EMPLOYEE' 
                  AND l.status = 'Active'
                  AND le.entity_type = 'Employee'
                GROUP BY le.reference_id
            ),
            CurrentSalary AS (
                SELECT DISTINCT ON (employee_id) employee_id, new_salary 
                FROM employee_salary_history 
                ORDER BY employee_id, effective_date DESC, created_at DESC
            )
            SELECT 
                e.id, e.full_name, e.employee_code, 
                COALESCE(cs.new_salary, 0) as base_salary,
                COALESCE(att.absent_days, 0) as absent_days,
                COALESCE(att.half_days, 0) as half_days,
                COALESCE(adv.total_advances, 0) as advance_deduction,
                COALESCE(bs.total_bonuses, 0) as bonus_addition,
                (COALESCE(ls.total_emi, 0)) as loan_deduction,
            (COALESCE(ls.total_principal, 0)) as loan_principal,
            (COALESCE(ls.total_interest, 0)) as loan_interest
            FROM employees e
            LEFT JOIN CurrentSalary cs ON e.id = cs.employee_id
            LEFT JOIN AttendanceStats att ON e.id = att.employee_id
            LEFT JOIN AdvanceStats adv ON e.id = adv.employee_id
            LEFT JOIN BonusStats bs ON e.id = bs.employee_id
            LEFT JOIN LoanStats ls ON e.id = ls.employee_id
            WHERE e.employment_status = 'Active'
        `;

        const { rows } = await pool.query(query, [startDate, endDate]);

        const detailedPreview = await Promise.all(rows.map(async r => {
            const salary = Number(r.base_salary);
            const perDay = salary / 30;
            const perHalfDay = salary / 60;

            const deductibleAbsent = Math.max(0, r.absent_days - 1);
            const deductibleHalf = Math.max(0, r.half_days - 1);

            let leaveEncashment = 0;
            const isMarch = Number(month) === 3;

            if (isMarch) {
                // Calculate Leave Encashment for the whole fiscal year (April to March)
                // We'll search for all months from April (month=4, year=prev) to March (month=3, year=current)
                const startFiscal = new Date(year, 3, 1); // April 1st of SAME year? No, if it's March 2026, we check from April 2025.
                const fiscalYearStart = Number(month) >= 4 ? Number(year) : Number(year) - 1;
                const dateFrom = `${fiscalYearStart}-04-01`;
                const dateTo = `${year}-03-31`;

                const attHistory = await pool.query(`
                    SELECT 
                        EXTRACT(MONTH FROM attendance_date) as month,
                        COUNT(*) FILTER (WHERE status = 'Absent') as absent_days,
                        COUNT(*) FILTER (WHERE status = 'Half-Day') as half_days
                    FROM employee_attendance
                    WHERE employee_id = $1 AND attendance_date BETWEEN $2 AND $3
                    GROUP BY 1
                `, [r.id, dateFrom, dateTo]);

                // Total eligible per month: 1 Full, 0.5 Half
                // We'll sum up (1 - min(1, absent)) and (0.5 - min(1, half)*0.5) for every month they were active
                // (Assuming they were active for 12 months for now, or we can check salary history months)
                let unusedFull = 0;
                let unusedHalf = 0;

                // Simple loop for 12 months
                for (let m = 1; m <= 12; m++) {
                    // Check if they had salary in that month (to see if they were active)
                    // (Simplified: just check if attendance exists or if they were hired by then)
                    const mStats = attHistory.rows.find(h => Number(h.month) === (m > 9 ? m - 9 : m + 3)); // Map fiscal? No, month is 1-12.
                    // Let's just use 1-12 directly.
                    const h = attHistory.rows.find(h => Number(h.month) === m);
                    const abs = h ? Number(h.absent_days) : 0;
                    const hlf = h ? Number(h.half_days) : 0;

                    unusedFull += Math.max(0, 1 - Math.min(1, abs));
                    unusedHalf += Math.max(0, 0.5 - (Math.min(1, hlf) * 0.5));
                }
                leaveEncashment = (unusedFull * perDay) + (unusedHalf * perDay); // 1 unused half day is 0.5 full day, so 0.5 * perDay
            }

            const leaveDeduction = (perDay * deductibleAbsent) + (perHalfDay * deductibleHalf);
            const totalDeductions = leaveDeduction + Number(r.advance_deduction) + Number(r.loan_deduction);
            const totalAdditions = Number(r.bonus_addition) + leaveEncashment;
            const netSalary = Math.max(0, salary - totalDeductions + totalAdditions);

            return {
                ...r,
                leave_deduction: leaveDeduction.toFixed(2),
                bonus_addition: Number(r.bonus_addition).toFixed(2),
                leave_encashment: leaveEncashment.toFixed(2),
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
                employee_id, id, base_salary, absent_days, half_days, 
                leave_deduction, advance_deduction, loan_deduction, net_salary,
                payment_mode: p_mode, from_account_id: p_account, bank_statement_entry_id: p_bank_entry
            } = p;
            
            const finalEmpId = employee_id || id;
            if (!finalEmpId) continue; // Skip if no ID found

            totalBatchNet += Number(net_salary);

            // Use line-level details if provided, otherwise fallback to batch-level
            const finalMode = p_mode || payment_mode;
            const finalAccount = p_account || from_account_id;
            const finalBankEntry = p_bank_entry || bank_statement_entry_id;

            // Initialize Journal Lines early (needed for both deductions and final entry)
            // 5014: Salary Expense
            const journalLines = [
                { code: 5014, debit: Number(base_salary), credit: 0 } 
            ];

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
                finalEmpId, month, year, base_salary, absent_days, half_days,
                leave_deduction, advance_deduction, loan_deduction, net_salary,
                finalMode, finalAccount, finalBankEntry || null, user_id
            ]);

            const salaryId = salRes.rows[0].id;

            // 2. Settle Advances (same logic)
            if (Number(advance_deduction) > 0) {
                await client.query(`
                    UPDATE employee_advances 
                    SET is_settled = TRUE, salary_payment_id = $1 
                    WHERE employee_id = $2 AND is_settled = FALSE
                `, [salaryId, employee_id]);
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
                
                // Manual Bonus & Encashment logic
                const bonusRes = await client.query(`
                    SELECT amount, id FROM employee_bonuses 
                    WHERE employee_id = $1 AND is_settled = FALSE
                `, [employee_id]);
                
                let totalBonusAmt = 0;
                for (const b of bonusRes.rows) {
                    totalBonusAmt += Number(b.amount);
                    journalLines.push({ code: 5016, debit: Number(b.amount), credit: 0 }); // Dr Bonus Expense
                }

                // Leave Encashment (provided from frontend as part of row)
                if (Number(req.body.payments.find(p => (p.employee_id === employee_id || p.id === employee_id))?.leave_encashment) > 0) {
                   const encAmt = Number(req.body.payments.find(p => (p.employee_id === employee_id || p.id === employee_id)).leave_encashment);
                   journalLines.push({ code: 5017, debit: encAmt, credit: 0 }); // Dr Encashment Expense
                }

                // Loan lines (1105 and 4101) were pushed dynamically in Step 3
                
                const payoutAmount = Number(net_salary);
                if (payoutAmount > 0) {
                    journalLines.push({ code: creditAccountCode, debit: 0, credit: payoutAmount });
                }

                const journalRes = await client.query(`
                    SELECT create_journal_entry($1, $2, $3, $4, $5) as entry_id
                `, [
                    new Date(),
                    `Monthly Salary - Emp ID: ${finalEmpId} (${month}/${year})`,
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
                `, [salaryId, employee_id]);
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

module.exports = router;
