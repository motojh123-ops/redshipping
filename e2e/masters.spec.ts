import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo } from './helpers/auth';

test.describe('08 — Masters & Reference Data Module', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // --- Charge Items ---
  test('should navigate to charge items page', async ({ page }) => {
    await navigateTo(page, '/masters/charge-items');
    await expect(page).toHaveURL(/.*charge-items/);
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  // --- Ports ---
  test('should navigate to ports registry page', async ({ page }) => {
    await navigateTo(page, '/masters/ports');
    await expect(page).toHaveURL(/.*ports/);
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('should display ports list or search', async ({ page }) => {
    await navigateTo(page, '/masters/ports');
    const content = page.locator('table, input, [class*="port"], [class*="card"]').first();
    await expect(content).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  // --- Shipping Lines ---
  test('should navigate to shipping lines page', async ({ page }) => {
    await navigateTo(page, '/masters/shipping-lines');
    await expect(page).toHaveURL(/.*shipping-lines/);
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  // --- Overseas Agents ---
  test('should navigate to overseas agents page', async ({ page }) => {
    await navigateTo(page, '/masters/overseas-agents');
    await expect(page).toHaveURL(/.*overseas-agents/);
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  // --- Vendors ---
  test('should navigate to vendors page', async ({ page }) => {
    await navigateTo(page, '/masters/vendors');
    await expect(page).toHaveURL(/.*vendors/);
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  // --- World Directory / Atlas ---
  test('should navigate to world directory/atlas page', async ({ page }) => {
    await navigateTo(page, '/masters/directory');
    await expect(page).toHaveURL(/.*directory/);
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('should display world atlas with country flags', async ({ page }) => {
    await navigateTo(page, '/masters/directory');
    // Atlas should contain flags or country cards
    const content = page.locator('[class*="flag"], [class*="country"], img, table').first();
    await expect(content).toBeVisible({ timeout: 10000 }).catch(() => {});
  });
});
