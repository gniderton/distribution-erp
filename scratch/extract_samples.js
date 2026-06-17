const fs = require('fs');
const path = require('path');

const backupPath = 'for summary/universal-backup-2026-05-02T01-38-31-530Z.json';
const outputPath = 'scratch/samples.json';

try {
    const rawData = fs.readFileSync(backupPath, 'utf8');
    const backup = JSON.parse(rawData);
    const samples = {};

    for (const tableName in backup.data) {
        samples[tableName] = backup.data[tableName].slice(0, 2);
    }

    fs.writeFileSync(outputPath, JSON.stringify(samples, null, 2));
    console.log('Samples extracted to ' + outputPath);
} catch (err) {
    console.error('Error processing backup:', err);
}
