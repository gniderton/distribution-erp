const { pool } = require('../config/db');

// --- RAW DATA ---
const rawCustomers = `Customer Name	Phone Number	email	Address	Area	Pin Code	GST	Pan	Channel	DSE	Route
Mint Super Market				Regent Plaza, Bus Stand Building	Ramanattukara	673633	32AAOFM1476E1ZD		Dealer	Resvan PT	Thursday
Preethi Hyper Market				Preethi Centre	Feroke	673631	32AANFP2431K1Z9		Dealer	Resvan PT	Friday
MA Traders				6RHW+V37 ,Mankave Pantheerankave Road, Pantheerankave, Pantheeramkavu, Kerala 673019	6RHW+W5V Kozhikode, Kerala	673019	32ABSFM2328L1ZZ		Dealer	Resvan PT	Saturday
Green Mart		918129708095		Hillview Complex, Athanikkal, Opp. BMW Showroom, Kozhikode	Athanikkal	673005	32DPLPM1111P1ZU		Dealer	Habeeb Rahman PT	Monday
Kairali Bakery		917736737962		Kannur Rd, Gandi Nagar, Elathur, Kozhikode, Kerala	Elathur	673303	32DPBPK4676H2ZU		Dealer	Habeeb Rahman PT	Monday
A C STORE CHEATTIKULAM		917907193464		8PHV+V43 Chettikulam, Gandi Nagar, Elathur, Kozhikode, Kerala	Elathur	673303			Dealer	Habeeb Rahman PT	Monday
Sagara store		918129000821		8PMR+F7M, S.K. Bazaar, Elathur, Kozhikode, Kerala 673303	Elathur	673303			Dealer	Habeeb Rahman PT	Monday
Jaya store		919947415951		Elathur, Kozhikode	Elathur	673303			Dealer	Habeeb Rahman PT	Monday
P P alikoya		919539038319		8PVR+J5F, Elathur, Kozhikode, Kerala 673303, India	Elathur	673303			Dealer	Habeeb Rahman PT	Monday
P.B STORE		919495511282		8PWR+P3J Kannur Rd, Kozhikode, Elathur	Elathur	673303			Dealer	Habeeb Rahman PT	Monday
SARASWATHI POOJA STORE		918089995363		Kattilapeedika, Vengalam, Kozhikode, Kerala	Kattilapeedika	673303			Dealer	Habeeb Rahman PT	Monday
Navami Pooja store		916238296248		8Q64+WVG, Kannur Rd, Pavangad, Kozhikode, Kerala 673021	Pavangad	673021			Wholesale	Habeeb Rahman PT	Monday
Keezhoth Store		919995122248			Cheattikulam	673303			Dealer	Habeeb Rahman PT	Monday
M.K OIL MILL KOVOOR		918848622522		TP Kumaran Road, Kovoor, Ummalathoor, Kozhikode	Ummalathoor	673008			Dealer	Habeeb Rahman PT	Tuesday
SALMANIYA SUPER MARKET		917510573696		7VP5+HWJ, Mundikkal Thazham - Peringolam Rd, Mayanad, Kozhikode, Kerala 673008	7VP5+JV9 Chelavoor, Kozhikode, Kerala	673571	32AKLPS8029G1ZX		Dealer	Habeeb Rahman PT	Tuesday
Rajan store PAALAKOTTUVAYAL		919961772871		7RPX+F8W, Mayanad, Kozhikode	Mayanad	673008			Dealer	Habeeb Rahman PT	Tuesday`;

