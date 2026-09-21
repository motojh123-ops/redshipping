import { DataStoreService } from './data-store.service';

jest.mock('fs', () => {
  const store: Record<string, string> = {};
  return {
    existsSync: jest.fn((p: string) => false),
    mkdirSync: jest.fn(),
    readFileSync: jest.fn(() => { throw new Error('not found'); }),
    writeFileSync: jest.fn((p: string, data: string) => { store[String(p)] = data; }),
  };
});

describe('DataStoreService', () => {
  let service: DataStoreService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DataStoreService();
  });

  describe('tenant-scoped collections', () => {
    it('returns an empty array when there is no data and no fallback', async () => {
      const items = await service.getItems('tenant-1', 'clients');
      expect(items).toEqual([]);
    });

    it('seeds the collection from fallback data on first read and persists', async () => {
      const fallback = [{ id: 'a-1', name: 'Alpha' }];
      const items = await service.getItems('tenant-1', 'clients', fallback as any);

      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Alpha');

      // Second read serves the stored copy, even if the fallback changes
      const again = await service.getItems('tenant-1', 'clients', [{ id: 'a-2', name: 'Beta' }] as any);
      expect(again[0].id).toBe('a-1');
    });

    it('isolates collections between tenants', async () => {
      await service.saveItem('tenant-1', 'clients', 'c-1', { id: 'c-1', name: 'T1 Client' } as any);
      await service.saveItem('tenant-2', 'clients', 'c-1', { id: 'c-1', name: 'T2 Client' } as any);

      const t1 = await service.getItems('tenant-1', 'clients');
      const t2 = await service.getItems('tenant-2', 'clients');

      expect(t1[0].name).toBe('T1 Client');
      expect(t2[0].name).toBe('T2 Client');
    });

    it('saves a new item by prepending it to the collection', async () => {
      await service.saveItem('t', 'invoices', 'i-1', { id: 'i-1' } as any);
      await service.saveItem('t', 'invoices', 'i-2', { id: 'i-2' } as any);

      const items = await service.getItems('t', 'invoices');
      expect(items.map((i: any) => i.id)).toEqual(['i-2', 'i-1']);
    });

    it('replaces an existing item on save instead of duplicating it', async () => {
      await service.saveItem('t', 'invoices', 'i-1', { id: 'i-1', status: 'DRAFT' } as any);
      await service.saveItem('t', 'invoices', 'i-1', { id: 'i-1', status: 'ISSUED' } as any);

      const items = await service.getItems('t', 'invoices');
      expect(items).toHaveLength(1);
      expect(items[0].status).toBe('ISSUED');
    });

    it('finds an item by id', async () => {
      await service.saveItem('t', 'shipments', 's-9', { id: 's-9', jobFileNumber: 'BAN-2026-0001' } as any);
      const found = await service.getItemById('t', 'shipments', 's-9');
      expect(found).not.toBeNull();
      expect((found as any).jobFileNumber).toBe('BAN-2026-0001');
    });

    it('returns null when an item does not exist', async () => {
      expect(await service.getItemById('t', 'shipments', 'missing')).toBeNull();
    });

    it('deletes an item and reports whether anything was removed', async () => {
      await service.saveItem('t', 'customs', 'd-1', { id: 'd-1' } as any);

      const deleted = await service.deleteItem('t', 'customs', 'd-1');
      expect(deleted).toBe(true);
      expect(await service.getItems('t', 'customs')).toEqual([]);
    });

    it('reports false when deleting from a missing collection or unknown id', async () => {
      expect(await service.deleteItem('t', 'ghost', 'x-1')).toBe(false);

      await service.saveItem('t', 'customs', 'd-1', { id: 'd-1' } as any);
      expect(await service.deleteItem('t', 'customs', 'missing')).toBe(false);
    });
  });

  describe('initialization', () => {
    it('falls back to in-memory seed data when the store cannot be read', () => {
      expect(service.clients.length).toBeGreaterThan(0);
      expect(service.shipments.length).toBeGreaterThan(0);
      expect(service.customs.length).toBeGreaterThan(0);
      expect(service.rates.length).toBeGreaterThan(0);
    });

    it('keeps client ids unique in seed data', () => {
      const ids = service.clients.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
