-- Migration to allow multiple sync headers per DSE per day
-- This prevents a later sync from overwriting a previously settled report.

ALTER TABLE daily_sales_reports DROP CONSTRAINT IF EXISTS daily_sales_reports_dse_id_report_date_key;

-- Add a trace to know which sync created which report
ALTER TABLE daily_sales_reports ADD COLUMN IF NOT EXISTS sync_id BIGINT;
