import { PricingService } from './pricing.service';
import { PrismaService } from '../../database/prisma.service';

describe('PricingService', () => {
  let service: PricingService;
  let prisma: { chargeItem: { findMany: jest.Mock; findFirst: jest.Mock; create: jest.Mock } };

  const CHARGE_ITEMS = [
    {
      id: 'ci-ocean-1',
      code: 'TARIFF-MSCU-000001',
      nameEn: 'MSC',
      nameAr: 'MSC',
      category: 'ocean',
      defaultCurrency: 'USD',
      defaultPrice: 2450,
      defaultSellPrice: 2850,
      isActive: true,
      notes: 'tariff:{"category":"ocean","carrierCode":"MSCU","originPortCode":"CNNGB","originPortName":"Ningbo Port","destinationPortCode":"EGALY","destinationPortName":"Alexandria Port","containerType":"40HQ","transitDaysEstimated":26,"freeDaysAllowed":14,"validFrom":"2026-09-01","validTo":"2026-10-15"}',
    },
    {
      id: 'ci-inland-1',
      code: 'TARIFF-TRUCK-000002',
      nameEn: 'Inland Fleet',
      nameAr: 'الأسطول البري',
      category: 'inland',
      defaultCurrency: 'EGP',
      defaultPrice: 11000,
      defaultSellPrice: 13500,
      isActive: true,
      notes: 'tariff:{"category":"inland","carrierCode":"TRUCK-EGY","originPortCode":"EGALY","originPortName":"Alexandria Port","destinationPortCode":"6OCT","destinationPortName":"6th of October","containerType":"40HQ","transitDaysEstimated":1,"freeDaysAllowed":2,"validFrom":"2026-01-01","validTo":"2026-12-31"}',
    },
    {
      id: 'ci-customs-1',
      code: 'TARIFF-CUST-000003',
      nameEn: 'Customs Clearance',
      nameAr: 'التخليص الجمركي',
      category: 'customs',
      defaultCurrency: 'EGP',
      defaultPrice: 4000,
      defaultSellPrice: 6500,
      isActive: true,
      notes: 'tariff:{"category":"customs","carrierCode":"CUST-CLEAR","originPortCode":"EGALY","originPortName":"Alexandria Port","destinationPortCode":"EGALY","destinationPortName":"Alexandria Customs","containerType":"40HQ","transitDaysEstimated":3,"freeDaysAllowed":14,"validFrom":"2026-01-01","validTo":"2026-12-31"}',
    },
  ];

  beforeEach(() => {
    prisma = {
      chargeItem: {
        findMany: jest.fn().mockResolvedValue(CHARGE_ITEMS),
        findFirst: jest.fn().mockImplementation(async ({ where }) =>
          CHARGE_ITEMS.find((c) => c.id === where.id && c.isActive) || null,
        ),
        create: jest.fn().mockImplementation(async ({ data }) => ({
          id: 'ci-new-1',
          code: data.code,
          nameEn: data.nameEn,
          nameAr: data.nameAr,
          category: data.category,
          defaultCurrency: data.defaultCurrency,
          defaultPrice: data.defaultPrice,
          defaultSellPrice: data.defaultSellPrice,
          isActive: true,
          notes: data.notes,
        })),
      },
    };
    service = new PricingService(prisma as unknown as PrismaService);
  });

  describe('getTariffs', () => {
    it('returns all tariffs when no filter is given', async () => {
      const result = await service.getTariffs('tenant-1');
      expect(result).toHaveLength(3);
    });

    it('filters by category', async () => {
      const result = await service.getTariffs('tenant-1', { category: 'ocean' });
      expect(result).toHaveLength(1);
      expect(result[0].carrierCode).toBe('MSCU');
    });

    it('filters by container type', async () => {
      const result = await service.getTariffs('tenant-1', { containerType: '20GP' });
      expect(result).toHaveLength(0);
    });

    it('filters by carrier code case-insensitively as a partial match', async () => {
      const result = await service.getTariffs('tenant-1', { carrierCode: 'msc' });
      expect(result).toHaveLength(1);
      expect(result[0].carrierCode).toBe('MSCU');
    });

    it('filters by origin port code', async () => {
      const result = await service.getTariffs('tenant-1', { origin: 'CNNGB' });
      expect(result).toHaveLength(1);
      expect(result[0].carrierCode).toBe('MSCU');
    });

    it('filters by destination port name fragment', async () => {
      const result = await service.getTariffs('tenant-1', { destination: 'alexandria' });
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((t) => t.destinationPortName.toLowerCase().includes('alexandria'))).toBe(true);
    });
  });

  describe('getTariffById', () => {
    it('finds a tariff by id', async () => {
      const tariff = await service.getTariffById('tenant-1', 'ci-ocean-1');
      expect(tariff).not.toBeNull();
      expect(tariff!.carrierCode).toBe('MSCU');
    });

    it('returns null for an unknown id', async () => {
      expect(await service.getTariffById('tenant-1', 'nope')).toBeNull();
    });
  });

  describe('createTariff', () => {
    it('computes the profit margin from buy and sell rates', async () => {
      const created = await service.createTariff('tenant-1', {
        category: 'ocean',
        carrierCode: 'MAEU',
        buyRate: 2000,
        sellRate: 2500,
      });

      expect(created.profitMarginPercent).toBe(25.0);
      expect(created.isActive).toBe(true);
      expect(prisma.chargeItem.create).toHaveBeenCalled();
    });

    it('falls back to zero margin when buy rate is missing or zero', async () => {
      const created = await service.createTariff('tenant-1', { sellRate: 2500 });
      expect(created.buyRate).toBe(0);
      expect(created.profitMarginPercent).toBe(0);
    });

    it('applies sensible defaults for unspecified fields', async () => {
      const created = await service.createTariff('tenant-1', {});
      expect(created.category).toBe('ocean');
      expect(created.currency).toBe('USD');
      expect(created.containerType).toBe('40HQ');
      expect(created.transitDaysEstimated).toBe(25);
      expect(created.freeDaysAllowed).toBe(14);
    });
  });

  describe('calculateQuoteEstimate', () => {
    it('prices ocean freight only by default', async () => {
      const estimate = await service.calculateQuoteEstimate('tenant-1', {
        originPortCode: 'CNNGB',
        destinationPortCode: 'EGALY',
        containerType: '40HQ',
        quantity: 2,
      });

      expect(estimate.oceanCost).toBe(4900); // 2450 * 2
      expect(estimate.oceanSell).toBe(5700); // 2850 * 2
      expect(estimate.clearanceCost).toBe(0);
      expect(estimate.inlandCost).toBe(0);
      expect(estimate.totalCostUsd).toBe(4900);
      expect(estimate.totalSellUsd).toBe(5700);
      expect(estimate.totalProfitUsd).toBe(800);
      expect(estimate.estimatedTransitDays).toBe(26);
    });

    it('adds clearance and inland legs converted from EGP when requested', async () => {
      const estimate = await service.calculateQuoteEstimate('tenant-1', {
        originPortCode: 'CNNGB',
        destinationPortCode: 'EGALY',
        containerType: '40HQ',
        quantity: 1,
        includeClearance: true,
        includeInland: true,
      });

      expect(estimate.clearanceCost).toBe(80); // 4000 / 50
      expect(estimate.clearanceSell).toBe(130); // 6500 / 50
      expect(estimate.inlandCost).toBe(220); // 11000 / 50
      expect(estimate.inlandSell).toBe(270); // 13500 / 50
      expect(estimate.totalCostUsd).toBe(2450 + 80 + 220);
      expect(estimate.totalSellUsd).toBe(2850 + 130 + 270);
      expect(estimate.totalProfitUsd).toBe(estimate.totalSellUsd - estimate.totalCostUsd);
    });

    it('treats quantity below 1 as 1', async () => {
      const estimate = await service.calculateQuoteEstimate('tenant-1', {
        originPortCode: 'CNNGB',
        destinationPortCode: 'EGALY',
        containerType: '40HQ',
        quantity: 0,
      });

      expect(estimate.oceanCost).toBe(2450);
    });

    it('throws NotFound when no ocean tariff exists at all', async () => {
      prisma.chargeItem.findMany.mockResolvedValue([]);
      await expect(
        service.calculateQuoteEstimate('tenant-1', {
          originPortCode: 'XXXXX',
          destinationPortCode: 'YYYYY',
          containerType: '40HQ',
          quantity: 1,
        }),
      ).rejects.toThrow('No ocean tariff found');
    });
  });
});
