-- 105_add_report_id_to_returns.sql
-- 1. Add report_id to trip_returns
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trip_returns' AND column_name='report_id') THEN
        ALTER TABLE trip_returns ADD COLUMN report_id BIGINT REFERENCES daily_sales_reports(id);
    END IF;
END $$;
