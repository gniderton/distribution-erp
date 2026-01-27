-- Table: employees
-- Logic: Stores comprehensive HR data for all staff (DSEs, Drivers, etc.)
create table if not exists employees (
    id bigint primary key generated always as identity,
    created_at timestamptz default now() not null,
    
    -- Identification
    employee_code text not null unique, -- e.g., GD-ECL-1
    full_name text not null,
    gender text check (gender in ('Male', 'Female', 'Other')),
    
    -- Contact
    contact_primary text not null,
    contact_secondary text,
    email text,
    address_full text,
    
    -- HR Details
    designation text not null, -- e.g., 'DSE', 'Driver', 'Founder'
    joining_date date,
    resignation_date date,
    employment_status text default 'Active' check (employment_status in ('Active', 'Resigned', 'Terminated', 'On Leave')),
    
    -- Shift
    shift_start_time time,
    shift_end_time time,
    
    -- Legal / Banking
    aadhar_number text,
    driving_license_number text,
    bank_name text,
    account_number text,
    ifsc_code text,
    
    -- Emergency
    emergency_contact_name text,
    emergency_contact_number text,
    emergency_relation text,
    
    -- Documents (URLs)
    doc_aadhar_url text,
    doc_license_url text,
    doc_certificate_url text,
    
    -- Financial
    current_salary numeric(12,2) default 0
);

-- Indexing
create index if not exists idx_employees_code on employees(employee_code);
create index if not exists idx_employees_status on employees(employment_status);

-- Table: employee_salary_history
-- Logic: Tracks history of salary increments/revisions
create table if not exists employee_salary_history (
    id bigint primary key generated always as identity,
    created_at timestamptz default now() not null,
    
    employee_id bigint not null references employees(id),
    effective_date date not null default current_date,
    
    previous_salary numeric(12,2) not null,
    new_salary numeric(12,2) not null,
    increment_amount numeric(12,2) generated always as (new_salary - previous_salary) stored,
    
    reason text, -- e.g., 'Annual Appraisal', 'Promotion', 'Correction'
    created_by text -- User who authorized this
);

create index if not exists idx_emp_salary_history_emp on employee_salary_history(employee_id);

-- RLS
alter table employees enable row level security;
alter table employee_salary_history enable row level security;

drop policy if exists "Enable access for dev" on employees;
create policy "Enable access for dev" on employees for all using (true);

drop policy if exists "Enable access for dev" on employee_salary_history;
create policy "Enable access for dev" on employee_salary_history for all using (true);
