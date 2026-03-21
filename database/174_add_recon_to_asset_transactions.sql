-- 174_add_recon_to_asset_transactions.sql
ALTER TABLE asset_transactions ADD COLUMN IF NOT EXISTS bank_statement_entry_id INTEGER REFERENCES bank_statement_entries(id);
