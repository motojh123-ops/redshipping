import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
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

export interface ItemRate {
  id: string;
  chargeItemId: string;
  chargeItemCode?: string;
  chargeItemNameAr?: string | null;
  chargeItemNameEn?: string;
  currency: string;
  buyRate: number;
  sellRate: number;
}

/** Map a tariff DB row → API shape */
function toTariff(t: any): PricingTariff {
  const buy = Number(t.buyRate) || 0;
  const sell = Number(t.sellRate) || 0;
  return {
    id: t.id,
    category: t.category,
    carrierCode: t.carrierCode,
    carrierName: t.carrierName,
    originPortCode: t.originPortCode,
    originPortName: t.originPortName,
    destinationPortCode: t.destinationPortCode,
    destinationPortName: t.destinationPortName,
    containerType: t.containerType,
    currency: t.currency,
    buyRate: buy,
    sellRate: sell,
    profitMarginPercent: buy > 0 ? Number((((sell - buy) / buy) * 100).toFixed(1)) : 0,
    transitDaysEstimated: t.transitDaysEstimated,
    freeDaysAllowed: t.freeDaysAllowed,
    validFrom: t.validFrom ? new Date(t.validFrom).toISOString().slice(0, 10) : '',
    validTo: t.validTo ? new Date(t.validTo).toISOString().slice(0, 10) : '',
    remarks: t.remarks || undefined,
    isActive: t.isActive,
  };
}

/**
 * Pricing module — the ONLY owner of price data in the system
 * (المواصفة المعتمدة: "فصل التسعير عن المرجعيات").
 * Lane tariffs live in the `tariffs` table; per-charge-item default rates
 * live in `item_default_rates` and prefill quotation/invoice lines.
 * The masters registry (ChargeItem) holds definitions only — no prices.
 */
@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(private prisma: PrismaService) {}

  /** Default rates per charge item — the prefill source for quotation lines */
  async getItemRates(tenantId: string): Promise<ItemRate[]> {
    const rows = await this.prisma.itemDefaultRate.findMany({
      where: { companyId: tenantId },
      include: { chargeItem: { select: { code: true, nameAr: true, nameEn: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r: any) => ({
      id: r.id,
      chargeItemId: r.chargeItemId,
      chargeItemCode: r.chargeItem?.code,
      chargeItemNameAr: r.chargeItem?.nameAr,
      chargeItemNameEn: r.chargeItem?.nameEn,
      currency: r.currency,
      buyRate: Number(r.buyRate) || 0,
      sellRate: Number(r.sellRate) || 0,
    }));
  }

  /** Create or update the default rate of a charge item (pricing module only) */
  async upsertItemRate(tenantId: string, chargeItemId: string, dto: any) {
    const ci = await this.prisma.chargeItem.findFirst({
      where: { id: chargeItemId, companyId: tenantId },
    });
    if (!ci) throw new NotFoundException('Charge item not found');
    const currency = String(dto?.currency || 'USD').toUpperCase().slice(0, 3);
    const buyRate = Number(dto?.buyRate) || 0;
    const sellRate = Number(dto?.sellRate ?? dto?.buyRate) || 0;
    return this.prisma.itemDefaultRate.upsert({
      where: { chargeItemId },
      create: { companyId: tenantId, chargeItemId, currency, buyRate, sellRate },
      update: { currency, buyRate, sellRate },
    });
  }

  async getTariffs(tenantId: string, filter?: {
    category?: string;
    carrierCode?: string;
    origin?: string;
    destination?: string;
    containerType?: string;
  }): Promise<PricingTariff[]> {
    const rows = await this.prisma.tariff.findMany({
      where: { companyId: tenantId },
      orderBy: { createdAt: 'asc' },
    });

    let tariffs = rows.map(toTariff);

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
    const row = await this.prisma.tariff.findFirst({
      where: { id, companyId: tenantId },
    });
    return row ? toTariff(row) : null;
  }

  async createTariff(tenantId: string, dto: any): Promise<PricingTariff> {
    const buyRate = Number(dto.buyRate) || 0;
    const sellRate = Number(dto.sellRate) || Number(dto.buyRate) || 0;
    if (buyRate <= 0) throw new BadRequestException('buyRate must be greater than zero');

    const row = await this.prisma.tariff.create({
      data: {
        companyId: tenantId,
        category: dto.category || 'ocean',
        carrierCode: dto.carrierCode || 'GENERIC',
        carrierName: dto.carrierName || dto.carrierCode || 'Carrier',
        originPortCode: dto.originPortCode || '—',
        originPortName: dto.originPortName || '—',
        destinationPortCode: dto.destinationPortCode || '—',
        destinationPortName: dto.destinationPortName || '—',
        containerType: dto.containerType || '40HQ',
        currency: dto.currency || 'USD',
        buyRate,
        sellRate,
        transitDaysEstimated: Number(dto.transitDaysEstimated) || 25,
        freeDaysAllowed: Number(dto.freeDaysAllowed) || 14,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : new Date(),
        validTo: dto.validTo ? new Date(dto.validTo) : new Date(Date.now() + 365 * 86400000),
        remarks: dto.remarks || null,
        isActive: dto.isActive === undefined ? true : Boolean(dto.isActive),
      },
    });
    return toTariff(row);
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
        `No ocean tariff found for ${params.originPortCode} → ${params.destinationPortCode} (${params.containerType}). Add tariffs in the pricing screen first.`,
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
