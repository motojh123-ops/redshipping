import { test, expect } from '@playwright/test';
import { loginAsAdmin, waitForPageLoad } from './helpers/auth';

/**
 * Comprehensive smoke test that navigates to EVERY route in the application
 * and verifies it renders without errors (no crash, no blank page).
 */
test.describe('11 — Full Application Smoke Test (All Routes)', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  const allRoutes = [
    { path: '/', name: 'Dashboard' },
    { path: '/shipments', name: 'Shipments List' },
    { path: '/dispatch', name: 'Dispatch Board' },
    { path: '/tracking', name: 'Live Tracking' },
    { path: '/tools', name: 'Logistics Tools' },
    { path: '/clients', name: 'Clients Directory' },
    { path: '/crm/pipeline', name: 'CRM Pipeline' },
    { path: '/pricing', name: 'Pricing Matrix' },
    { path: '/quotations', name: 'Quotations List' },
    { path: '/customs', name: 'Customs Dossiers' },
    { path: '/invoices', name: 'Invoices' },
    { path: '/disbursements', name: 'Disbursement Vouchers' },
    { path: '/statement-of-account', name: 'Statement of Account' },
    { path: '/masters/directory', name: 'World Atlas' },
    { path: '/masters/charge-items', name: 'Charge Items' },
    { path: '/masters/ports', name: 'Ports Registry' },
    { path: '/masters/shipping-lines', name: 'Shipping Lines' },
    { path: '/masters/overseas-agents', name: 'Overseas Agents' },
    { path: '/masters/vendors', name: 'Vendors' },
    { path: '/reports', name: 'Reports Dashboard' },
    { path: '/notifications', name: 'Notifications Center' },
    { path: '/settings', name: 'System Settings' },
    { path: '/profile', name: 'User Profile' },
  ];

  for (const route of allRoutes) {
    test(`should render "${route.name}" page at ${route.path} without crash`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await waitForPageLoad(page);

      // 1. Should not redirect to login (user is authenticated)
      expect(page.url()).not.toContain('/login');

      // 2. Page should have content (not blank)
      const body = await page.textContent('body');
      expect(body).toBeTruthy();
      expect(body!.length).toBeGreaterThan(10);

      // 3. No unhandled error overlay (React error boundary)
      const errorOverlay = page.locator('[class*="error-overlay"], [class*="error-boundary"], #webpack-dev-server-client-overlay');
      const hasError = await errorOverlay.isVisible({ timeout: 500 }).catch(() => false);
      expect(hasError).toBe(false);
    });
  }
});
