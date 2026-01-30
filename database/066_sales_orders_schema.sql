-- 1. Sales Orders Table
CREATE TABLE IF NOT EXISTS sales_orders (
    id BIGSERIAL PRIMARY KEY,
    offline_id VARCHAR(50) UNIQUE, -- To prevent duplicates from offline sync
    dse_id BIGINT REFERENCES employees(id),
    customer_id BIGINT REFERENCES customers(id),
    order_date DATE DEFAULT CURRENT_DATE,
    total_amount DECIMAL(12, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Pending', -- 'Pending', 'Invoiced', 'Cancelled'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Sales Order Lines Table
CREATE TABLE IF NOT EXISTS sales_order_lines (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(id),
    quantity INT NOT NULL,
    rate DECIMAL(10, 2) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    free_quantity INT DEFAULT 0
);
