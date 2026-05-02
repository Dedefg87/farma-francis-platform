import { test, expect } from '@playwright/test';

test.describe('Farma Francis - CRM', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:4002');
    await page.fill('input[name="email"]', 'seujorgebot@gmail.com');
    await page.fill('input[name="password"]', '@Afrancis87');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/crm**');
  });

  test('should display 150+ customers', async ({ page }) => {
    await page.goto('http://localhost:4002/crm');
    
    // Wait for customers to load
    await page.waitForSelector('table tbody tr');
    
    // Count rows in table
    const rows = await page.locator('table tbody tr').count();
    expect(rows).toBeGreaterThan(150);
  });

  test('should navigate to customer details', async ({ page }) => {
    await page.goto('http://localhost:4002/crm');
    
    // Click first customer
    await page.click('table tbody tr:first-child');
    
    // Should show customer details
    await expect(page.locator('[data-testid="customer-details"]')).toBeVisible();
  });
});
