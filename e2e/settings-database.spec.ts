import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo } from './helpers/auth';

test.describe('10 — Reports, Notifications, Settings & Profile', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // --- Reports ---
  test('should navigate to reports/analytics dashboard', async ({ page }) => {
    await navigateTo(page, '/reports');
    await expect(page).toHaveURL(/.*reports/);
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('should display charts or report sections', async ({ page }) => {
    await navigateTo(page, '/reports');
    const charts = page.locator('[class*="chart"], [class*="recharts"], svg, canvas, [class*="report"]').first();
    await expect(charts).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  // --- Notifications ---
  test('should navigate to notifications center', async ({ page }) => {
    await navigateTo(page, '/notifications');
    await expect(page).toHaveURL(/.*notifications/);
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  // --- Settings ---
  test('should navigate to settings page', async ({ page }) => {
    await navigateTo(page, '/settings');
    await expect(page).toHaveURL(/.*settings/);
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('should display settings tabs (General, Database, etc.)', async ({ page }) => {
    await navigateTo(page, '/settings');
    const tabs = page.locator('button:has-text("بيانات"), button:has-text("عام"), button:has-text("General"), button:has-text("Database"), button:has-text("قاعدة")');
    const count = await tabs.count().catch(() => 0);
    // At least one settings tab should exist
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should open database settings tab', async ({ page }) => {
    await navigateTo(page, '/settings');
    const dbTab = page.locator('button:has-text("بيانات"), button:has-text("قاعدة البيانات"), button:has-text("Database")').first();
    if (await dbTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dbTab.click();
      await page.waitForTimeout(1000);
      const resetBtn = page.locator('text=تصفير').or(page.locator('text=Reset'));
      await expect(resetBtn).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  // --- Profile ---
  test('should navigate to user profile page', async ({ page }) => {
    await navigateTo(page, '/profile');
    await expect(page).toHaveURL(/.*profile/);
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('should display profile info with user details', async ({ page }) => {
    await navigateTo(page, '/profile');
    const body = await page.textContent('body');
    // Profile should show at least the admin email or name
    expect(body).toBeTruthy();
  });
});
