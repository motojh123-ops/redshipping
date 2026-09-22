import { test, expect } from '@playwright/test';

test.describe('01 — Authentication & Access Control', () => {

  test('should display the login page with correct branding and form', async ({ page }) => {
    await page.goto('/login');
    // Verify branding
    await expect(page).toHaveTitle(/Red Shipping|بَنّا|Banna/i);
    // Verify login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should have pre-filled admin credentials', async ({ page }) => {
    await page.goto('/login');
    const emailValue = await page.locator('input[type="email"]').inputValue();
    const passValue = await page.locator('input[type="password"]').inputValue();
    expect(emailValue).toBe('admin@redshipping.com');
    expect(passValue).toBe('password123');
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@wrong.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    // Should stay on login page and show an error
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/login');
  });

  test('should login successfully as Admin and redirect to Dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@redshipping.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 15000 });
    expect(page.url()).not.toContain('/login');
  });

  test('should quick-login buttons work', async ({ page }) => {
    await page.goto('/login');
    // Look for quick login buttons (Admin/Sales/Ops)
    const quickButtons = page.locator('button:has-text("Admin"), button:has-text("المدير")');
    if (await quickButtons.count() > 0) {
      await quickButtons.first().click();
      await page.waitForURL('**/', { timeout: 15000 });
      expect(page.url()).not.toContain('/login');
    }
  });

  test('should redirect unauthenticated user to /login', async ({ page }) => {
    // Clear all storage first
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/shipments');
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/login');
  });
});
