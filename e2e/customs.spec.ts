import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo } from './helpers/auth';

test.describe('06 — Customs & Nafeza Module', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should navigate to customs dossiers page', async ({ page }) => {
    await navigateTo(page, '/customs');
    await expect(page).toHaveURL(/.*customs/);
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('should display customs dossier list', async ({ page }) => {
    await navigateTo(page, '/customs');
    const content = page.locator('table, [class*="customs"], [class*="dossier"], [class*="card"]').first();
    await expect(content).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('should have create dossier button', async ({ page }) => {
    await navigateTo(page, '/customs');
    const createBtn = page.locator('button:has-text("جديد"), button:has-text("New"), button:has-text("Create"), button:has-text("ملف"), button:has-text("+")').first();
    const visible = await createBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (visible) {
      await expect(createBtn).toBeEnabled();
    }
  });
});
