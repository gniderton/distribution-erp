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

// @route   GET /api/employees/:id - Get Details
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM view_employee_details WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
        res.json(result.rows[0]);
    } catch (err) {
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

module.exports = router;