const rawEmployees = `Name	Contact Number	email	Address	Sex	Drivers Licence	AADHAR NO	Licence NO	Certificate	Bank	Account Number	IFSC	Position	Start Time	End Time	Emergency Contact	Emergancy Number	Relation	Joining Date	AADHAR DOC	License Doc	Cerificate Doc	Salary	Resign Date
Syed Anfal	9567987408	syedanfal1997@gmail.com	Palms, Near Mishkal Mosque, calicut, 673001	M	Yes	480275233292	11/2728/2016	SSLC	Indusind Bank	159567987408	Kozhikode	Founder	09:30	06:30	Riyas A	9447020745	Father	06/01/2024	Aadhar PDF	License PDF	Certificate PDF	20000	
Akshay A Krishnan	8943024898	akshayachu180@gmail.com	Arikkanatt House, Near LP School, Beypore - 673015	Male	Yes	466601506786	11/13670/2016	Diploma in Radiology	Kotak Mahindra Bank	4748205895	KKBK0009299	Resigned	09:30	06:30	Rajitha Kumari	9656875531	Mother	02/10/2025	Aadhar PDF	License PDF	Certificate PDF	18000	30/06/2025
Abhin R.K	6238777070	rkabhin985@gmail.com	Rameshwaram House, ittuelli Kunnu, Perumanna, Pantheernakve PO, Calicut-673019	Male	Yes	925664619345	KL1120210005707	12th	IndusInd Bank	157594945869	INDB0001804	Terminated	09:30	06:30	Dineshan R.K	9846721261	Father	23/12/2024	Aadhar PDF	License PDF	Certificate PDF	18000	20/05/2025
Rafeeq P	9074277918		Daru Salma, Vettekkodu, Mancheri-676122	Male	Yes	996040477353	KL1020120019523	AADHAR	State Bank of India (SBI)	39595915433	SBIN0004365	Driver	09:30	06:30	Muhammed Ali	9847474014	Friend	16/07/2024	Aadhar PDF	License PDF	Certificate PDF	20000	
Akshay Kumar T										44062250006439	SYNB0004406	DAA	07:00	04:00:00	Sini Sunil	8943584748	Mother	02/04/2025				15000	31/05/2025
Habeeb Rahman PT	8089774526	916habeebrahman@gmail.com	Afsad Manzil, Pandarathil Valap, Kappakkal, Old Militry Road, Payyanakkal	Male	Yes	514136147496	11/3195/2017	SSLC	Canara Bank	110046286994	CNRB0000205	DSE	09:30	06:30:00	Afsad	7356614356	Brother	28/05/2025	Aadhar PDF	License PDF	Certificate PDF	20000	
Aatiq Baiju	7306416105	aatiqbaiju@gmail.com	Greens, Thangals Road	Male	Yes	526171828355	KL1120230009040		Punjab National Bank (PNB)	4329000100564170	PUNB0432900	Cashier	03:30	06:30:00	Sekkeena	9841933225	Grand Mother	10/6/2025	Aadhar PDF	License PDF	Certificate PDF	3000	
Fahad PT	8714268489	fahadfafa115@gmail.com	Naheem House, Chamundi Valapp, Payyanakkal, PO Kallai	Male	Yes	515292822799		No	Canara Bank	5968101003228	CNRB0005968	DSE	09:30	06:30:00	Safwan	7356023801	Brother	16/06/2025	Aadhar PDF	License PDF	Certificate PDF	20000	
Murshid KT	7510446944	9758mursh@gmail,com	KTM House, Kinassery, PO Pokkunnu, 673007	Male	Yes	708199197219	KL20220009901	No	Kerala State Co-Operative Bank	163212301200764	KSBK0001632	DLO	07:00	16:00:00	Sakkeer KT	9895212877	Father	7/7/2025	Aadhar PDF	License PDF	Certificate PDF	16500	
Resvan PT	9.18078E+11	resvanpt@gmail.com	Edayal Paramb,Mavathumpadi road,PO Olavanna,Kozhikode 673019	Male	Yes	267638164553	11/6209/2012	SSLC	Canara Bank	44042600000731	CNRB0014404	DSE	09:30	06:30:00	Riyadh	9.19948E+11	Brother	22/12/2025	Aadhar PDF	License PDF	Certificate PDF	16500	`;

