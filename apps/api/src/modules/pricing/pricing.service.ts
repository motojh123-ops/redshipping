import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DataStoreService } from '../../database/data-store.service';

export interface PricingTariff {
  id: string;
  category: 'ocean' | 'inland' | 'air' | 'customs';
  carrierCode: string;
  carrierName: string;
  originPortCode: string;
  originPortName: string;
  destinationPortCode: string;
  destinationPortName: string;
  containerType: '20GP' | '40GP' | '40HQ' | '40RF' | 'LCL' | 'TRUCK';
  currency: 'USD' | 'EUR' | 'EGP';
  buyRate: number;
  sellRate: number;
  profitMarginPercent: number;
  transitDaysEstimated: number;
  freeDaysAllowed: number;
  validFrom: string;
  validTo: string;
  remarks?: string;
  isActive: boolean;
}

const FALLBACK_PRICING_TARIFFS: PricingTariff[] = [
  // Ocean Freight — China to Egypt
  {
    id: 'prc-01',
    category: 'ocean',
    carrierCode: 'MSCU',
    carrierName: 'MSC Mediterranean Shipping',
    originPortCode: 'CNNGB',
    originPortName: 'Ningbo Port (China)',
    destinationPortCode: 'EGALY',
    destinationPortName: 'Alexandria Port (Egypt)',
    containerType: '40HQ',
    currency: 'USD',
    buyRate: 2450,
    sellRate: 2850,
    profitMarginPercent: 16.3,
    transitDaysEstimated: 26,
    freeDaysAllowed: 14,
    validFrom: '2026-09-01',
    validTo: '2026-10-15',
    remarks: 'Direct ocean service via Suez Canal, includes BAF & EBS',
    isActive: true,
  },
  {
    id: 'prc-02',
    category: 'ocean',
    carrierCode: 'MSCU',
    carrierName: 'MSC Mediterranean Shipping',
    originPortCode: 'CNNGB',
    originPortName: 'Ningbo Port (China)',
    destinationPortCode: 'EGALY',
    destinationPortName: 'Alexandria Port (Egypt)',
    containerType: '20GP',
    currency: 'USD',
    buyRate: 1550,
    sellRate: 1850,
    profitMarginPercent: 19.3,
    transitDaysEstimated: 26,
    freeDaysAllowed: 14,
    validFrom: '2026-09-01',
    validTo: '2026-10-15',
    remarks: 'Direct ocean service, 20ft standard dry box',
    isActive: true,
  },
  {
    id: 'prc-03',
    category: 'ocean',
    carrierCode: 'COSU',
    carrierName: 'COSCO Shipping Lines',
    originPortCode: 'CNSHA',
    originPortName: 'Shanghai Port (China)',
    destinationPortCode: 'EGSOK',
    destinationPortName: 'Sokhna Port (Egypt)',
    containerType: '40HQ',
    currency: 'USD',
    buyRate: 2300,
    sellRate: 2700,
    profitMarginPercent: 17.4,
    transitDaysEstimated: 22,
    freeDaysAllowed: 21,
    validFrom: '2026-09-01',
    validTo: '2026-10-31',
    remarks: 'Red Sea Fast Express to Sokhna DP World terminal',
    isActive: true,
  },
  {
    id: 'prc-04',
    category: 'ocean',
    carrierCode: 'MAEU',
    carrierName: 'Maersk Line Egypt',
    originPortCode: 'CNSHA',
    originPortName: 'Shanghai Port (China)',
    destinationPortCode: 'EGDAM',
    destinationPortName: 'Damietta Port (Egypt)',
    containerType: '40HQ',
    currency: 'USD',
    buyRate: 2500,
    sellRate: 2950,
    profitMarginPercent: 18.0,
    transitDaysEstimated: 24,
    freeDaysAllowed: 14,
    validFrom: '2026-09-01',
    validTo: '2026-10-31',
    remarks: 'Direct call to Damietta Container Terminal',
    isActive: true,
  },
  {
    id: 'prc-05',
    category: 'ocean',
    carrierCode: 'HLCU',
    carrierName: 'Hapag-Lloyd Egypt',
    originPortCode: 'CNSHA',
    originPortName: 'Shanghai Port (China)',
    destinationPortCode: 'EGPSD',
    destinationPortName: 'Port Said East (Egypt)',
    containerType: '40HQ',
    currency: 'USD',
    buyRate: 2380,
    sellRate: 2800,
    profitMarginPercent: 17.6,
    transitDaysEstimated: 25,
    freeDaysAllowed: 14,
    validFrom: '2026-09-01',
    validTo: '2026-10-31',
    remarks: 'SCCT East Port Said Express service',
    isActive: true,
  },
  {
    id: 'prc-06',
    category: 'ocean',
    carrierCode: 'CMDU',
    carrierName: 'CMA CGM Shipping Agency',
    originPortCode: 'CNSZX',
    originPortName: 'Shenzhen Port (China)',
    destinationPortCode: 'EGALY',
    destinationPortName: 'Alexandria Port (Egypt)',
    containerType: '40HQ',
    currency: 'USD',
    buyRate: 2400,
    sellRate: 2820,
    profitMarginPercent: 17.5,
    transitDaysEstimated: 27,
    freeDaysAllowed: 21,
    validFrom: '2026-09-01',
    validTo: '2026-10-15',
    remarks: 'BEX service via Malta hub, 21 demurrage free days',
    isActive: true,
  },
  // Inland Haulage in Egypt
  {
    id: 'prc-07',
    category: 'inland',
    carrierCode: 'TRUCK-EGY',
    carrierName: 'أسطول النقل البري المعتمد',
    originPortCode: 'EGALY',
    originPortName: 'Alexandria Port (ميناء الإسكندرية)',
    destinationPortCode: '6OCT',
    destinationPortName: '6th of October Ind. Zone (السادس من أكتوبر)',
    containerType: '40HQ',
    currency: 'EGP',
    buyRate: 11000,
    sellRate: 13500,
    profitMarginPercent: 22.7,
    transitDaysEstimated: 1,
    freeDaysAllowed: 2,
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    remarks: 'Heavy trailer flatbed with GPS tracking and cargo insurance',
    isActive: true,
  },
  {
    id: 'prc-08',
    category: 'inland',
    carrierCode: 'TRUCK-EGY',
    carrierName: 'أسطول النقل البري المعتمد',
    originPortCode: 'EGSOK',
    originPortName: 'Sokhna Port (ميناء السخنة)',
    destinationPortCode: '10RAM',
    destinationPortName: '10th of Ramadan Ind. Zone (العاشر من رمضان)',
    containerType: '40HQ',
    currency: 'EGP',
    buyRate: 9500,
    sellRate: 12000,
    profitMarginPercent: 26.3,
    transitDaysEstimated: 1,
    freeDaysAllowed: 2,
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    remarks: 'Direct highway route via Regional Ring Road',
    isActive: true,
  },
  // Customs Clearance
  {
    id: 'prc-09',
    category: 'customs',
    carrierCode: 'CUST-CLEAR',
    carrierName: 'خدمات التخليص الجمركي الموحدة',
    originPortCode: 'EGALY',
    originPortName: 'Alexandria Port (الإسكندرية)',
    destinationPortCode: 'EGALY',
    destinationPortName: 'Alexandria Customs (جمرك الإسكندرية)',
    containerType: '40HQ',
    currency: 'EGP',
    buyRate: 4000,
    sellRate: 6500,
    profitMarginPercent: 62.5,
    transitDaysEstimated: 3,
    freeDaysAllowed: 14,
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    remarks: 'Full clearance service including ACID upload, Form 46 & inspection',
    isActive: true,
  },
];

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(
    private prisma: PrismaService,
    private dataStore: DataStoreService,
  ) {}

  async getTariffs(tenantId: string, filter?: {
    category?: string;
    carrierCode?: string;
    origin?: string;
    destination?: string;
    containerType?: string;
  }): Promise<PricingTariff[]> {
    const tariffs = await this.dataStore.getItems<PricingTariff>(tenantId, 'pricing_tariffs', FALLBACK_PRICING_TARIFFS);
    let result = tariffs;

    if (filter?.category) {
      result = result.filter((t) => t.category === filter.category);
    }
    if (filter?.carrierCode) {
      const code = filter.carrierCode.toLowerCase();
      result = result.filter((t) => t.carrierCode.toLowerCase().includes(code));
    }
    if (filter?.origin) {
      const origin = filter.origin.toLowerCase();
      result = result.filter((t) => t.originPortCode === filter.origin || t.originPortName.toLowerCase().includes(origin));
    }
    if (filter?.destination) {
      const dest = filter.destination.toLowerCase();
      result = result.filter((t) => t.destinationPortCode === filter.destination || t.destinationPortName.toLowerCase().includes(dest));
    }
    if (filter?.containerType) {
      result = result.filter((t) => t.containerType === filter.containerType);
    }

    return result;
  }

  async getTariffById(tenantId: string, id: string): Promise<PricingTariff | null> {
    const tariffs = await this.dataStore.getItems<PricingTariff>(tenantId, 'pricing_tariffs', FALLBACK_PRICING_TARIFFS);
    return tariffs.find((t) => t.id === id) || null;
  }

  async createTariff(tenantId: string, dto: any): Promise<PricingTariff> {
    const buyRate = Number(dto.buyRate) || 0;
    const sellRate = Number(dto.sellRate) || 0;
    const profitMargin = buyRate > 0 ? Number((((sellRate - buyRate) / buyRate) * 100).toFixed(1)) : 0;

    const newTariff: PricingTariff = {
      id: `prc-${Date.now()}`,
      category: dto.category || 'ocean',
      carrierCode: dto.carrierCode || 'GENERIC',
      carrierName: dto.carrierName || 'Shipping Line',
      originPortCode: dto.originPortCode || 'CNSHA',
      originPortName: dto.originPortName || 'Shanghai Port',
      destinationPortCode: dto.destinationPortCode || 'EGALY',
      destinationPortName: dto.destinationPortName || 'Alexandria Port',
      containerType: dto.containerType || '40HQ',
      currency: dto.currency || 'USD',
      buyRate,
      sellRate,
      profitMarginPercent: profitMargin,
      transitDaysEstimated: Number(dto.transitDaysEstimated) || 25,
      freeDaysAllowed: Number(dto.freeDaysAllowed) || 14,
      validFrom: dto.validFrom || new Date().toISOString().slice(0, 10),
      validTo: dto.validTo || '2026-12-31',
      remarks: dto.remarks || '',
      isActive: true,
    };

    await this.dataStore.saveItem(tenantId, 'pricing_tariffs', newTariff.id, newTariff);
    return newTariff;
  }

  async calculateQuoteEstimate(params: {
    originPortCode: string;
    destinationPortCode: string;
    containerType: string;
    quantity: number;
    includeClearance?: boolean;
    includeInland?: boolean;
  }): Promise<{
    oceanCost: number;
    oceanSell: number;
    clearanceCost: number;
    clearanceSell: number;
    inlandCost: number;
    inlandSell: number;
    totalCostUsd: number;
    totalSellUsd: number;
    totalProfitUsd: number;
    estimatedTransitDays: number;
  }> {
    const qty = Math.max(1, params.quantity || 1);
    const tariffs = await this.dataStore.getItems<PricingTariff>('comp-demo-1', 'pricing_tariffs', FALLBACK_PRICING_TARIFFS);

    // Find ocean match
    const ocean = tariffs.find(
      (t) =>
        t.category === 'ocean' &&
        t.originPortCode === params.originPortCode &&
        t.destinationPortCode === params.destinationPortCode &&
        t.containerType === params.containerType,
    ) || tariffs[0];

    const oceanCost = ocean.buyRate * qty;
    const oceanSell = ocean.sellRate * qty;

    let clearanceCost = 0;
    let clearanceSell = 0;
    if (params.includeClearance) {
      // EGP ~ 50 per USD
      clearanceCost = (4000 * qty) / 50;
      clearanceSell = (6500 * qty) / 50;
    }

    let inlandCost = 0;
    let inlandSell = 0;
    if (params.includeInland) {
      inlandCost = (11000 * qty) / 50;
      inlandSell = (13500 * qty) / 50;
    }

    const totalCostUsd = oceanCost + clearanceCost + inlandCost;
    const totalSellUsd = oceanSell + clearanceSell + inlandSell;
    const totalProfitUsd = totalSellUsd - totalCostUsd;

    return {
      oceanCost,
      oceanSell,
      clearanceCost,
      clearanceSell,
      inlandCost,
      inlandSell,
      totalCostUsd,
      totalSellUsd,
      totalProfitUsd,
      estimatedTransitDays: ocean.transitDaysEstimated,
    };
  }
}
