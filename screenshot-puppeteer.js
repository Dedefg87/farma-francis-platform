const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('https://innovative-enjoyment-production-ed8f.up.railway.app', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: '/tmp/railway-home.png', fullPage: false });
  console.log('Screenshot salvo em /tmp/railway-home.png');
  await browser.close();
})().catch(console.error);
