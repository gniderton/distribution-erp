CREATE TABLE IF NOT EXISTS official_letters (
    id SERIAL PRIMARY KEY,
    letter_code VARCHAR(50) UNIQUE NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    recipient_name VARCHAR(150) NOT NULL,
    recipient_address TEXT,
    subject TEXT NOT NULL,
    body TEXT NOT NULL, -- Rich-text content
    signatory VARCHAR(100) NOT NULL,
    signatory_designation VARCHAR(100),
    email_to VARCHAR(255),
    email_cc VARCHAR(255),
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sequence helper to generate unique sequential letter codes (e.g. GN-LET-2026-0001)
CREATE SEQUENCE IF NOT EXISTS official_letter_seq START 1;
