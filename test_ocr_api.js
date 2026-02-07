async function testOCR() {
    console.log('--- TESTING OCR ENDPOINT ---');
    try {
        const response = await fetch('http://localhost:3000/api/payments/ocr-cheque', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_base64: 'dummy_data_for_test'
            })
        });

        const data = await response.json();
        if (response.ok && data.cheque_number) {
            console.log('✅ OCR API Success!');
            console.log('Data Received:', JSON.stringify(data, null, 2));
        } else {
            console.log('❌ OCR API Failed:', data);
        }
    } catch (err) {
        console.error('❌ Error during test:', err.message);
    }
}

testOCR();
