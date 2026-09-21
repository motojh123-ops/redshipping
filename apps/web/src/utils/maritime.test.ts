import {
  validateContainerIso6346,
  calculateNauticalMiles,
  estimateVoyageTransitDays,
  convertCurrency,
  formatDualCurrency,
  calculateDemurrageDetention,
  calculatePortTerminalStorage,
  getCarrierTrackingUrl,
  SUPPORTED_CURRENCIES,
  MARITIME_TRADE_LANES,
} from './maritime';
import type { ContainerType } from '@banna/shared-types';

describe('validateContainerIso6346', () => {
  it('accepts a valid container number', () => {
    const result = validateContainerIso6346('CSQU3054383');
    expect(result.isValid).toBe(true);
    expect(result.ownerCode).toBe('CSQ');
    expect(result.equipmentCategory).toBe('U');
    expect(result.calculatedCheckDigit).toBe(3);
    expect(result.errorMessage).toBeUndefined();
  });

  it('normalizes case and strips spaces and dashes', () => {
    expect(validateContainerIso6346('csqu-3054 383').isValid).toBe(true);
  });

  it('rejects wrong length with a helpful message', () => {
    const result = validateContainerIso6346('CSQU305438');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('exactly 11 characters');
  });

  it('rejects bad format (letters in serial) before computing the check digit', () => {
    const result = validateContainerIso6346('CSQU305AB83');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('Invalid format');
  });

  it('reports a check-digit mismatch precisely', () => {
    const result = validateContainerIso6346('CSQU3054384');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('Given 4');
    expect(result.errorMessage).toContain('expected 3');
  });
});

describe('distance & transit estimation', () => {
  it('computes great-circle nautical miles between coordinates', () => {
    // Alexandria -> Dekheila are adjacent ports; a few NM apart
    const miles = calculateNauticalMiles({ lat: 31.1873, lng: 29.8654 }, { lat: 31.1354, lng: 29.8056 });
    expect(miles).toBeGreaterThan(0);
    expect(miles).toBeLessThan(20);
  });

  it('sails at the requested speed and adds canal wait time', () => {
    const { transitHours, transitDays, formatted } = estimateVoyageTransitDays(720, 18, 16);
    // 720 NM / 18 kts = 40h sailing + 16h wait = 56h
    expect(transitHours).toBe(56);
    expect(transitDays).toBe(3);
    expect(formatted).toContain('3 days');
  });

  it('guards against zero/negative speed', () => {
    const { transitHours } = estimateVoyageTransitDays(720, 0, 0);
    expect(transitHours).toBeGreaterThan(0);
  });

  it('both defined trade lanes have consistent route data', () => {
    for (const lane of MARITIME_TRADE_LANES) {
      expect(lane.nauticalMiles).toBeGreaterThan(0);
      expect(lane.waypoints.length).toBeGreaterThan(1);
      expect(lane.waypoints[0].name.length).toBeGreaterThan(0);
    }
  });
});

describe('convertCurrency', () => {
  it('returns the same amount for identical currencies', () => {
    expect(convertCurrency(100, 'USD', 'USD')).toBe(100);
  });

  it('converts USD to EGP via the CBE-style rates', () => {
    const egp = convertCurrency(100, 'USD', 'EGP');
    expect(egp).toBeCloseTo(5150, 0);
  });

  it('converts EGP back to USD symmetrically', () => {
    const usd = convertCurrency(convertCurrency(1000, 'USD', 'EGP'), 'EGP', 'USD');
    expect(usd).toBeCloseTo(1000, 0);
  });

  it('supports custom override rates', () => {
    const result = convertCurrency(100, 'USD', 'EGP', { USD: 50, EGP: 1 });
    expect(result).toBe(5000);
  });

  it('returns the input unchanged for unknown currency codes', () => {
    expect(convertCurrency(100, 'XXX', 'EGP')).toBe(100);
  });

  it('exposes USD as the base currency', () => {
    expect(SUPPORTED_CURRENCIES.USD.isBase).toBe(true);
    expect(SUPPORTED_CURRENCIES.USD.rateToUsd).toBe(1);
  });
});

describe('formatDualCurrency', () => {
  it('formats USD and EGP sides', () => {
    const text = formatDualCurrency(1450);
    expect(text).toMatch(/^\$1,450\.00 \/ [\d,]+\.00 EGP$/);
  });

  it('honors a custom exchange rate', () => {
    const text = formatDualCurrency(100, 50);
    expect(text).toContain('5,000.00 EGP');
  });
});

