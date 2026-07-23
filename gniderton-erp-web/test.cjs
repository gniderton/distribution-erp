const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Capture page errors (React crashes)
  page.on('pageerror', err => {
    console.log('PAGE_ERROR:', err.toString());
  });

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE_ERROR:', msg.text());
    }
  });

  try {
    await page.goto('http://localhost:5173/payment-settlement', { waitUntil: 'networkidle2' });
    
    // Wait for a row to appear and click it
    await page.waitForSelector('tbody tr', { timeout: 5000 });
    const rows = await page.$$('tbody tr');
    
    if (rows.length > 0) {
      console.log('Clicking row...');
      await rows[0].click();
      
      // Wait a bit for crash to happen or drawer to open
      await new Promise(r => setTimeout(r, 3000));
    } else {
      console.log('No rows found!');
    }
  } catch (err) {
    console.error('SCRIPT_ERROR:', err);
  } finally {
    await browser.close();
  }
})();
