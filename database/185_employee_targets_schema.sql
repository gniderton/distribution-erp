-- 185. Employee Target & Performance System (Refactored for Plans)
-- Logic: Template-based architecture for flexible incentive rules.

-- Table: incentive_plans
-- Logic: Templates for performance rules (e.g. 'Standard DSE', 'Junior Apprentice').
CREATE TABLE IF NOT EXISTS incentive_plans (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    name TEXT NOT NULL UNIQUE, -- e.g. 'Standard DSE Plan v1'
    description TEXT,
    
    -- Rules Configuration (JSONB)
    -- Example Structure: 
    -- {
    --   "daily_collection": { "threshold_pct": 30.0, "points": 20 },
    --   "monthly_bonus": { "days_required_pct": 90.0, "points": 1000 }
    -- }
    config JSONB NOT NULL, 
    
    is_active BOOLEAN DEFAULT TRUE
);

-- Table: employee_targets
-- Logic: Monthly assignment of a DSE to a specific plan + their sales target.
CREATE TABLE IF NOT EXISTS employee_targets (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    plan_id BIGINT NOT NULL REFERENCES incentive_plans(id),
    
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    
    -- Performance Goals
    sales_target_taxable NUMERIC(15, 2) DEFAULT 0,
    
    UNIQUE(employee_id, month, year)
);

-- Table: employee_daily_achievement
-- Logic: Historical record of daily performance.
CREATE TABLE IF NOT EXISTS employee_daily_achievement (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    plan_id BIGINT NOT NULL REFERENCES incentive_plans(id), -- Snapshotted plan used for this calculation
    date DATE NOT NULL,
    report_id BIGINT,
    
    route_total_receivable NUMERIC(15, 2) DEFAULT 0,
    actual_collection NUMERIC(15, 2) DEFAULT 0,
    
    achievement_pct NUMERIC(5, 2) GENERATED ALWAYS AS (
        CASE WHEN route_total_receivable > 0 
             THEN (actual_collection / route_total_receivable) * 100 
             ELSE 0 
        END
    ) STORED,
    
    points_earned INTEGER DEFAULT 0,
    is_successful BOOLEAN DEFAULT FALSE, -- Did they meet the daily threshold?
    
    UNIQUE(employee_id, date)
);

-- Table: performance_points_history
CREATE TABLE IF NOT EXISTS performance_points_history (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    date DATE NOT NULL,
    points INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'DAILY_TARGET', 'MONTHLY_BONUS', 'ADJUSTMENT'
    reason TEXT,
    
    reference_id BIGINT -- Achievement ID or Target ID
);

-- [SEED] Initial Standard Plan
INSERT INTO incentive_plans (name, description, config)
VALUES (
    'Standard DSE Plan', 
    'Rules: 30% Daily Collection = 20 pts. 90% Days hit = 1000 pts. Target hit = 2000 pts.',
    '{
        "daily_collection": { "threshold_pct": 30.0, "points": 20 },
        "monthly_bonus": { "days_required": 21, "points": 1000 },
        "sales_target_bonus": { "points": 2000 }
    }'::jsonb
) ON CONFLICT (name) DO UPDATE SET 
    config = EXCLUDED.config;

-- Indexing
CREATE INDEX IF NOT EXISTS idx_targets_emp ON employee_targets(employee_id);
CREATE INDEX IF NOT EXISTS idx_achievement_emp_date ON employee_daily_achievement(employee_id, date);

-- RLS
ALTER TABLE incentive_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_daily_achievement ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_points_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable access for dev" ON incentive_plans;
DROP POLICY IF EXISTS "Enable access for dev" ON employee_targets;
DROP POLICY IF EXISTS "Enable access for dev" ON employee_daily_achievement;
DROP POLICY IF EXISTS "Enable access for dev" ON performance_points_history;

CREATE POLICY "Enable access for dev" ON incentive_plans FOR ALL USING (true);
CREATE POLICY "Enable access for dev" ON employee_targets FOR ALL USING (true);
CREATE POLICY "Enable access for dev" ON employee_daily_achievement FOR ALL USING (true);
CREATE POLICY "Enable access for dev" ON performance_points_history FOR ALL USING (true);
