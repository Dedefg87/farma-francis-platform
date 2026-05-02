import { test, expect } from '@playwright/test';

test.describe('Farma Francis - Login', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('http://localhost:4002');
    await expect(page).toHaveTitle(/Farma Francis/);
    
    // Check if login form is present
    const loginForm = page.locator('form');
    await expect(loginForm).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('http://localhost:4002');
    
    // Fill login form (adjust selectors as needed)
    await page.fill('input[name="email"]', 'seujorgebot@gmail.com');
    await page.fill('input[name="password"]', '@Afrancis87');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard or CRM
    await page.waitForURL('**/crm**');
    await expect(page).toHaveURL(/crm/);
  });
});
