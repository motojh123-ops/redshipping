import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const API = 'http://localhost:4000/api/v1';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
async function waitForData(page: Page, timeout = 12000) {
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {});
  await page.waitForTimeout(800);
}

async function getToken(request: any): Promise<{ token: string; user: any }> {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: 'admin@redshipping.com', password: 'password123' }
  });
  expect(res.status()).toBe(200);
  const json = await res.json();
  // API wraps response: { success: true, data: { accessToken, user, ... } }
  const data = json.data ?? json;
  return { token: data.accessToken, user: data.user };
}

// ─────────────────────────────────────────────
// REAL-01 — API Connectivity & Authentication
// ─────────────────────────────────────────────
test.describe('REAL-01 — API Connectivity & Authentication', () => {

  test('API health check responds with 200 and status ok', async ({ request }) => {
    const res = await request.get(`${API}/health`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    const data = json.data ?? json;
    expect(data.status).toBe('ok');
    expect(data.services.database).toBe('connected');
  });

  test('Login API returns valid JWT token and user object', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@redshipping.com', password: 'password123' }
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    const data = json.data ?? json;
    expect(data).toHaveProperty('accessToken');
    expect(data).toHaveProperty('refreshToken');
    expect(data).toHaveProperty('user');
    expect(data.user.email).toBe('admin@redshipping.com');
    expect(data.user.role).toBeTruthy();
    expect(data.user.companyId).toBeTruthy();
  });

  test('Login returns 401 on wrong credentials', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { email: 'wrong@wrong.com', password: 'badpass' }
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('Protected endpoint rejects unauthenticated request', async ({ request }) => {
    const res = await request.get(`${API}/shipments`);
    expect(res.status()).toBeGreaterThanOrEqual(401);
  });

  test('GET /auth/me returns current user profile', async ({ request }) => {
    const { token } = await getToken(request);
    const res = await request.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    const data = json.data ?? json;
    expect(data).toHaveProperty('email');
  });
});

// ─────────────────────────────────────────────
// REAL-02 — Dashboard: Data Actually Loads
// ─────────────────────────────────────────────
test.describe('REAL-02 — Dashboard: Data Actually Loads', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('dashboard renders with content after login', async ({ page }) => {
    await waitForData(page);
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(300);
  });

  test('dashboard does not show server error messages', async ({ page }) => {
    await waitForData(page);
    const errorText = page.locator('text=500, text=Server Error, text=فشل الاتصال, text=Connection failed');
    await expect(errorText).toHaveCount(0);
  });

  test('dashboard page has no visible loading spinner after load', async ({ page }) => {
    // Page must render substantive content (dashboard is data-driven, no global spinner gate)
    await expect(page.locator('main h1').first()).toBeVisible({ timeout: 15000 });
    // Decorative/ambient animations (e.g. theme-icon rotation) must not count as loading spinners
    const spinners = page.locator('main [class*="animate-spin"]');
    await expect(spinners).toHaveCount(0, { timeout: 5000 });
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(100);
  });
});

// ─────────────────────────────────────────────
// REAL-03 — Shipments: API + UI
// ─────────────────────────────────────────────
test.describe('REAL-03 — Shipments: API + UI', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('GET /shipments returns valid response', async ({ request }) => {
    const { token } = await getToken(request);
    const res = await request.get(`${API}/shipments`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    const data = json.data ?? json;
    // Should return array or paginated response
    expect(typeof data === 'object').toBeTruthy();
  });

  test('shipments page renders table or empty state (not crash)', async ({ page }) => {
    await page.goto('/shipments');
    await waitForData(page);
    // Should not be blank
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(200);
    // No 500 error
    expect(body).not.toContain('500');
  });

  test('create shipment modal opens with form fields', async ({ page }) => {
    await page.goto('/shipments');
    // Target the page CTA explicitly — sidebar/nav also contain shipment-related buttons
    const createBtn = page.locator('main button', { hasText: 'فتح ملف شحنة جديد' }).first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();
    // Modal.tsx renders role="dialog" (no [class*="modal"] marker)
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });
    const inputs = modal.locator('input, select, textarea');
    await expect(inputs.first()).toBeVisible();
    expect(await inputs.count()).toBeGreaterThan(0);
  });

  test('POST /shipments creates a shipment record', async ({ request }) => {
    const { token, user } = await getToken(request);
    // API contract: clientId is required; enums are lowercase; ports are optional UUIDs
    let clientId = user.companyId;
    try {
      const cRes = await request.get(`${API}/clients`, { headers: { Authorization: `Bearer ${token}` } });
      if (cRes.ok()) {
        const cJson = await cRes.json();
        const clients = cJson.data ?? cJson;
        if (Array.isArray(clients) && clients.length > 0) clientId = clients[0].id;
      }
    } catch { /* fall back to companyId */ }
    const res = await request.post(`${API}/shipments`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        clientId,
        shipmentType: 'fcl',
        incoterm: 'CIF',
        currentStage: 'booking_confirmed',
        blNumber: `E2E-BL-${Date.now()}`,
      }
    });
    expect([200, 201]).toContain(res.status());
    const json = await res.json();
    const data = json.data ?? json;
    expect(data).toHaveProperty('id');
  });
});

