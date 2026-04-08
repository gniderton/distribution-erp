const { pool } = require('./config/db');

const hsnData = [
  { code: '08132000', desc: 'Prunes (Dried fruit)' },
  { code: '15091000', desc: 'Olive oil and its fractions, virgin' },
  { code: '15100091', desc: 'Other oils from olives (edible grade)' },
  { code: '151550', desc: 'Sesame oil and its fractions' },
  { code: '15180039', desc: 'Inedible mixtures of animal or vegetable fats/oils' },
  { code: '18069090', desc: 'Other food preparations containing cocoa' },
  { code: '20055100', desc: 'Beans (shelled), prepared or preserved' },
  { code: '20057000', desc: 'Olives, prepared or preserved' },
  { code: '20058000', desc: 'Sweet corn, prepared or preserved' },
  { code: '20082000', desc: 'Pineapples, prepared or preserved' },
  { code: '20089700', desc: 'Mixtures of fruit, nuts, and other parts of plants' },
  { code: '21033000', desc: 'Mustard flour, meal and prepared mustard' },
  { code: '21039090', desc: 'Other sauces, mixed condiments and seasonings' },
  { code: '21069050', desc: 'Soft drink concentrates' },
  { code: '3401', desc: 'Soap; organic surface-active products (bars, etc)' },
  { code: '3402', desc: 'Organic surface-active agents, washing/cleaning preparations' }
];

async function seed() {
  try {
    const existingRes = await pool.query('SELECT hsn_code FROM hsn_codes');
    const existing = new Set(existingRes.rows.map(r => r.hsn_code));

    const toInsert = hsnData.filter(item => !existing.has(item.code));

    if (toInsert.length === 0) {
      console.log('All HSN codes already exist.');
      process.exit(0);
    }

    console.log(`Inserting ${toInsert.length} new HSN codes...`);

    for (const item of toInsert) {
      await pool.query(
        'INSERT INTO hsn_codes (hsn_code, hsn_description, is_active) VALUES ($1, $2, true)',
        [item.code, item.desc]
      );
    }

    console.log('Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
