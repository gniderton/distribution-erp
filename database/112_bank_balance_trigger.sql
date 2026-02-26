-- Phase 112: Bank Balance Sync Trigger

-- 1. Update journal_lines table
ALTER TABLE journal_lines ADD COLUMN IF NOT EXISTS bank_account_id INTEGER REFERENCES bank_accounts(id);

-- 2. Update create_journal_entry function to handle bank_account_id
CREATE OR REPLACE FUNCTION create_journal_entry(
    p_date DATE,
    p_desc TEXT,
    p_ref_type TEXT,
    p_ref_id BIGINT,
    p_lines_json JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_entry_id BIGINT;
    v_line JSONB;
    v_total_debit NUMERIC := 0;
    v_total_credit NUMERIC := 0;
BEGIN
    -- Insert Header
    INSERT INTO journal_entries (transaction_date, description, reference_type, reference_id)
    VALUES (p_date, p_desc, p_ref_type, p_ref_id)
    RETURNING id INTO v_entry_id;

    -- Insert Lines
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines_json)
    LOOP
        v_total_debit := v_total_debit + COALESCE((v_line->>'debit')::numeric, 0);
        v_total_credit := v_total_credit + COALESCE((v_line->>'credit')::numeric, 0);

        INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, bank_account_id)
        VALUES (
            v_entry_id, 
            (SELECT id FROM chart_of_accounts WHERE code = (v_line->>'code')::int), 
            COALESCE((v_line->>'debit')::numeric, 0),
            COALESCE((v_line->>'credit')::numeric, 0),
            (v_line->>'bank_account_id')::integer
        );
    END LOOP;

    -- Validation
    IF v_total_debit != v_total_credit THEN
        RAISE EXCEPTION 'Journal Entry Unbalanced: Debit % != Credit %', v_total_debit, v_total_credit;
    END IF;

    RETURN v_entry_id;
END;
$$;

-- 3. Create Trigger Function for Bank Balance Sync
CREATE OR REPLACE FUNCTION fn_sync_bank_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT
    IF (TG_OP = 'INSERT') THEN
        IF NEW.bank_account_id IS NOT NULL THEN
            UPDATE bank_accounts 
            SET current_balance = current_balance + (NEW.debit - NEW.credit)
            WHERE id = NEW.bank_account_id;
        END IF;
    
    -- Handle UPDATE
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Revert OLD
        IF OLD.bank_account_id IS NOT NULL THEN
            UPDATE bank_accounts 
            SET current_balance = current_balance - (OLD.debit - OLD.credit)
            WHERE id = OLD.bank_account_id;
        END IF;
        -- Apply NEW
        IF NEW.bank_account_id IS NOT NULL THEN
            UPDATE bank_accounts 
            SET current_balance = current_balance + (NEW.debit - NEW.credit)
            WHERE id = NEW.bank_account_id;
        END IF;

    -- Handle DELETE
    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.bank_account_id IS NOT NULL THEN
            UPDATE bank_accounts 
            SET current_balance = current_balance - (OLD.debit - OLD.credit)
            WHERE id = OLD.bank_account_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach Trigger
DROP TRIGGER IF EXISTS trg_sync_bank_balance ON journal_lines;
CREATE TRIGGER trg_sync_bank_balance
AFTER INSERT OR UPDATE OR DELETE ON journal_lines
FOR EACH ROW EXECUTE FUNCTION fn_sync_bank_balance();
