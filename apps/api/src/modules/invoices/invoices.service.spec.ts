import { InvoicesService } from './invoices.service';
import { PrismaService } from '../../database/prisma.service';
import { InvoiceStatus } from '@banna/shared-types';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prisma: {
    invoice: Record<string, jest.Mock>;
    shipment: { findFirst: jest.Mock };
    client: { findFirst: jest.Mock };
  };

  const CLIENT_ROW = { id: '11111111-1111-4111-8111-111111111111' };

  beforeEach(() => {
    prisma = {
      invoice: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async ({ data }) => ({
          id: 'inv-new-1',
          ...data,
          items: data.items?.create || [],
          client: { id: data.clientId, name: 'Test Client' },
        })),
        update: jest.fn().mockRejectedValue(new Error('no db')),
      },
      shipment: { findFirst: jest.fn().mockResolvedValue(null) },
      client: { findFirst: jest.fn().mockResolvedValue(CLIENT_ROW) },
    };
    service = new InvoicesService(prisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('passes tenant scope and filters to prisma', async () => {
      prisma.invoice.findMany.mockResolvedValue([{ id: 'inv-1' }]);
      const result = await service.findAll('tenant-1', { status: 'issued', clientId: CLIENT_ROW.id });

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'tenant-1',
            status: 'issued',
            clientId: CLIENT_ROW.id,
          }),
        }),
      );
      expect(result).toEqual([{ id: 'inv-1' }]);
    });
  });

  describe('findOne', () => {
    it('finds by UUID id scoped to the tenant', async () => {
      prisma.invoice.findFirst.mockResolvedValue({ id: 'inv-1', invoiceNumber: 'INV-2026-0001' });
      const found = (await service.findOne('tenant-1', '11111111-2222-4222-8222-222222222222')) as any;
      expect(found.invoiceNumber).toBe('INV-2026-0001');
    });

    it('finds by invoiceNumber when id is not a UUID', async () => {
      prisma.invoice.findFirst.mockResolvedValue({ id: 'inv-1', invoiceNumber: 'INV-2026-0042' });
      const found = (await service.findOne('tenant-1', 'INV-2026-0042')) as any;
      expect(found.invoiceNumber).toBe('INV-2026-0042');
    });

    it('throws NotFound for an unknown invoice', async () => {
      await expect(service.findOne('tenant-1', 'INV-NOPE')).rejects.toThrow('not found');
    });
  });

  describe('create — real math on the DB path', () => {
    it('computes subtotal from line items and applies the default 14% tax', async () => {
      const invoice = (await service.create('tenant-1', 'user-1', {
        clientId: CLIENT_ROW.id,
        items: [
          { description: 'Ocean Freight', quantity: 1, unitPrice: 2300 },
          { description: 'THC', quantity: 2, unitPrice: 280 },
        ],
      })) as any;

      expect(invoice.subtotal).toBe(2860);
      expect(invoice.taxAmount).toBe(400.4);
      expect(invoice.total).toBe(3260.4);
      expect(invoice.status).toBe('draft');
      expect(invoice.currency).toBe('USD');
      const createdItems = invoice.items.create ?? invoice.items;
      expect(createdItems).toHaveLength(2);
      expect(createdItems[0].totalPrice).toBe(2300);
      expect(createdItems[1].totalPrice).toBe(560);
    });

    it('honors a custom tax rate and rounds tax to 2 decimals', async () => {
      const invoice = (await service.create('tenant-1', 'user-1', {
        clientId: CLIENT_ROW.id,
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
        clientId: CLIENT_ROW.id,
        items: [{ description: 'Mystery charge' }],
      })) as any;

      expect(invoice.subtotal).toBe(0);
      expect(invoice.taxAmount).toBe(0);
      const createdItems = invoice.items.create ?? invoice.items;
      expect(createdItems[0].quantity).toBe(1);
      expect(createdItems[0].unitPrice).toBe(0);
    });

    it('generates a sequential invoice number from the latest DB row', async () => {
      prisma.invoice.findFirst.mockResolvedValueOnce({ invoiceNumber: `INV-2026-0002` });

      const invoice = (await service.create('tenant-1', 'user-1', {
        clientId: CLIENT_ROW.id,
        items: [{ description: 'Freight', quantity: 1, unitPrice: 100 }],
      })) as any;

      const year = new Date().getFullYear();
      expect(invoice.invoiceNumber).toBe(`INV-${year}-0003`);
    });

    it('requires a valid clientId', async () => {
      prisma.client.findFirst.mockResolvedValue(null);
      await expect(
        service.create('tenant-1', 'user-1', {
          clientId: 'ghost',
          items: [{ description: 'Freight', quantity: 1, unitPrice: 100 }],
        }),
      ).rejects.toThrow('valid clientId');
    });

    it('defaults the due date to ~30 days out', async () => {
      const invoice = (await service.create('tenant-1', 'user-1', {
        clientId: CLIENT_ROW.id,
        items: [{ description: 'Freight', quantity: 1, unitPrice: 100 }],
      })) as any;

      const issue = new Date(invoice.issueDate).getTime();
      const due = new Date(invoice.dueDate).getTime();
      expect(due - issue).toBeGreaterThanOrEqual(29 * 86400000);
      expect(due - issue).toBeLessThanOrEqual(31 * 86400000);
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

    it('maps P2025 to NotFound', async () => {
      prisma.invoice.update.mockRejectedValue({ code: 'P2025' });
      await expect(service.updateStatus('tenant-1', 'inv-1', InvoiceStatus.PAID)).rejects.toThrow('not found');
    });

    it('rejects an invalid status value', async () => {
      await expect(service.updateStatus('tenant-1', 'inv-1', 'bogus_status')).rejects.toThrow('Invalid invoice status');
    });
  });
});
