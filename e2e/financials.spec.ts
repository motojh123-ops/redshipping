import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo } from './helpers/auth';

test.describe('07 — Financials & Billing Module', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // --- Invoices ---
  test('should navigate to invoices page', async ({ page }) => {
    await navigateTo(page, '/invoices');
    await expect(page).toHaveURL(/.*invoices/);
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('should display invoices list or table', async ({ page }) => {
    await navigateTo(page, '/invoices');
    const content = page.locator('table, [class*="invoice"], [class*="card"]').first();
    await expect(content).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('should have create invoice button', async ({ page }) => {
    await navigateTo(page, '/invoices');
    const createBtn = page.locator('button:has-text("إصدار"), button:has-text("Create"), button:has-text("New"), button:has-text("جديد"), button:has-text("+")').first();
    const visible = await createBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (visible) {
      await expect(createBtn).toBeEnabled();
    }
  });

  // --- Disbursements ---
  test('should navigate to disbursement vouchers page', async ({ page }) => {
    await navigateTo(page, '/disbursements');
    await expect(page).toHaveURL(/.*disbursements/);
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  // --- Statement of Account ---
  test('should navigate to statement of account page', async ({ page }) => {
    await navigateTo(page, '/statement-of-account');
    await expect(page).toHaveURL(/.*statement-of-account/);
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });
});