describe('calculateDemurrageDetention', () => {
  const dischargedAt = '2026-09-01T00:00:00Z';

  it('charges nothing while inside the free days window', () => {
    const result = calculateDemurrageDetention({
      containerNumber: 'MSCU9041280',
      containerType: '40HQ' as ContainerType,
      shippingLine: 'MSC',
      dischargedAt,
      gatedOutAt: '2026-09-10T00:00:00Z', // 9 days, 14 free
    });

    expect(result.isOverdue).toBe(false);
    expect(result.chargeableDays).toBe(0);
    expect(result.totalDemurrageUsd).toBe(0);
    expect(result.tiers).toHaveLength(0);
  });

  it('applies tiered rates across the 20ft bands for a 40HQ container', () => {
    const result = calculateDemurrageDetention({
      containerNumber: 'MSCU9041280',
      containerType: '40HQ' as ContainerType,
      shippingLine: 'MSC',
      dischargedAt,
      gatedOutAt: '2026-09-26T00:00:00Z', // 25 days in port, 14 free -> 11 chargeable
    });

    expect(result.chargeableDays).toBe(11);
    expect(result.isOverdue).toBe(true);
    // Tier 1: 7 days * $70, Tier 2: 4 days * $120
    expect(result.tiers).toHaveLength(2);
    expect(result.tiers[0]).toMatchObject({ days: 7, ratePerDayUsd: 70, totalUsd: 490 });
    expect(result.tiers[1]).toMatchObject({ days: 4, ratePerDayUsd: 120, totalUsd: 480 });
    expect(result.totalDemurrageUsd).toBe(970);
    expect(result.totalDemurrageEgp).toBeCloseTo(970 * 51.5, 5);
  });

  it('respects an agreed free-days override', () => {
    const result = calculateDemurrageDetention({
      containerNumber: 'MSCU9041280',
      containerType: '20GP' as ContainerType,
      shippingLine: 'MSC',
      dischargedAt,
      gatedOutAt: '2026-09-21T00:00:00Z', // 20 days, agreed 18 free
      agreedFreeDays: 18,
    });

    expect(result.freeDays).toBe(18);
    expect(result.chargeableDays).toBe(2);
    expect(result.totalDemurrageUsd).toBe(70); // 2 * $35 (20ft tier 1)
  });

  it('falls back to MSC rules for an unknown shipping line', () => {
    const result = calculateDemurrageDetention({
      containerNumber: 'XXXX1234567',
      containerType: '20GP' as ContainerType,
      shippingLine: 'MYSTERY LINE',
      dischargedAt,
      gatedOutAt: '2026-09-13T00:00:00Z', // 12 days, 14 free
    });

    expect(result.chargeableDays).toBe(0);
    expect(result.totalDemurrageUsd).toBe(0);
  });
});

describe('calculatePortTerminalStorage', () => {
  it('uses the Egyptian 8 free days standard and charges 850 EGP/day for 40ft', () => {
    const result = calculatePortTerminalStorage({
      containerType: '40HQ' as ContainerType,
      dischargedAt: '2026-09-01T00:00:00Z',
      gatedOutAt: '2026-09-15T00:00:00Z', // 14 days, 8 free -> 6 chargeable
    });

    expect(result.freeDays).toBe(8);
    expect(result.chargeableDays).toBe(6);
    expect(result.ratePerDayEgp).toBe(850);
    expect(result.totalStorageEgp).toBe(5100);
    expect(result.isOverdue).toBe(true);
  });

  it('charges 450 EGP/day for 20ft containers', () => {
    const result = calculatePortTerminalStorage({
      containerType: '20GP' as ContainerType,
      dischargedAt: '2026-09-01T00:00:00Z',
      gatedOutAt: '2026-09-15T00:00:00Z',
    });

    expect(result.ratePerDayEgp).toBe(450);
    expect(result.totalStorageEgp).toBe(2700);
  });

  it('is not overdue within the free window', () => {
    const result = calculatePortTerminalStorage({
      containerType: '20GP' as ContainerType,
      dischargedAt: '2026-09-01T00:00:00Z',
      gatedOutAt: '2026-09-05T00:00:00Z',
    });

    expect(result.isOverdue).toBe(false);
    expect(result.totalStorageEgp).toBe(0);
  });
});

describe('getCarrierTrackingUrl', () => {
  it('routes MSC by carrier name', () => {
    expect(getCarrierTrackingUrl('MSC', 'MSCU9041280')).toContain('msc.com');
  });

  it('routes Maersk by B/L prefix when carrier is unknown', () => {
    expect(getCarrierTrackingUrl('', 'MAEU9041280')).toContain('maersk.com');
  });

  it('routes CMA CGM, COSCO, Hapag-Lloyd and ONE', () => {
    expect(getCarrierTrackingUrl('CMA CGM', 'CMAU1234567')).toContain('cma-cgm.com');
    expect(getCarrierTrackingUrl('COSCO', 'CBHU1234567')).toContain('coscoshipping.com');
    expect(getCarrierTrackingUrl('Hapag-Lloyd', 'HLXU1234567')).toContain('hapag-lloyd.com');
    expect(getCarrierTrackingUrl('ONE', 'ONEU1234567')).toContain('one-line.com');
  });

  it('encodes the tracking number', () => {
    expect(getCarrierTrackingUrl('MSC', 'MSCU 904 1280')).toContain('MSCU%20904%201280');
  });

  it('falls back to track-trace for unknown carriers and prefixes', () => {
    expect(getCarrierTrackingUrl('Unknown', 'ZZZU1234567')).toContain('track-trace.com');
  });
});
