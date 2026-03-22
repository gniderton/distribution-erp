-- Create Employee Attendance Table
CREATE TABLE IF NOT EXISTS employee_attendance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Absent', 'Half-Day')),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint to prevent duplicate entries for the same employee/date
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_attendance_date ON employee_attendance(employee_id, attendance_date);

-- Comment for clarity
COMMENT ON TABLE employee_attendance IS 'Stores daily attendance exceptions (Absent/Half-Day) for employees.';
