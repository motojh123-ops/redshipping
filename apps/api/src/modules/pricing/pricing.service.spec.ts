import { BadRequestException } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PrismaService } from '../../database/prisma.service';

describe('PricingService', () => {
  let service: PricingService;
  let prisma: {
    tariff: { findMany: jest.Mock; findFirst: jest.Mock; create: jest.Mock };
    itemDefaultRate: { findMany: jest.Mock; upsert: jest.Mock };
    chargeItem: { findFirst: jest.Mock };
  };

  const TARIFFS = [
    {
      id: 't-ocean-1',
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
      transitDaysEstimated: 26,
      freeDaysAllowed: 14,
      validFrom: new Date('2026-09-01'),
      validTo: new Date('2026-10-15'),
      remarks: null,
      isActive: true,
    },
    {
      id: 't-inland-1',
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
      transitDaysEstimated: 1,
      freeDaysAllowed: 2,
      validFrom: new Date('2026-01-01'),
      validTo: new Date('2026-12-31'),
      remarks: null,
      isActive: true,
    },
    {
      id: 't-customs-1',
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
      transitDaysEstimated: 3,
      freeDaysAllowed: 14,
      validFrom: new Date('2026-01-01'),
      validTo: new Date('2026-12-31'),
      remarks: null,
      isActive: true,
    },
  ];

  const ITEM_RATES = [
    {
      id: 'ir-1',
      chargeItemId: 'ci-1',
      currency: 'USD',
      buyRate: 2400,
      sellRate: 2400,
      chargeItem: { code: 'OFR', nameAr: 'نولون بحري', nameEn: 'Ocean Freight' },
    },
  ];

  beforeEach(() => {
    prisma = {
      tariff: {
        findMany: jest.fn().mockResolvedValue(TARIFFS),
        findFirst: jest.fn().mockImplementation(async ({ where }) =>
          TARIFFS.find((t) => t.id === where.id) || null,
        ),
        create: jest.fn().mockImplementation(async ({ data }) => ({ id: 't-new-1', ...data })),
      },
      itemDefaultRate: {
        findMany: jest.fn().mockResolvedValue(ITEM_RATES),
        upsert: jest.fn().mockResolvedValue({ id: 'ir-1' }),
      },
      chargeItem: {
        findFirst: jest.fn().mockResolvedValue({ id: 'ci-1' }),
      },
    };
    service = new PricingService(prisma as unknown as PrismaService);
  });

  describe('getTariffs', () => {
    it('returns all tariffs when no filter is given', async () => {
      const result = await service.getTariffs('tenant-1');
      expect(result).toHaveLength(3);
    });

    it('computes the profit margin', async () => {
      const result = await service.getTariffs('tenant-1');
      expect(result[0].profitMarginPercent).toBeCloseTo(16.3);
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
      const tariff = await service.getTariffById('tenant-1', 't-ocean-1');
      expect(tariff).not.toBeNull();
      expect(tariff!.carrierCode).toBe('MSCU');
    });

    it('returns null for an unknown id', async () => {
      expect(await service.getTariffById('tenant-1', 'nope')).toBeNull();
    });
  });

  describe('createTariff', () => {
    it('persists a lane tariff into the tariffs table only (never masters)', async () => {
      const result = await service.createTariff('tenant-1', {
        category: 'ocean',
        carrierCode: 'MAEU',
        carrierName: 'Maersk Line',
        buyRate: 1900,
        sellRate: 2200,
        currency: 'USD',
      });
      expect(prisma.tariff.create).toHaveBeenCalledTimes(1);
      expect(result.buyRate).toBe(1900);
      expect(result.profitMarginPercent).toBeCloseTo(15.8);
    });

    it('rejects a non-positive buy rate', async () => {
      await expect(service.createTariff('tenant-1', { buyRate: 0 })).rejects.toThrow(BadRequestException);
    });
  });

  describe('item default rates (pricing-owned)', () => {
    it('returns rates with charge item info', async () => {
      const rates = await service.getItemRates('tenant-1');
      expect(rates).toHaveLength(1);
      expect(rates[0].chargeItemCode).toBe('OFR');
      expect(rates[0].buyRate).toBe(2400);
    });

    it('upserts a rate after verifying the charge item belongs to the tenant', async () => {
      await service.upsertItemRate('tenant-1', 'ci-1', { currency: 'USD', buyRate: 10, sellRate: 12 });
      expect(prisma.chargeItem.findFirst).toHaveBeenCalled();
      expect(prisma.itemDefaultRate.upsert).toHaveBeenCalled();
    });

    it('rejects an unknown charge item', async () => {
      prisma.chargeItem.findFirst.mockResolvedValueOnce(null);
      await expect(service.upsertItemRate('tenant-1', 'nope', {})).rejects.toThrow();
    });
  });

  describe('calculateQuoteEstimate', () => {
    it('computes totals from the matched ocean tariff', async () => {
      const est = await service.calculateQuoteEstimate('tenant-1', {
        originPortCode: 'CNNGB',
        destinationPortCode: 'EGALY',
        containerType: '40HQ',
        quantity: 2,
      });
      expect(est.oceanCost).toBe(4900);
      expect(est.oceanSell).toBe(5700);
      expect(est.estimatedTransitDays).toBe(26);
    });
  });
});

