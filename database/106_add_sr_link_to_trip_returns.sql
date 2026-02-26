ALTER TABLE trip_returns ADD COLUMN IF NOT EXISTS sales_return_id BIGINT REFERENCES sales_returns(id);
