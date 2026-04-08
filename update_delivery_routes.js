const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'routes', 'delivery.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Revert Picklist to flat array
const picklistRegex = /router\.get\('\/trips\/:id\/picklist', async \(req, res\) => \{[\s\S]*?res\.json\(\{[\s\S]*?items: result\.rows\r?\n\s+\}\);/g;
const picklistReplacement = `router.get('/trips/:id/picklist', async (req, res) => {
    try {
        const result = await pool.query(\`
            SELECT 
                p.id as product_id, p.product_name, p.product_code, sil.mrp,
                SUM(sil.shipped_qty) as total_qty, string_agg(DISTINCT ib.batch_code, ', ') as batches
            FROM trip_invoices ti
            JOIN sales_invoices si ON ti.invoice_id = si.id
            JOIN sales_invoice_lines sil ON si.id = sil.invoice_id
            JOIN products p ON sil.product_id = p.id
            LEFT JOIN inventory_batches ib ON sil.batch_id = ib.id
            WHERE ti.trip_id = $1
            GROUP BY p.id, p.product_name, p.product_code, sil.mrp
            ORDER BY p.product_name, sil.mrp
        \`, [req.params.id]);

        res.json(result.rows);`;

content = content.replace(picklistRegex, picklistReplacement);

// 2. Revert Manifest to flat array
const manifestRegex = /router\.get\('\/trips\/:id\/manifest', async \(req, res\) => \{[\s\S]*?res\.json\(\{[\s\S]*?items: result\.rows\r?\n\s+\}\);/g;
const manifestReplacement = `router.get('/trips/:id/manifest', async (req, res) => {
    try {
        const result = await pool.query(\`
            SELECT 
                ti.id as trip_invoice_id, si.id as invoice_id, si.invoice_number, si.invoice_date, si.grand_total, si.balance_amount,
                c.id as customer_id, c.customer_name, 
                (SELECT address_line1 FROM customer_addresses WHERE customer_id = c.id LIMIT 1) as address,
                c.latitude, c.longitude, c.customer_phone as phone,
                ti.delivery_status, so.notes as instructions
            FROM trip_invoices ti
            JOIN sales_invoices si ON ti.invoice_id = si.id
            JOIN customers c ON si.customer_id = c.id
            LEFT JOIN sales_orders so ON si.sales_order_id = so.id
            WHERE ti.trip_id = $1
            ORDER BY c.route_sequence ASC
        \`, [req.params.id]);

        res.json(result.rows);`;

content = content.replace(manifestRegex, manifestReplacement);

// 3. Add -web versions
const picklistWeb = `
// 5b. Get Picklist (Web Dashboard - with Info)
router.get('/trips/:id/picklist-web', async (req, res) => {
    try {
        const result = await pool.query(\`
            SELECT 
                p.id as product_id, p.product_name, p.product_code, sil.mrp,
                SUM(sil.shipped_qty) as total_qty, string_agg(DISTINCT ib.batch_code, ', ') as batches
            FROM trip_invoices ti
            JOIN sales_invoices si ON ti.invoice_id = si.id
            JOIN sales_invoice_lines sil ON si.id = sil.invoice_id
            JOIN products p ON sil.product_id = p.id
            LEFT JOIN inventory_batches ib ON sil.batch_id = ib.id
            WHERE ti.trip_id = $1
            GROUP BY p.id, p.product_name, p.product_code, sil.mrp
            ORDER BY p.product_name, sil.mrp
        \`, [req.params.id]);

        const tripInfoRes = await pool.query(\`
            SELECT dt.id as trip_id, dt.trip_number, dt.created_at as "date", dt.vehicle_number,
                   e.full_name as driver_name, t.name as team_name
            FROM delivery_trips dt
            LEFT JOIN employees e ON dt.driver_id = e.id
            LEFT JOIN delivery_teams t ON dt.team_id = t.id
            WHERE dt.id = $1
        \`, [req.params.id]);

        res.json({ trip_info: tripInfoRes.rows[0] || {}, items: result.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
`;

const manifestWeb = `
// 6b. Get Manifest (Web Dashboard - with Info)
router.get('/trips/:id/manifest-web', async (req, res) => {
    try {
        const result = await pool.query(\`
            SELECT 
                ti.id as trip_invoice_id, si.id as invoice_id, si.invoice_number, si.invoice_date, si.grand_total, si.balance_amount,
                c.id as customer_id, c.customer_name, 
                (SELECT address_line1 FROM customer_addresses WHERE customer_id = c.id LIMIT 1) as address,
                c.latitude, c.longitude, c.customer_phone as phone,
                ti.delivery_status, so.notes as instructions
            FROM trip_invoices ti
            JOIN sales_invoices si ON ti.invoice_id = si.id
            JOIN customers c ON si.customer_id = c.id
            LEFT JOIN sales_orders so ON si.sales_order_id = so.id
            WHERE ti.trip_id = $1
            ORDER BY c.route_sequence ASC
        \`, [req.params.id]);

        const tripInfoRes = await pool.query(\`
            SELECT dt.id as trip_id, dt.trip_number, dt.created_at as "date", dt.vehicle_number,
                   e.full_name as driver_name, t.name as team_name
            FROM delivery_trips dt
            LEFT JOIN employees e ON dt.driver_id = e.id
            LEFT JOIN delivery_teams t ON dt.team_id = t.id
            WHERE dt.id = $1
        \`, [req.params.id]);

        res.json({ trip_info: tripInfoRes.rows[0] || {}, items: result.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
`;

// Insert after the original routes
content = content.replace(/(router\.get\('\/trips\/:id\/picklist',[\s\S]*?}\);)/, `$1${picklistWeb}`);
content = content.replace(/(router\.get\('\/trips\/:id\/manifest',[\s\S]*?}\);)/, `$1${manifestWeb}`);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully updated delivery routes.");
