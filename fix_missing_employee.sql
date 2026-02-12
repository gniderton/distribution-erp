INSERT INTO employees (
    id,
    created_at,
    employee_code,
    full_name,
    contact_primary,
    designation
) OVERRIDING SYSTEM VALUE VALUES (
    2118977,
    NOW(),
    'RETOOL-ADMIN',
    'Retool Admin',
    '8888888888',
    'System Admin'
) 
ON CONFLICT (id) DO NOTHING;