// --- UTILS ---
function parseDate(dateStr) {
    if (!dateStr || !dateStr.includes('/')) return new Date();
    const parts = dateStr.split('/');
    // Assumes DD/MM/YYYY
    if (parts.length === 3) {
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    return new Date();
}

async function getNextSequence(client, prefix, docType) {
    // 1. Ensure prefix exists in document_sequences
    const check = await client.query('SELECT id FROM document_sequences WHERE prefix = $1', [prefix]);

    if (check.rows.length === 0) {
        await client.query(`
            INSERT INTO document_sequences (company_settings_id, branch_id, document_type, prefix, current_number)
            VALUES (1, 1, $1, $2, 0)
        `, [docType, prefix]);
    }

    // 2. Increment & Fetch
    const res = await client.query(`
        UPDATE document_sequences 
        SET current_number = current_number + 1 
        WHERE prefix = $1 
        RETURNING current_number
    `, [prefix]);

    return `${prefix}${String(res.rows[0].current_number).padStart(3, '0')}`;
}

async function getOrCreateRoute(client, routeName) {
    if (!routeName) return null;
    const res = await client.query(`
        INSERT INTO routes (route_name) VALUES ($1) 
        ON CONFLICT (route_name) DO UPDATE SET route_name = EXCLUDED.route_name 
        RETURNING id
    `, [routeName.trim()]);
    return res.rows[0].id;
}

async function getEmployeeIdByName(client, name) {
    if (!name) return null;
    const res = await client.query(`SELECT id FROM employees WHERE full_name ILIKE $1`, [name.trim()]);
    return res.rows.length > 0 ? res.rows[0].id : null;
}

// --- MIGRATION LOGIC ---
async function migrate() {
    console.log("🚀 Starting Migration...");
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Process Employees
        // Emp Cols: Name(0), Contact(1), Email(2), Address(3), Sex(4), DLStatus(5), Aadhar(6), DLNo(7), Cert(8), Bank(9), Acc(10), IFSC(11), Role(12), ...
        console.log("Processing Employees...");
        const empRows = rawEmployees.split('\n').slice(1).filter(l => l.trim());
        const empMap = new Map();

        for (const line of empRows) {
            const cols = line.split('\t');
            const [
                name, contact, email, address, sex, dl_status, aadhar, dl_no, cert, bank,
                acc_no, ifsc, role, start_time, end_time, emerg_contact, emerg_num, relation,
                join_date, aadhar_doc, lic_doc, cert_doc, salary, resign_date
            ] = cols.map(c => c?.trim());

            if (!name) continue;

            const empCode = await getNextSequence(client, 'EM-', 'EMPLOYEE');

            const empRes = await client.query(`
                INSERT INTO employees (
                    employee_code, full_name, designation, joining_date, contact_primary, email, 
                    account_number, ifsc_code, current_salary, employment_status,
                    bank_name, aadhar_number, driving_license_number,
                    address_full, gender
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                ON CONFLICT (employee_code) DO NOTHING
                RETURNING id
            `, [
                empCode, name, role || 'Staff', parseDate(join_date),
                contact || '', email, acc_no, ifsc, salary ? parseFloat(salary) : 0, resign_date ? 'Resigned' : 'Active',
                bank, aadhar, dl_no, address, sex === 'M' ? 'Male' : (sex === 'F' ? 'Female' : 'Other')
            ]);

            if (empRes.rows.length > 0) {
                empMap.set(name, empRes.rows[0].id);
            }
        }

        // 2. Process Customers
        console.log("Processing Customers...");
        const custRows = rawCustomers.split('\n').filter(l => l.trim());
        const startIdx = custRows[0].startsWith('Customer') ? 1 : 0;

        for (let i = startIdx; i < custRows.length; i++) {
            const cols = custRows[i].split('\t');
            // MAPPING BASED ON DEBUG:
            // 0:Name, 1:Phone, 2:Email, 3:SKIP, 4:Address, 5:Area, 6:Pin, 7:GST, 8:Pan(skipped?), 9:Channel, 10:DSE, 11:Route
            const cName = cols[0]?.trim();
            const cPhone = cols[1]?.trim();
            const cEmail = cols[2]?.trim();
            const cAddress = cols[4]?.trim(); // "Regent Plaza..."
            const cArea = cols[5]?.trim();
            const cPin = cols[6]?.trim();
            const cGst = cols[7]?.trim();
            const cChannelName = cols[9]?.trim(); // "Dealer"
            const cDseName = cols[10]?.trim(); // "Resvan PT"
            const cRouteName = cols[11]?.trim(); // "Thursday"

            if (!cName) continue;

            const routeId = await getOrCreateRoute(client, cRouteName);
            const dseId = await getEmployeeIdByName(client, cDseName);

            let channelId = null;
            if (cChannelName) {
                const chanRes = await client.query(`SELECT id FROM channels WHERE channel_name ILIKE $1`, [cChannelName]);
                if (chanRes.rows.length > 0) channelId = chanRes.rows[0].id;
                else {
                    const newChan = await client.query(`INSERT INTO channels (channel_name, price_column) VALUES ($1, 'dealer_rate') RETURNING id`, [cChannelName]);
                    channelId = newChan.rows[0].id;
                }
            }

            const custCode = await getNextSequence(client, 'CS-', 'CUSTOMER');

            const custRes = await client.query(`
                INSERT INTO customers (
                    customer_code, customer_name, customer_phone, email, gstin, 
                    route_id, dse_id, channel_id, credit_limit
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 50000)
                ON CONFLICT (customer_code) DO NOTHING
                RETURNING id
            `, [
                custCode, cName, cPhone, cEmail, cGst, routeId, dseId, channelId
            ]);

            if (custRes.rows.length > 0 && (cAddress || cArea || cPin)) {
                await client.query(`
                    INSERT INTO customer_addresses (
                        customer_id, address_line1, city, pincode, is_default_billing, is_default_shipping
                    ) VALUES ($1, $2, $3, $4, true, true)
                `, [custRes.rows[0].id, cAddress + ', ' + (cArea || ''), cArea, cPin]);
            }
        }

        await client.query('COMMIT');
        console.log("✅ Data Migration Completed Successfully");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Migration Failed:", err);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
