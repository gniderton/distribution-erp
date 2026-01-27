const { pool } = require('../config/db');

const rawData = `
GD-ECL-1	Syed Anfal	9567987408	syedanfal1997@gmail.com	Palms, Near Mishkal Mosque, calicut, 673001	M	Yes	480275233292	11/2728/2016	SSLC	Indusind Bank	159567987408	Kozhikode	Founder	09:30	06:30	Riyas A	9447020745	Father	06/01/2024	Aadhar PDF	License PDF	Certificate PDF	20000	
GD-ECL-2	Akshay A Krishnan	8943024898	akshayachu180@gmail.com	Arikkanatt House, Near LP School, Beypore - 673015	Male	Yes	466601506786	11/13670/2016	Diploma in Radiology	Kotak Mahindra Bank	4748205895	KKBK0009299	Resigned	09:30	06:30	Rajitha Kumari	9656875531	Mother	02/10/2025	Aadhar PDF	License PDF	Certificate PDF	18000	30/06/2025
GD-ECL-3	Abhin R.K	6238777070	rkabhin985@gmail.com	Rameshwaram House, ittuelli Kunnu, Perumanna, Pantheernakve PO, Calicut-673019	Male	Yes	925664619345	KL1120210005707	12th	IndusInd Bank	157594945869	INDB0001804	Terminated	09:30	06:30	Dineshan R.K	9846721261	Father	23/12/2024	Aadhar PDF	License PDF	Certificate PDF	18000	20/05/2025
GD-ECL-4	Rafeeq P	9074277918		Daru Salma, Vettekkodu, Mancheri-676122	Male	Yes	996040477353	KL1020120019523	AADHAR	State Bank of India (SBI)	39595915433	SBIN0004365	Driver	09:30	06:30	Muhammed Ali	9847474014	Friend	16/07/2024	Aadhar PDF	License PDF	Certificate PDF	20000	
GD-ECL-5	Akshay Kumar T										44062250006439	SYNB0004406	DAA	07:00	04:00:00	Sini Sunil	8943584748	Mother	02/04/2025				15000	31/05/2025
GD-ECL-6	Habeeb Rahman PT	8089774526	916habeebrahman@gmail.com	Afsad Manzil, Pandarathil Valap, Kappakkal, Old Militry Road, Payyanakkal	Male	Yes	514136147496	11/3195/2017	SSLC	Canara Bank	110046286994	CNRB0000205	DSE	09:30	06:30:00	Afsad	7356614356	Brother	28/05/2025	Aadhar PDF	License PDF	Certificate PDF	20000	
GD-ECL-7	Aatiq Baiju	7306416105	aatiqbaiju@gmail.com	Greens, Thangals Road	Male	Yes	526171828355	KL1120230009040		Punjab National Bank (PNB)	4329000100564170	PUNB0432900	Cashier	03:30	06:30:00	Sekkeena	9841933225	Grand Mother	10/6/2025	Aadhar PDF	License PDF	Certificate PDF	3000	
GD-ECL-8	Fahad PT	8714268489	fahadfafa115@gmail.com	Naheem House, Chamundi Valapp, Payyanakkal, PO Kallai	Male	Yes	515292822799		No	Canara Bank	5968101003228	CNRB0005968	DSE	09:30	06:30:00	Safwan	7356023801	Brother	16/06/2025	Aadhar PDF	License PDF	Certificate PDF	20000	
GD-ECL-9	Murshid KT	7510446944	9758mursh@gmail,com	KTM House, Kinassery, PO Pokkunnu, 673007	Male	Yes	708199197219	KL20220009901	No	Kerala State Co-Operative Bank	163212301200764	KSBK0001632	DLO	07:00	16:00:00	Sakkeer KT	9895212877	Father	7/7/2025	Aadhar PDF	License PDF	Certificate PDF	16500	
GD-ECL-10	Resvan PT	9.18078E+11	resvanpt@gmail.com	Edayal Paramb,Mavathumpadi road,PO Olavanna,Kozhikode 673019	Male	Yes	267638164553	11/6209/2012	SSLC	Canara Bank	44042600000731	CNRB0014404	DSE	09:30	06:30:00	Riyadh	9.19948E+11	Brother	22/12/2025	Aadhar PDF	License PDF	Certificate PDF	16500	
`;

