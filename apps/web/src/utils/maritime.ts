/**
 * BANNA Maritime & Logistics Domain Engine
 * Standardized Ports, UN/LOCODEs, Container ISO 6346 Validation,
 * Nautical Distance, Voyage Transit Estimation, and Currencies.
 */

import currency from 'currency.js';
import Decimal from 'decimal.js';
import { getDistance } from 'geolib';
import {
  PortDefinition,
  MaritimeRoute,
  ContainerIsoValidationResult,
  CurrencyDefinition,
  DemurrageCalculationResult,
  ContainerType,
} from '@banna/shared-types';

import {
  WORLD_PORTS,
  PORT_REGIONS_ORDER,
  getAllPortsList,
  getPortsGroupedByRegion,
  searchPorts,
  getPortByCode,
  type PortRegionGroup,
} from '../data/worldPorts';

// ==========================================
// 1. GLOBAL & EGYPTIAN PORTS REGISTRY (UN/LOCODE)
// ==========================================

export const PORTS_REGISTRY: Record<string, PortDefinition> = WORLD_PORTS;
export {
  WORLD_PORTS,
  PORT_REGIONS_ORDER,
  getAllPortsList,
  getPortsGroupedByRegion,
  searchPorts,
  getPortByCode,
  type PortRegionGroup,
};

// ==========================================
// 2. CONTAINER ISO 6346 VALIDATOR (Check-digit algorithm)
// ==========================================

/**
 * ISO 6346 character conversion matrix:
 * Letters A to Z mapped to integer values (multiples of 11: 11, 22, 33 are omitted).
 */
const ISO_LETTER_VALUES: Record<string, number> = {
  A: 10, B: 12, C: 13, D: 14, E: 15, F: 16, G: 17, H: 18, I: 19, J: 20,
  K: 21, L: 23, M: 24, N: 25, O: 26, P: 27, Q: 28, R: 29, S: 30, T: 31,
  U: 32, V: 34, W: 35, X: 36, Y: 37, Z: 38,
};

/**
 * Validates any container number according to ISO 6346.
 * Example: 'MSCU9041280' -> valid
 * Structure: 4 letters (3 owner + 1 category) + 6 serial digits + 1 check digit
 */
export function validateContainerIso6346(input: string): ContainerIsoValidationResult {
  const clean = input.trim().toUpperCase().replace(/[\s-]/g, '');

  if (!clean || clean.length !== 11) {
    return {
      rawInput: input,
      isValid: false,
      errorMessage: 'Container number must be exactly 11 characters (e.g. MSCU9041280)',
    };
  }

  const ownerCode = clean.slice(0, 3);
  const category = clean.slice(3, 4) as 'U' | 'J' | 'Z';
  const serialNumber = clean.slice(4, 10);
  const givenCheckDigit = parseInt(clean.slice(10, 11), 10);

  // Validate format: 4 uppercase letters + 7 digits
  if (!/^[A-Z]{3}[UJZ]\d{7}$/.test(clean)) {
    return {
      rawInput: input,
      isValid: false,
      ownerCode,
      equipmentCategory: category,
      serialNumber,
      checkDigit: givenCheckDigit,
      errorMessage: 'Invalid format: Must be 3-letter owner code + U/J/Z category + 6 digits + 1 check digit',
    };
  }

  // Calculate check digit: sum of (char_value * 2^index) for index 0 to 9
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const char = clean[i];
    let val: number;
    if (/[A-Z]/.test(char)) {
      val = ISO_LETTER_VALUES[char] || 0;
    } else {
      val = parseInt(char, 10);
    }
    sum += val * Math.pow(2, i);
  }

  const remainder = sum % 11;
  const calculatedCheckDigit = remainder === 10 ? 0 : remainder;
  const isValid = calculatedCheckDigit === givenCheckDigit;

  return {
    rawInput: input,
    isValid,
    ownerCode,
    equipmentCategory: category,
    serialNumber,
    checkDigit: givenCheckDigit,
    calculatedCheckDigit,
    errorMessage: isValid ? undefined : `Check digit mismatch: Given ${givenCheckDigit}, expected ${calculatedCheckDigit}`,
  };
}

