const { Client } = require('pg');

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres', // Connect to default DB to create the new one
    password: 'password',
    port: 5432,
});

async function setup() {
    try {
        await client.connect();
        // Check if database exists
        const res = await client.query("SELECT 1 FROM pg_database WHERE datname='distribution_erp'");

        if (res.rowCount === 0) {
            console.log('Creating database: distribution_erp...');
            await client.query('CREATE DATABASE distribution_erp');
            console.log('Database created successfully!');
        } else {
            console.log('Database distribution_erp already exists.');
        }
    } catch (err) {
        console.error('Setup Error:', err);
    } finally {
        await client.end();
    }
}

setup();
