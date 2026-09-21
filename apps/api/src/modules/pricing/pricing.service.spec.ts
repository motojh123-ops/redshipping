import { PricingService } from './pricing.service';
import { DataStoreService } from '../../database/data-store.service';
import { PrismaService } from '../../database/prisma.service';

describe('PricingService', () => {
  let service: PricingService;
  let dataStore: { getItems: jest.Mock; saveItem: jest.Mock };

  const TARIFFS = [
    {
      id: 'prc-ocean-1',
      category: 'ocean',
      carrierCode: 'MSCU',
      carrierName: 'MSC',
      originPortCode: 'CNNGB',
      originPortName: 'Ningbo Port',
      destinationPortCode: 'EGALY',
      destinationPortName: 'Alexandria Port',
      containerType: '40HQ',
      currency: 'USD',
      buyRate: 2450,
      sellRate: 2850,
      profitMarginPercent: 16.3,
      transitDaysEstimated: 26,
      freeDaysAllowed: 14,
      validFrom: '2026-09-01',
      validTo: '2026-10-15',
      isActive: true,
    },
    {
      id: 'prc-inland-1',
      category: 'inland',
      carrierCode: 'TRUCK-EGY',
      carrierName: 'Inland Fleet',
      originPortCode: 'EGALY',
      originPortName: 'Alexandria Port',
      destinationPortCode: '6OCT',
      destinationPortName: '6th of October',
      containerType: '40HQ',
      currency: 'EGP',
      buyRate: 11000,
      sellRate: 13500,
      profitMarginPercent: 22.7,
      transitDaysEstimated: 1,
      freeDaysAllowed: 2,
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
      isActive: true,
    },
    {
      id: 'prc-customs-1',
      category: 'customs',
      carrierCode: 'CUST-CLEAR',
      carrierName: 'Customs Clearance',
      originPortCode: 'EGALY',
      originPortName: 'Alexandria Port',
      destinationPortCode: 'EGALY',
      destinationPortName: 'Alexandria Customs',
      containerType: '40HQ',
      currency: 'EGP',
      buyRate: 4000,
      sellRate: 6500,
      profitMarginPercent: 62.5,
      transitDaysEstimated: 3,
      freeDaysAllowed: 14,
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
      isActive: true,
    },
  ];

  beforeEach(() => {
    dataStore = {
      getItems: jest.fn().mockResolvedValue(TARIFFS),
      saveItem: jest.fn().mockImplementation(async (_t, _k, _id, item) => item),
    };
    service = new PricingService({} as PrismaService, dataStore as unknown as DataStoreService);
  });

  describe('getTariffs', () => {
    it('returns all tariffs when no filter is given', async () => {
      const result = await service.getTariffs('tenant-1');
      expect(result).toHaveLength(3);
    });

    it('filters by category', async () => {
      const result = await service.getTariffs('tenant-1', { category: 'ocean' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('prc-ocean-1');
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
      expect(result[0].id).toBe('prc-ocean-1');
    });

    it('filters by destination port name fragment', async () => {
      const result = await service.getTariffs('tenant-1', { destination: 'alexandria' });
      expect(result.map((t) => t.id)).toContain('prc-ocean-1');
      expect(result.every((t) => t.destinationPortName.toLowerCase().includes('alexandria'))).toBe(true);
    });
  });

  describe('getTariffById', () => {
    it('finds a tariff by id', async () => {
      const tariff = await service.getTariffById('tenant-1', 'prc-ocean-1');
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
      expect(dataStore.saveItem).toHaveBeenCalledWith('tenant-1', 'pricing_tariffs', created.id, created);
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
      const estimate = await service.calculateQuoteEstimate({
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

    it('adds clearance and inland legs at EGP 50 per USD when requested', async () => {
      const estimate = await service.calculateQuoteEstimate({
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
      const estimate = await service.calculateQuoteEstimate({
        originPortCode: 'CNNGB',
        destinationPortCode: 'EGALY',
        containerType: '40HQ',
        quantity: 0,
      });

      expect(estimate.oceanCost).toBe(2450);
    });

    it('falls back to the first tariff when no route matches', async () => {
      const estimate = await service.calculateQuoteEstimate({
        originPortCode: 'XXXXX',
        destinationPortCode: 'YYYYY',
        containerType: '40HQ',
        quantity: 1,
      });

      // First tariff in the list is the MSC ocean one
      expect(estimate.oceanCost).toBe(2450);
      expect(estimate.estimatedTransitDays).toBe(26);
    });
  });
});
