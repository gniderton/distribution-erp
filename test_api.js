const express = require('express');
const app = express();
app.use(express.json());
const migrationRouter = require('./routes/migration');
app.use('/api/migration', migrationRouter);

app.listen(6000, () => {
    console.log('Server started on 6000');
    
    fetch('http://localhost:6000/api/migration/outstanding-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ customer_id: 1, grand_total: 100, amount_paid: 50 }])
    })
    .then(res => res.text())
    .then(text => {
        console.log('Response HTTP:', text);
        process.exit();
    })
    .catch(err => {
        console.error('Fetch Error:', err);
        process.exit();
    });
});
