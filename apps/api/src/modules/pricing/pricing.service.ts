import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

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

/**
 * Pricing tariffs persisted on the real ChargeItem master (tenant-scoped).
 * Tariff fields that don't map 1:1 onto ChargeItem columns are encoded in
 * the notes column as `tariff:{json}` so pricing stays in PostgreSQL.
 */
const TARIFF_KEY = 'tariff:';

interface TariffMeta {
  category: 'ocean' | 'inland' | 'air' | 'customs';
  carrierCode: string;
  originPortCode: string;
  originPortName: string;
  destinationPortCode: string;
  destinationPortName: string;
  containerType: string;
  transitDaysEstimated: number;
  freeDaysAllowed: number;
  validFrom: string;
  validTo: string;
}

function defaultMeta(): TariffMeta {
  return {
    category: 'ocean',
    carrierCode: 'GENERIC',
    originPortCode: '—',
    originPortName: '—',
    destinationPortCode: '—',
    destinationPortName: '—',
    containerType: '40HQ',
    transitDaysEstimated: 25,
    freeDaysAllowed: 14,
    validFrom: new Date().toISOString().slice(0, 10),
    validTo: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
  };
}

function toTariff(ci: any): PricingTariff {
  let meta: TariffMeta = defaultMeta();
  try {
    const line = (ci.notes || '').split('\n').find((l: string) => l.startsWith(TARIFF_KEY));
    if (line) meta = { ...meta, ...JSON.parse(line.slice(TARIFF_KEY.length)) };
  } catch {
    // keep defaults
  }
  const buy = Number(ci.defaultPrice) || 0;
  const sell = Number(ci.defaultSellPrice ?? ci.defaultPrice) || 0;
  return {
    id: ci.id,
    category: meta.category,
    carrierCode: meta.carrierCode || ci.code,
    carrierName: ci.nameEn,
    originPortCode: meta.originPortCode,
    originPortName: meta.originPortName,
    destinationPortCode: meta.destinationPortCode,
    destinationPortName: meta.destinationPortName,
    containerType: meta.containerType as any,
    currency: (ci.defaultCurrency as 'USD' | 'EUR' | 'EGP') || 'USD',
    buyRate: buy,
    sellRate: sell,
    profitMarginPercent: buy > 0 ? Number((((sell - buy) / buy) * 100).toFixed(1)) : 0,
    transitDaysEstimated: meta.transitDaysEstimated,
    freeDaysAllowed: meta.freeDaysAllowed,
    validFrom: meta.validFrom,
    validTo: meta.validTo,
    remarks: (ci.notes || '').split('\n').filter((l: string) => l && !l.startsWith(TARIFF_KEY)).join(' '),
    isActive: ci.isActive,
  };
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(private prisma: PrismaService) {}

  async getTariffs(tenantId: string, filter?: {
    category?: string;
    carrierCode?: string;
    origin?: string;
    destination?: string;
    containerType?: string;
  }): Promise<PricingTariff[]> {
    const chargeItems = await this.prisma.chargeItem.findMany({
      where: {
        companyId: tenantId,
        isActive: true,
        category: { in: ['ocean', 'inland', 'air', 'customs'] },
      },
      orderBy: { createdAt: 'asc' },
    });

    let tariffs = chargeItems.map(toTariff);

    if (filter?.category) {
      tariffs = tariffs.filter((t) => t.category === filter.category);
    }
    if (filter?.carrierCode) {
      const code = filter.carrierCode.toLowerCase();
      tariffs = tariffs.filter((t) => t.carrierCode.toLowerCase().includes(code));
    }
    if (filter?.origin) {
      const origin = filter.origin.toLowerCase();
      tariffs = tariffs.filter((t) => t.originPortCode === filter.origin || t.originPortName.toLowerCase().includes(origin));
    }
    if (filter?.destination) {
      const dest = filter.destination.toLowerCase();
      tariffs = tariffs.filter((t) => t.destinationPortCode === filter.destination || t.destinationPortName.toLowerCase().includes(dest));
    }
    if (filter?.containerType) {
      tariffs = tariffs.filter((t) => t.containerType === filter.containerType);
    }
    return tariffs;
  }

  async getTariffById(tenantId: string, id: string): Promise<PricingTariff | null> {
    const ci = await this.prisma.chargeItem.findFirst({
      where: { id, companyId: tenantId, isActive: true },
    });
    return ci ? toTariff(ci) : null;
  }

  async createTariff(tenantId: string, dto: any): Promise<PricingTariff> {
    const buyRate = Number(dto.buyRate) || 0;
    const sellRate = Number(dto.sellRate) || 0;
    const profitMargin = buyRate > 0 ? Number((((sellRate - buyRate) / buyRate) * 100).toFixed(1)) : 0;

    const meta: TariffMeta = {
      category: dto.category || 'ocean',
      carrierCode: dto.carrierCode || 'GENERIC',
      originPortCode: dto.originPortCode || '—',
      originPortName: dto.originPortName || '—',
      destinationPortCode: dto.destinationPortCode || '—',
      destinationPortName: dto.destinationPortName || '—',
      containerType: dto.containerType || '40HQ',
      transitDaysEstimated: Number(dto.transitDaysEstimated) || 25,
      freeDaysAllowed: Number(dto.freeDaysAllowed) || 14,
      validFrom: dto.validFrom || new Date().toISOString().slice(0, 10),
      validTo: dto.validTo || new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    };

    const code = `TARIFF-${meta.carrierCode}-${Date.now().toString().slice(-6)}`;
    const ci = await this.prisma.chargeItem.create({
      data: {
        companyId: tenantId,
        code,
        nameEn: dto.carrierName || 'Shipping Line',
        nameAr: dto.carrierName || 'خط ملاحي',
        category: meta.category,
        defaultCurrency: dto.currency || 'USD',
        defaultPrice: buyRate,
        defaultSellPrice: sellRate,
        isActive: true,
        notes: [`${TARIFF_KEY}${JSON.stringify(meta)}`, dto.remarks].filter(Boolean).join('\n'),
      },
    });

    const tariff = toTariff(ci);
    tariff.profitMarginPercent = profitMargin;
    return tariff;
  }

  async calculateQuoteEstimate(tenantId: string, params: {
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
    const tariffs = await this.getTariffs(tenantId);

    // Find ocean match
    const ocean =
      tariffs.find(
        (t) =>
          t.category === 'ocean' &&
          t.originPortCode === params.originPortCode &&
          t.destinationPortCode === params.destinationPortCode &&
          t.containerType === params.containerType,
      ) || tariffs.find((t) => t.category === 'ocean');

    if (!ocean) {
      throw new NotFoundException(
        `No ocean tariff found for ${params.originPortCode} → ${params.destinationPortCode} (${params.containerType}). Add tariffs in the pricing masters first.`,
      );
    }

    const egpUsd = 50; // consolidated EGP→USD conversion for local charges
    const usdOcean = ocean.currency === 'USD' ? ocean : { ...ocean, buyRate: ocean.buyRate / egpUsd, sellRate: ocean.sellRate / egpUsd };

    const oceanCost = usdOcean.buyRate * qty;
    const oceanSell = usdOcean.sellRate * qty;

    let clearanceCost = 0;
    let clearanceSell = 0;
    if (params.includeClearance) {
      const clearance = tariffs.find((t) => t.category === 'customs');
      if (clearance) {
        const cCost = clearance.currency === 'EGP' ? clearance.buyRate / egpUsd : clearance.buyRate;
        const cSell = clearance.currency === 'EGP' ? clearance.sellRate / egpUsd : clearance.sellRate;
        clearanceCost = cCost * qty;
        clearanceSell = cSell * qty;
      }
    }

    let inlandCost = 0;
    let inlandSell = 0;
    if (params.includeInland) {
      const inland = tariffs.find((t) => t.category === 'inland');
      if (inland) {
        const iCost = inland.currency === 'EGP' ? inland.buyRate / egpUsd : inland.buyRate;
        const iSell = inland.currency === 'EGP' ? inland.sellRate / egpUsd : inland.sellRate;
        inlandCost = iCost * qty;
        inlandSell = iSell * qty;
      }
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