// ==========================================
// 3. MARITIME DISTANCE & TRANSIT ESTIMATOR
// ==========================================

const METERS_PER_NAUTICAL_MILE = 1852;

/**
 * Calculates great-circle nautical distance (NM) between two coordinates.
 */
export function calculateNauticalMiles(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const meters = getDistance(
    { latitude: from.lat, longitude: from.lng },
    { latitude: to.lat, longitude: to.lng }
  );
  return Math.round(meters / METERS_PER_NAUTICAL_MILE);
}

/**
 * Estimates voyage transit time in days given nautical miles, cruising speed in knots,
 * and optional waterway wait time (e.g. Suez Canal convoy).
 */
export function estimateVoyageTransitDays(
  nauticalMiles: number,
  speedKnots: number = 18,
  canalWaitHours: number = 16
): { transitHours: number; transitDays: number; formatted: string } {
  const sailingHours = nauticalMiles / Math.max(speedKnots, 1);
  const totalHours = Math.round(sailingHours + canalWaitHours);
  const transitDays = Math.ceil(totalHours / 24);

  return {
    transitHours: totalHours,
    transitDays,
    formatted: `${transitDays} days (~${totalHours} hrs at ${speedKnots} kts)`,
  };
}

/**
 * Convenience helper to estimate transit days directly between two port UN/LOCODEs.
 */
export function calculateSeaTransitDays(originCode: string, destCode: string): number {
  const origin = getPortByCode(originCode);
  const dest = getPortByCode(destCode);
  if (!origin || !dest) return 0;
  const miles = calculateNauticalMiles(origin.coordinates, dest.coordinates);
  return estimateVoyageTransitDays(miles).transitDays;
}

// ==========================================
// 4. REALISTIC MARITIME SHIPPING LANES
// ==========================================

export const MARITIME_TRADE_LANES: MaritimeRoute[] = [
  {
    id: 'LANE-FAR-EAST-EGALY',
    originUnlocode: 'CNNGB',
    destinationUnlocode: 'EGALY',
    nauticalMiles: 7850,
    standardTransitDays: 22,
    waypoints: [
      { name: 'Ningbo Port', lat: 29.88, lng: 121.57, description: 'Departure Origin' },
      { name: 'Taiwan Strait', lat: 24.20, lng: 119.50, description: 'Southward passage' },
      { name: 'Malacca Strait', lat: 2.20, lng: 102.15, description: 'Bunkering Singapore Hub' },
      { name: 'Indian Ocean Open Sea', lat: 5.50, lng: 80.50, description: 'Cruising speed 18-22 kts' },
      { name: 'Gulf of Aden / Bab el Mandeb', lat: 12.60, lng: 43.40, description: 'Naval escort checkpoint' },
      { name: 'Red Sea Nav Corridor', lat: 21.00, lng: 38.00, description: 'Northbound toward Suez' },
      { name: 'Suez Canal (Sokhna / Port Said)', lat: 29.95, lng: 32.55, description: 'Northbound convoy transit' },
      { name: 'Alexandria Anchorage', lat: 31.25, lng: 29.80, description: 'Destination Terminal Berth' },
    ],
  },
  {
    id: 'LANE-MED-NLRTM-EGALY',
    originUnlocode: 'NLRTM',
    destinationUnlocode: 'EGALY',
    nauticalMiles: 3100,
    standardTransitDays: 9,
    waypoints: [
      { name: 'Rotterdam Maasvlakte', lat: 51.95, lng: 4.12, description: 'North Sea origin' },
      { name: 'English Channel', lat: 50.00, lng: -2.00, description: 'Dover Strait traffic separation' },
      { name: 'Bay of Biscay', lat: 45.00, lng: -6.00, description: 'Atlantic transit' },
      { name: 'Strait of Gibraltar', lat: 35.95, lng: -5.60, description: 'Entering Mediterranean Sea' },
      { name: 'Malta Channel', lat: 36.00, lng: 14.50, description: 'Central Med corridor' },
      { name: 'Alexandria Approach', lat: 31.18, lng: 29.86, description: 'Berthing at ACHT / TMT' },
    ],
  },
];

