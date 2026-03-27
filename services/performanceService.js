const { pool } = require('../config/db');

/**
 * Calculates and records the daily performance points for a DSE based on their assigned plan.
 */
async function calculateDailyPoints(dseId, date, reportId = null, client = null) {
    const db = client || pool;
    try {
        console.log(`[PerformanceService] Calculating points for DSE ${dseId} on ${date}`);

        const month = parseInt(date.split('-')[1]);
        const year = parseInt(date.split('-')[0]);

        // 1. Get Assigned Plan and Rules
        const targetRes = await db.query(`
            SELECT t.plan_id, p.config 
            FROM employee_targets t
            JOIN incentive_plans p ON t.plan_id = p.id
            WHERE t.employee_id = $1 AND t.month = $2 AND t.year = $3
        `, [dseId, month, year]);

        if (targetRes.rows.length === 0) {
            console.log(`[PerformanceService] No active plan found for ${dseId} in ${month}/${year}`);
            return { success: false, error: "No plan assigned" };
        }

        const { plan_id, config } = targetRes.rows[0];
        const dailyRule = config.daily_collection || { threshold_pct: 30.0, points: 20 };

        // 2. Determine Day Name (e.g. 'Monday')
        const dayRes = await db.query("SELECT TRIM(TO_CHAR($1::DATE, 'Day')) as day_name", [date]);
        const dayName = dayRes.rows[0].day_name;

        // 3. Calculate Route Total Receivables
        const routeRes = await db.query(`
            SELECT COALESCE(SUM(si.grand_total - si.paid_amount), 0) as total_receivable
            FROM sales_invoices si
            JOIN customers c ON si.customer_id = c.id
            JOIN routes r ON c.route_id = r.id
            WHERE c.dse_id = $1 
              AND r.service_day = $2
              AND si.status != 'Paid'
              AND si.status != 'Cancelled'
        `, [dseId, dayName]);

        const receivableAmount = parseFloat(routeRes.rows[0].total_receivable);

        // 4. Calculate Actual Collected
        const collectionRes = await db.query(`
            SELECT COALESCE(SUM(amount), 0) as total_collected
            FROM customer_payments
            WHERE collected_by = $1 
              AND payment_date = $2::DATE
              AND status = 'Verified'
        `, [dseId, date]);

        const collectedAmount = parseFloat(collectionRes.rows[0].total_collected);

        // 5. Apply Rules from Plan
        const achievementPct = receivableAmount > 0 ? (collectedAmount / receivableAmount) * 100 : 0;
        const isSuccessful = achievementPct >= dailyRule.threshold_pct;
        const pointsEarned = isSuccessful ? dailyRule.points : 0;

        // 6. Update Achievement Table (Snapshotted plan_id)
        await db.query(`
            INSERT INTO employee_daily_achievement (
                employee_id, plan_id, date, report_id, 
                route_total_receivable, actual_collection, points_earned, is_successful
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (employee_id, date) DO UPDATE SET
                plan_id = EXCLUDED.plan_id,
                report_id = EXCLUDED.report_id,
                route_total_receivable = EXCLUDED.route_total_receivable,
                actual_collection = EXCLUDED.actual_collection,
                points_earned = EXCLUDED.points_earned,
                is_successful = EXCLUDED.is_successful
        `, [dseId, plan_id, date, reportId, receivableAmount, collectedAmount, pointsEarned, isSuccessful]);

        // 7. Record Points History
        if (pointsEarned > 0) {
            await db.query(`
                INSERT INTO performance_points_history (employee_id, date, points, type, reason, reference_id)
                VALUES ($1, $2, $3, 'DAILY_TARGET', $4, $5)
                ON CONFLICT DO NOTHING
            `, [dseId, date, pointsEarned, `Rule hit: ${dailyRule.threshold_pct}% Collection (${achievementPct.toFixed(1)}%)`, reportId]);
        }

        // 8. Check for Monthly Bonus
        await checkMonthlyBonus(dseId, month, year, config, db);

        return { success: true, pointsEarned, achievementPct };

    } catch (err) {
        console.error('[PerformanceService] Error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Checks for Monthly Bonus based on plan configuration.
 */
async function checkMonthlyBonus(dseId, month, year, config, db) {
    const bonusRule = config.monthly_bonus;
    if (!bonusRule) return;

    // 1. Determine requirements
    // If days_required_pct provided, calculate against a standard 24 days or target table?
    // User mentioned "24 working days".
    const daysRequired = bonusRule.days_required || 21; 

    // 2. Count Successful days
    const countRes = await db.query(`
        SELECT COUNT(*) as success_count
        FROM employee_daily_achievement
        WHERE employee_id = $1 
          AND EXTRACT(MONTH FROM date) = $2 
          AND EXTRACT(YEAR FROM date) = $3
          AND is_successful = TRUE
    `, [dseId, month, year]);

    const successCount = parseInt(countRes.rows[0].success_count);

    if (successCount >= daysRequired) {
        const checkRes = await db.query(`
            SELECT 1 FROM performance_points_history 
            WHERE employee_id = $1 AND type = 'MONTHLY_BONUS' AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3
        `, [dseId, month, year]);

        if (checkRes.rows.length === 0) {
            await db.query(`
                INSERT INTO performance_points_history (employee_id, date, points, type, reason)
                VALUES ($1, $2, $3, 'MONTHLY_BONUS', $4)
            `, [dseId, `${year}-${month}-01`, bonusRule.points || 1000, `Completed ${successCount} successful days`]);
        }
    }

    // 3. Check for Sales Target Bonus
    const salesRule = config.sales_target_bonus;
    if (salesRule) {
        // A. Get Actual Monthly Taxable Sales
        const salesRes = await db.query(`
            SELECT COALESCE(SUM(total_taxable), 0) as actual_sales,
                   (SELECT sales_target_taxable FROM employee_targets WHERE employee_id = $1 AND month = $2 AND year = $3) as target
            FROM sales_invoices
            WHERE customer_id IN (SELECT id FROM customers WHERE dse_id = $1)
              AND EXTRACT(MONTH FROM invoice_date) = $2
              AND EXTRACT(YEAR FROM invoice_date) = $3
              AND status != 'Cancelled'
        `, [dseId, month, year]);

        const { actual_sales, target } = salesRes.rows[0];

        if (parseFloat(target) > 0 && parseFloat(actual_sales) >= parseFloat(target)) {
            const checkSalesRes = await db.query(`
                SELECT 1 FROM performance_points_history 
                WHERE employee_id = $1 AND type = 'MONTH_SALES_TARGET' AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3
            `, [dseId, month, year]);

            if (checkSalesRes.rows.length === 0) {
                await db.query(`
                    INSERT INTO performance_points_history (employee_id, date, points, type, reason)
                    VALUES ($1, $2, $3, 'MONTH_SALES_TARGET', $4)
                `, [dseId, `${year}-${month}-01`, salesRule.points || 2000, `Hit Monthly Sales Target: ₹${actual_sales} / ₹${target}`]);
            }
        }
    }
}

module.exports = { calculateDailyPoints, checkMonthlyBonus };