function parseDate(dateStr) {
    if (!dateStr || !dateStr.trim()) return null;
    // Format: DD/MM/YYYY or similar. JS Date constructor likes YYYY-MM-DD
    // Assuming DD/MM/YYYY based on input (06/01/2024)
    const parts = dateStr.trim().split(/[\/-]/);
    if (parts.length === 3) {
        // DD, MM, YYYY
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return null;
}

async function seed() {
    const lines = rawData.trim().split('\n');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        for (const line of lines) {
            if (!line.trim()) continue;

            // Tab separated
            const cols = line.split('\t').map(c => c ? c.trim() : null);

            /* 
            0: Code
            1: Name
            2: Contact
            3: Email
            4: Address
            5: Sex
            6: Drivers Lic?
            7: Aadhar No
            8: Lic No
            9: Cert
            10: Bank
            11: Acc No
            12: IFSC
            13: Position
            14: Start
            15: End
            16: Emg Name
            17: Emg Num
            18: Relation
            19: Joining
            20: A_Doc
            21: L_Doc
            22: C_Doc
            23: Salary
            24: Resign Date
            */

            const code = cols[0];
            const name = cols[1];
            const contact = cols[2];
            const email = cols[3];
            const address = cols[4];
            const genderRaw = cols[5] || '';
            const gen = genderRaw.startsWith('M') ? 'Male' : (genderRaw.startsWith('F') ? 'Female' : 'Other');

            const aadhar = cols[7];
            const licNo = cols[8];

            const bank = cols[10];
            const acc = cols[11];
            const ifsc = cols[12];

            let pos = cols[13];
            let status = 'Active';
            let resignDate = parseDate(cols[24]);

            // Logic to handle 'Resigned'/'Terminated' in Position column
            if (pos === 'Resigned' || pos === 'Terminated') {
                status = pos;
                pos = 'Former Employee'; // Default designation if unknown
            }
            if (resignDate) {
                status = 'Resigned';
            }

            const start = cols[14];
            const end = cols[15];

            const emgName = cols[16];
            const emgNum = cols[17];
            const emgRel = cols[18];

            const joinDate = parseDate(cols[19]);
            const salary = Number(cols[23] || 0);

            console.log(`Processing: ${code} - ${name} (${status})`);

            // 1. Upsert Employee
            const res = await client.query(`
                INSERT INTO employees (
                    employee_code, full_name, gender, contact_primary, email, address_full,
                    designation, employment_status, joining_date, resignation_date,
                    shift_start_time, shift_end_time,
                    aadhar_number, driving_license_number,
                    bank_name, account_number, ifsc_code,
                    emergency_contact_name, emergency_contact_number, emergency_relation,
                    current_salary
                ) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
                ON CONFLICT (employee_code) DO UPDATE SET
                    full_name = EXCLUDED.full_name,
                    contact_primary = EXCLUDED.contact_primary,
                    current_salary = EXCLUDED.current_salary,
                    bank_name = EXCLUDED.bank_name,
                    account_number = EXCLUDED.account_number,
                    ifsc_code = EXCLUDED.ifsc_code
                RETURNING id;
            `, [
                code, name, gen, contact, email, address,
                pos, status, joinDate, resignDate,
                start, end,
                aadhar, licNo,
                bank, acc, ifsc,
                emgName, emgNum, emgRel,
                salary
            ]);

            const empId = res.rows[0].id;

            // 2. Add Initial Salary History (if not exists for today)
            if (salary > 0) {
                await client.query(`
                    INSERT INTO employee_salary_history (
                        employee_id, effective_date, previous_salary, new_salary, reason, created_by
                    ) 
                    SELECT $1, $2, 0, $3, 'Initial Data Import', 'System'
                    WHERE NOT EXISTS (
                        SELECT 1 FROM employee_salary_history WHERE employee_id = $1
                    )
                `, [empId, joinDate || new Date(), salary]);
            }
        }

        await client.query('COMMIT');
        console.log('✅ Employees Imported Successfully');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Import Failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

seed();