// ==========================================
// 5. MULTI-CURRENCY & CENTRAL BANK OF EGYPT (CBE) ENGINE
// ==========================================

export const SUPPORTED_CURRENCIES: Record<string, CurrencyDefinition> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    nameAr: 'دولار أمريكي',
    rateToEgp: 51.50,
    rateToUsd: 1.0,
    decimals: 2,
    isBase: true,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    nameAr: 'يورو أوروبي',
    rateToEgp: 55.80,
    rateToUsd: 1.083,
    decimals: 2,
  },
  EGP: {
    code: 'EGP',
    symbol: 'EGP',
    name: 'Egyptian Pound',
    nameAr: 'جنيه مصري',
    rateToEgp: 1.0,
    rateToUsd: 0.0194,
    decimals: 2,
  },
  AED: {
    code: 'AED',
    symbol: 'AED',
    name: 'UAE Dirham',
    nameAr: 'درهم إماراتي',
    rateToEgp: 14.02,
    rateToUsd: 0.272,
    decimals: 2,
  },
  SAR: {
    code: 'SAR',
    symbol: 'SAR',
    name: 'Saudi Riyal',
    nameAr: 'ريال سعودي',
    rateToEgp: 13.73,
    rateToUsd: 0.266,
    decimals: 2,
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    nameAr: 'جنيه استرليني',
    rateToEgp: 65.20,
    rateToUsd: 1.266,
    decimals: 2,
  },
  CNY: {
    code: 'CNY',
    symbol: '¥',
    name: 'Chinese Yuan',
    nameAr: 'يوان صيني',
    rateToEgp: 7.12,
    rateToUsd: 0.138,
    decimals: 2,
  },
};

/**
 * Exact monetary conversion without floating point precision issues.
 */
export function convertCurrency(
  amount: number,
  fromCode: string,
  toCode: string,
  customRates?: Record<string, number>
): number {
  if (fromCode === toCode) return amount;

  const fromCurr = SUPPORTED_CURRENCIES[fromCode];
  const toCurr = SUPPORTED_CURRENCIES[toCode];

  if (!fromCurr || !toCurr) return amount;

  // Convert via EGP base or custom rates
  const fromRateToEgp = customRates?.[fromCode] ?? fromCurr.rateToEgp;
  const toRateToEgp = customRates?.[toCode] ?? toCurr.rateToEgp;

  // amount * (fromRate / toRate)
  const egpTotal = new Decimal(amount).times(fromRateToEgp);
  const converted = egpTotal.dividedBy(toRateToEgp);

  return currency(converted.toNumber(), { precision: toCurr.decimals }).value;
}

/**
 * Dual Currency Display Formatter:
 * Example: "$1,450.00 / 74,675.00 EGP"
 */
export function formatDualCurrency(amountUsd: number, usdToEgpRate: number = 51.50): string {
  const formattedUsd = currency(amountUsd, { symbol: '$', precision: 2 }).format();
  const egpAmount = new Decimal(amountUsd).times(usdToEgpRate).toNumber();
  const formattedEgp = currency(egpAmount, { symbol: '', precision: 2 }).format() + ' EGP';
  return `${formattedUsd} / ${formattedEgp}`;
}

// ==========================================
// 6. DEMURRAGE & DETENTION (D&D) ENGINE
// ==========================================

export interface ShippingLineDemurrageRule {
  lineCode: string;
  defaultFreeDays: number;
  tiers: { maxDays: number; rateUsd20: number; rateUsd40: number }[];
}

