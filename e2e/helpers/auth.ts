import { Page, expect } from '@playwright/test';

/**
 * Performs admin login and waits for dashboard redirect.
 * Reusable across all test suites.
 */
export async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@redshipping.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/', { timeout: 15000 });
  expect(page.url()).not.toContain('/login');
}

/**
 * Waits for page to be fully loaded (network idle + DOM ready)
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);
}

/**
 * Navigates to a route and waits for it to load.
 */
export async function navigateTo(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await waitForPageLoad(page);
}