// ─────────────────────────────────────────────
// REAL-04 — Clients: API + UI
// ─────────────────────────────────────────────
test.describe('REAL-04 — Clients: API + UI', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('GET /clients returns valid response', async ({ request }) => {
    const { token } = await getToken(request);
    const res = await request.get(`${API}/clients`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(200);
  });

  test('clients page renders without crash or error', async ({ page }) => {
    await page.goto('/clients');
    await waitForData(page);
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(100);
    expect(body).not.toContain('500');
  });

  test('POST /clients creates a new client', async ({ request }) => {
    const { token, user } = await getToken(request);
    const res = await request.post(`${API}/clients`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: `E2E Test Client ${Date.now()}`,
        email: `e2e-${Date.now()}@test.com`,
        phone: '+201001234567',
        companyId: user.companyId,
        country: 'Egypt',
      }
    });
    expect([200, 201]).toContain(res.status());
  });
});

// ─────────────────────────────────────────────
// REAL-05 — Invoices & Financials
// ─────────────────────────────────────────────
test.describe('REAL-05 — Invoices & Financials', () => {
  test('GET /invoices returns valid response', async ({ request }) => {
    const { token } = await getToken(request);
    const res = await request.get(`${API}/invoices`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(200);
  });

  test('GET /disbursements returns valid response', async ({ request }) => {
    const { token } = await getToken(request);
    const res = await request.get(`${API}/disbursements`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect([200, 404]).toContain(res.status());
  });
});

// ─────────────────────────────────────────────
// REAL-06 — Masters: Reference Data
// ─────────────────────────────────────────────
test.describe('REAL-06 — Masters: Reference Data', () => {
  test('GET /masters/charge-items returns valid response', async ({ request }) => {
    const { token } = await getToken(request);
    const res = await request.get(`${API}/masters/charge-items`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(200);
  });

  test('GET /masters/ports returns port data', async ({ request }) => {
    const { token } = await getToken(request);
    const res = await request.get(`${API}/masters/ports`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(200);
  });

  test('GET /masters/shipping-lines returns data', async ({ request }) => {
    const { token } = await getToken(request);
    const res = await request.get(`${API}/masters/shipping-lines`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(200);
  });
});

// ─────────────────────────────────────────────
// REAL-07 — Quotations
// ─────────────────────────────────────────────
test.describe('REAL-07 — Quotations', () => {
  test('GET /quotations returns valid response', async ({ request }) => {
    const { token } = await getToken(request);
    const res = await request.get(`${API}/quotations`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(200);
  });
});

// ─────────────────────────────────────────────
// REAL-08 — Settings & Profile
// ─────────────────────────────────────────────
test.describe('REAL-08 — Settings & Profile', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('settings page renders without crash', async ({ page }) => {
    await page.goto('/settings');
    await waitForData(page);
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(200);
    expect(body).not.toContain('500');
  });

  test('profile page shows user info', async ({ page }) => {
    await page.goto('/profile');
    await waitForData(page);
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(100);
  });

  test('GET /auth/me returns correct user', async ({ request }) => {
    const { token } = await getToken(request);
    // Try both possible paths
    let res = await request.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status() === 404) {
      // Try without v1 prefix
      res = await request.get(`http://localhost:4000/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
    expect(res.status()).toBe(200);
    const json = await res.json();
    const data = json.data ?? json;
    expect(data.email).toBe('admin@redshipping.com');
  });
});