export const SHIPPING_LINE_DD_RULES: Record<string, ShippingLineDemurrageRule> = {
  MSC: {
    lineCode: 'MSC',
    defaultFreeDays: 14,
    tiers: [
      { maxDays: 7, rateUsd20: 35, rateUsd40: 70 },
      { maxDays: 14, rateUsd20: 60, rateUsd40: 120 },
      { maxDays: 999, rateUsd20: 100, rateUsd40: 200 },
    ],
  },
  MAERSK: {
    lineCode: 'MAERSK',
    defaultFreeDays: 14,
    tiers: [
      { maxDays: 7, rateUsd20: 40, rateUsd40: 80 },
      { maxDays: 14, rateUsd20: 75, rateUsd40: 150 },
      { maxDays: 999, rateUsd20: 120, rateUsd40: 240 },
    ],
  },
  CMA_CGM: {
    lineCode: 'CMA_CGM',
    defaultFreeDays: 14,
    tiers: [
      { maxDays: 7, rateUsd20: 35, rateUsd40: 70 },
      { maxDays: 14, rateUsd20: 65, rateUsd40: 130 },
      { maxDays: 999, rateUsd20: 110, rateUsd40: 220 },
    ],
  },
  HAPAG_LLOYD: {
    lineCode: 'HAPAG_LLOYD',
    defaultFreeDays: 14,
    tiers: [
      { maxDays: 7, rateUsd20: 40, rateUsd40: 80 },
      { maxDays: 14, rateUsd20: 70, rateUsd40: 140 },
      { maxDays: 999, rateUsd20: 115, rateUsd40: 230 },
    ],
  },
  COSCO: {
    lineCode: 'COSCO',
    defaultFreeDays: 21,
    tiers: [
      { maxDays: 7, rateUsd20: 30, rateUsd40: 60 },
      { maxDays: 14, rateUsd20: 55, rateUsd40: 110 },
      { maxDays: 999, rateUsd20: 95, rateUsd40: 190 },
    ],
  },
  ONE: {
    lineCode: 'ONE',
    defaultFreeDays: 14,
    tiers: [
      { maxDays: 7, rateUsd20: 35, rateUsd40: 70 },
      { maxDays: 14, rateUsd20: 65, rateUsd40: 130 },
      { maxDays: 999, rateUsd20: 105, rateUsd40: 210 },
    ],
  },
};

/**
 * Calculates Demurrage & Detention tiered charges for any container.
 */
export function calculateDemurrageDetention(params: {
  containerNumber: string;
  containerType: ContainerType;
  shippingLine: string;
  dischargedAt: Date | string;
  gatedOutAt?: Date | string;
  agreedFreeDays?: number;
  egpExchangeRate?: number;
}): DemurrageCalculationResult {
  const {
    containerNumber,
    containerType,
    shippingLine,
    dischargedAt,
    gatedOutAt,
    agreedFreeDays,
    egpExchangeRate = 51.50,
  } = params;

  const rule = SHIPPING_LINE_DD_RULES[shippingLine.toUpperCase()] || SHIPPING_LINE_DD_RULES.MSC;
  const freeDays = agreedFreeDays ?? rule.defaultFreeDays;

  const startDate = new Date(dischargedAt);
  const endDate = gatedOutAt ? new Date(gatedOutAt) : new Date();

  const diffTime = Math.max(0, endDate.getTime() - startDate.getTime());
  const totalDaysInPort = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const chargeableDays = Math.max(0, totalDaysInPort - freeDays);
  const isOverdue = chargeableDays > 0;

  const is40OrHq = containerType.includes('40') || containerType.includes('45');
  const tiersResult = [];
  let remainingChargeable = chargeableDays;
  let totalUsd = 0;

  let currentTierStartDay = 1;
  for (const tier of rule.tiers) {
    if (remainingChargeable <= 0) break;

    const daysInThisTier = Math.min(remainingChargeable, tier.maxDays);
    const ratePerDay = is40OrHq ? tier.rateUsd40 : tier.rateUsd20;
    const tierUsd = daysInThisTier * ratePerDay;
    const tierEgp = new Decimal(tierUsd).times(egpExchangeRate).toNumber();

    tiersResult.push({
      dayRange: `Day ${currentTierStartDay} - ${currentTierStartDay + daysInThisTier - 1}`,
      days: daysInThisTier,
      ratePerDayUsd: ratePerDay,
      totalUsd: tierUsd,
      totalEgp: tierEgp,
    });

    totalUsd += tierUsd;
    remainingChargeable -= daysInThisTier;
    currentTierStartDay += daysInThisTier;
  }

  const totalEgp = new Decimal(totalUsd).times(egpExchangeRate).toNumber();

  return {
    containerNumber,
    containerType,
    dischargedAt: startDate.toISOString(),
    gatedOutAt: gatedOutAt ? new Date(gatedOutAt).toISOString() : undefined,
    freeDays,
    totalDaysInPort,
    chargeableDays,
    isOverdue,
    tiers: tiersResult,
    totalDemurrageUsd: totalUsd,
    totalDemurrageEgp: totalEgp,
    currencyRateApplied: egpExchangeRate,
  };
}

