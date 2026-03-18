import { chromium } from 'playwright';

async function captureAutomationDashboard() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Acessar a página de automação do backend
    await page.goto('https://innovative-enjoyment-production-ed8f.up.railway.app/admin/automation', { 
      waitUntil: 'domcontentloaded', 
      timeout: 20000 
    });
    
    await page.waitForTimeout(3000);
    
    // Tirar screenshot
    await page.screenshot({ 
      path: '/data/.openclaw/workspace/automation-dashboard.png', 
      fullPage: true 
    });
    
    console.log('Dashboard salvo');
    await browser.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    await browser.close();
    process.exit(1);
  }
}

captureAutomationDashboard();
