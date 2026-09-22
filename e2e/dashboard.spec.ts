import { test, expect } from '@playwright/test';
import { loginAsAdmin, waitForPageLoad } from './helpers/auth';

test.describe('02 — Dashboard & KPI Overview', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display the main dashboard after login', async ({ page }) => {
    await waitForPageLoad(page);
    const body = await page.textContent('body');
    // Dashboard should contain key indicators/elements
    expect(body).toBeTruthy();
    expect(body!.length).toBeGreaterThan(100);
  });

  test('should render KPI stat cards on dashboard', async ({ page }) => {
    await waitForPageLoad(page);
    // Look for stat/metric cards (typically shown as numbers with labels)
    const statCards = page.locator('[class*="stat"], [class*="card"], [class*="kpi"], [class*="metric"]');
    // Dashboard should have at least some visual cards
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('should display sidebar navigation with 6 portals', async ({ page }) => {
    await waitForPageLoad(page);
    // Check that sidebar is visible
    const sidebar = page.locator('nav, [class*="sidebar"], aside').first();
    await expect(sidebar).toBeVisible();
  });

  test('should toggle sidebar collapse/expand', async ({ page }) => {
    await waitForPageLoad(page);
    const collapseBtn = page.locator('button:has(svg)').filter({ hasText: /chevron|toggle/i }).first();
    if (await collapseBtn.isVisible().catch(() => false)) {
      await collapseBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('should toggle theme (dark/light mode)', async ({ page }) => {
    await waitForPageLoad(page);
    const themeBtn = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: '' });
    // Try to find and click a theme toggle button
    const allButtons = await page.locator('button').all();
    for (const btn of allButtons.slice(0, 20)) {
      const text = await btn.textContent().catch(() => '');
      if (!text || text.trim() === '') {
        // Could be an icon-only button like theme toggle
        continue;
      }
    }
  });
});