// ==========================================
// 7. PORT TERMINAL STORAGE (أرضيات هيئة الميناء ومحطات الحاويات)
// ==========================================

export interface PortTerminalStorageResult {
  containerNumber?: string;
  terminalName: string;
  freeDays: number;
  daysInYard: number;
  chargeableDays: number;
  isOverdue: boolean;
  ratePerDayEgp: number;
  totalStorageEgp: number;
}

/**
 * Calculates Port Terminal Yard Storage (أرضيات رصيف وساحة محطة الحاويات).
 * Distinct from Shipping Line Demurrage (عوائد تأخير الحاوية للخط الملاحي).
 * Terminal Storage is payable to the port authority / terminal (ACHT, DP World, DCHC) in EGP.
 */
export function calculatePortTerminalStorage(params: {
  containerNumber?: string;
  containerType: ContainerType | string;
  terminalName?: string;
  dischargedAt: Date | string;
  gatedOutAt?: Date | string;
  terminalFreeDays?: number; // Egyptian port standard: 8 free days for general cargo
}): PortTerminalStorageResult {
  const {
    containerNumber,
    containerType,
    terminalName = 'محطة حاويات ميناء الإسكندرية (ACHT)',
    dischargedAt,
    gatedOutAt,
    terminalFreeDays = 8,
  } = params;

  const startDate = new Date(dischargedAt);
  const endDate = gatedOutAt ? new Date(gatedOutAt) : new Date();

  const diffTime = Math.max(0, endDate.getTime() - startDate.getTime());
  const daysInYard = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const chargeableDays = Math.max(0, daysInYard - terminalFreeDays);
  const isOverdue = chargeableDays > 0;

  // Standard Egyptian terminal daily tariffs (40ft vs 20ft)
  const is40OrHq = String(containerType).includes('40') || String(containerType).includes('45');
  const ratePerDayEgp = is40OrHq ? 850 : 450;
  const totalStorageEgp = chargeableDays * ratePerDayEgp;

  return {
    containerNumber,
    terminalName,
    freeDays: terminalFreeDays,
    daysInYard,
    chargeableDays,
    isOverdue,
    ratePerDayEgp,
    totalStorageEgp,
  };
}

/**
 * Generates direct official carrier tracking URL for B/L or Container Number.
 * 100% Free - connects directly to the line's official web tracking interface.
 */
export const getCarrierTrackingUrl = (carrier: string, trackingNumber: string): string => {
  const c = (carrier || '').toUpperCase();
  const q = encodeURIComponent((trackingNumber || '').trim());
  if (c.includes('MSC') || q.startsWith('MEDU') || q.startsWith('MSCU')) {
    return `https://www.msc.com/en/track-a-shipment?trackingNumber=${q}`;
  }
  if (c.includes('MAERSK') || q.startsWith('MSKU') || q.startsWith('MAEU')) {
    return `https://www.maersk.com/tracking/${q}`;
  }
  if (c.includes('CMA') || c.includes('CGM') || q.startsWith('CMAU')) {
    return `https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=Container&SearchValue=${q}`;
  }
  if (c.includes('COSCO') || q.startsWith('COSU') || q.startsWith('CBHU')) {
    return `https://elines.coscoshipping.com/ebusiness/cargoTracking?trackingType=CONTAINER&number=${q}`;
  }
  if (c.includes('HAPAG') || q.startsWith('HLXU') || q.startsWith('HLCU')) {
    return `https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html?container=${q}`;
  }
  if (c.includes('EVERGREEN') || q.startsWith('EGLV') || q.startsWith('EMCU')) {
    return `https://www.shipmentlink.com/servlet/TTrk_Tracking?quick_type=CONTAINER&quick_no=${q}`;
  }
  if (c.includes('ONE') || q.startsWith('ONEU')) {
    return `https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking?ctracType=cntr&ctracNo=${q}`;
  }
  return `https://www.track-trace.com/container`;
};

