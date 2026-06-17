const axios = require('axios');

const testCashFlow = async () => {
    try {
        const response = await axios.get('http://localhost:3000/api/accounting/cash-flow', {
            params: {
                start_date: '2026-05-01',
                end_date: '2026-05-31'
            }
        });
        console.log('Cash Flow Report (First Week):');
        const firstWeek = response.data[0];
        console.log(`Label: ${firstWeek.label}`);
        console.log(`Total In: ${firstWeek.total_in}`);
        console.log(`Total Out: ${firstWeek.total_out}`);
        console.log(`Net Flow: ${firstWeek.net_flow}`);
        
        if (firstWeek.days && firstWeek.days.length > 0) {
            console.log('\nFirst Day in Week:');
            const firstDay = firstWeek.days[0];
            console.log(`  Date: ${firstDay.display_date}`);
            console.log(`  Day Total In: ${firstDay.total_in}`);
            
            if (firstDay.categories && firstDay.categories.length > 0) {
                console.log('\n  Categories on this day:');
                firstDay.categories.forEach(c => {
                    console.log(`    - ${c.label}: In ${c.total_in}, Out ${c.total_out}`);
                });
            }
        }
    } catch (err) {
        console.error('Test Failed:', err.response ? err.response.data : err.message);
    }
};

testCashFlow();
