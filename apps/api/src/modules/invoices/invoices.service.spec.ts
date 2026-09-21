import { InvoicesService } from './invoices.service';
import { PrismaService } from '../../database/prisma.service';
import { DataStoreService } from '../../database/data-store.service';
import { InvoiceStatus, InvoiceType } from '@banna/shared-types';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prisma: { invoice: Record<string, jest.Mock> };
  let dataStore: { getItems: jest.Mock; saveItem: jest.Mock };

  beforeEach(() => {
    prisma = {
      invoice: {
        findMany: jest.fn().mockRejectedValue(new Error('no db')),
        findFirst: jest.fn().mockRejectedValue(new Error('no db')),
        count: jest.fn().mockRejectedValue(new Error('no db')),
        create: jest.fn().mockRejectedValue(new Error('no db')),
        update: jest.fn().mockRejectedValue(new Error('no db')),
      },
    };
    dataStore = {
      getItems: jest.fn().mockResolvedValue([]),
      saveItem: jest.fn().mockImplementation(async (_t, _k, _id, item) => item),
    };
    service = new InvoicesService(prisma as unknown as PrismaService, dataStore as unknown as DataStoreService);
  });

  describe('create — resilient fallback math', () => {
    it('computes subtotal from line items and applies the default 14% tax', async () => {
      const invoice = (await service.create('tenant-1', 'user-1', {
        clientId: 'client-1',
        items: [
          { description: 'Ocean Freight', quantity: 1, unitPrice: 2300 },
          { description: 'THC', quantity: 2, unitPrice: 280 },
        ],
      })) as any;

      expect(invoice.subtotal).toBe(2860);
      expect(invoice.taxAmount).toBe(400.4);
      expect(invoice.total).toBe(3260.4);
      expect(invoice.status).toBe('DRAFT');
      expect(invoice.currency).toBe('USD');
      expect(invoice.items).toHaveLength(2);
      expect(invoice.items[0].totalPrice).toBe(2300);
      expect(invoice.items[1].totalPrice).toBe(560);
    });

    it('honors a custom tax rate and rounds tax to 2 decimals', async () => {
      const invoice = (await service.create('tenant-1', 'user-1', {
        items: [{ description: 'Freight', quantity: 1, unitPrice: 999.99, currency: 'EUR' }],
        taxRate: 0.05,
        currency: 'EUR',
      })) as any;

      expect(invoice.subtotal).toBe(999.99);
      expect(invoice.taxAmount).toBe(50); // 49.9995 rounds to 50
      expect(invoice.total).toBeCloseTo(1049.99, 2);
    });

    it('defaults quantity to 1 and unit price to 0 for sloppy input', async () => {
      const invoice = (await service.create('tenant-1', 'user-1', {
        items: [{ description: 'Mystery charge' }],
      })) as any;

      expect(invoice.subtotal).toBe(0);
      expect(invoice.taxAmount).toBe(0);
      expect(invoice.items[0].quantity).toBe(1);
      expect(invoice.items[0].unitPrice).toBe(0);
    });

    it('generates a sequential invoice number using the store size', async () => {
      dataStore.getItems.mockResolvedValue([{ id: 'inv-1' }, { id: 'inv-2' }]);

      const invoice = (await service.create('tenant-1', 'user-1', {
        items: [{ description: 'Freight', quantity: 1, unitPrice: 100 }],
      })) as any;

      const year = new Date().getFullYear();
      expect(invoice.invoiceNumber).toBe(`INV-${year}-0003`);
    });

    it('saves the new invoice to the tenant-scoped resilient store', async () => {
      const invoice = (await service.create('tenant-1', 'user-1', {
        clientId: 'client-7',
        items: [{ description: 'Freight', quantity: 1, unitPrice: 100 }],
      })) as any;

      expect(dataStore.saveItem).toHaveBeenCalledWith('tenant-1', 'invoices', invoice.id, invoice);
      expect(invoice.client.id).toBe('client-7');
    });

    it('defaults the due date to ~30 days out and keeps issue date today', async () => {
      const before = Date.now();
      const invoice = (await service.create('tenant-1', 'user-1', {
        items: [{ description: 'Freight', quantity: 1, unitPrice: 100 }],
      })) as any;

      const issue = new Date(invoice.issueDate).getTime();
      const due = new Date(invoice.dueDate).getTime();
      expect(issue).toBeGreaterThanOrEqual(before - 1000);
      expect(due - issue).toBeGreaterThanOrEqual(29 * 86400000);
      expect(due - issue).toBeLessThanOrEqual(31 * 86400000);
    });
  });

  describe('findAll — filtering on the fallback store', () => {
    const STORE = [
      { id: 'inv-1', status: 'ISSUED', client: { id: 'client-1' } },
      { id: 'inv-2', status: 'DRAFT', client: { id: 'client-2' } },
      { id: 'inv-3', status: 'ISSUED', client: { id: 'client-1' } },
    ];

    beforeEach(() => {
      // The service always passes its built-in FALLBACK_INVOICES; ignore it and serve our fixture.
      dataStore.getItems.mockResolvedValue(STORE);
    });

    it('returns everything when no filters are given', async () => {
      const result = await service.findAll('tenant-1');
      expect(result).toHaveLength(3);
    });

    it('filters by status', async () => {
      const result = await service.findAll('tenant-1', { status: 'ISSUED' });
      expect(result.map((i: any) => i.id)).toEqual(['inv-1', 'inv-3']);
    });

    it('filters by client id (nested or flat)', async () => {
      const result = await service.findAll('tenant-1', { clientId: 'client-2' });
      expect(result.map((i: any) => i.id)).toEqual(['inv-2']);
    });
  });

  describe('findOne — fallback behavior', () => {
    it('finds an invoice by id in the store', async () => {
      dataStore.getItems.mockResolvedValue([{ id: 'inv-42', invoiceNumber: 'INV-2026-0042' }]);

      const found = await service.findOne('tenant-1', 'inv-42') as any;
      expect(found.invoiceNumber).toBe('INV-2026-0042');
    });

    it('falls back to the first sample invoice (with createdBy) for unknown ids', async () => {
      dataStore.getItems.mockResolvedValue([]);

      const found = await service.findOne('tenant-1', 'ghost') as any;
      expect(found.id).toBe('inv-1');
      expect(found.createdBy).toBeDefined();
      expect(found.createdBy.email).toBe('admin@banna-logistics.com');
    });
  });

  describe('updateStatus', () => {
    it('updates via prisma when the database is available', async () => {
      prisma.invoice.update.mockResolvedValue({ id: 'inv-1', status: InvoiceStatus.PAID });

      const result = await service.updateStatus('tenant-1', 'inv-1', InvoiceStatus.PAID);
      expect(result).toEqual({ id: 'inv-1', status: InvoiceStatus.PAID });
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { status: InvoiceStatus.PAID },
      });
    });

    it('falls back to the store and persists the new status on db failure', async () => {
      dataStore.getItems.mockResolvedValue([
        { id: 'inv-1', invoiceNumber: 'INV-2026-0001', invoiceType: InvoiceType.CLIENT_FREIGHT, status: 'ISSUED' },
      ]);

      const result = await service.updateStatus('tenant-1', 'inv-1', InvoiceStatus.PAID) as any;
      expect(result.status).toBe(InvoiceStatus.PAID);
      expect(dataStore.saveItem).toHaveBeenCalledWith('tenant-1', 'invoices', 'inv-1', expect.objectContaining({ status: InvoiceStatus.PAID }));
    });
  });
});
