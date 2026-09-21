import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DataStoreService } from '../../database/data-store.service';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    private prisma: PrismaService,
    private dataStore: DataStoreService,
  ) {}

  async findAll(tenantId: string, query?: { status?: any; search?: string }) {
    try {
      const where: any = { companyId: tenantId };
      if (query?.status) where.status = query.status;
      if (query?.search) {
        where.OR = [
          { name: { contains: query.search, mode: 'insensitive' } },
          { tradeName: { contains: query.search, mode: 'insensitive' } },
          { taxNumber: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      return await this.prisma.client.findMany({
        where,
        include: {
          contacts: true,
          salesRep: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err: any) {
      if (!this.dataStore.isFallbackAllowed()) {
        this.logger.error(`Database error in clients.findAll: ${err.message}`, err.stack);
        throw err;
      }
    }

    let result = [...this.dataStore.clients];
    if (query?.status && query.status !== 'all') {
      result = result.filter((c) => c.status === query.status);
    }
    if (query?.search) {
      const q = query.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.tradeName?.toLowerCase().includes(q) ||
          c.taxNumber?.includes(q) ||
          c.commercialReg?.includes(q),
      );
    }
    return result;
  }

  async findOne(tenantId: string, id: string) {
    try {
      const client = await this.prisma.client.findFirst({
        where: { id, companyId: tenantId },
        include: {
          contacts: true,
          crmActivities: {
            include: { user: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
          },
          quotations: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
          shipments: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });

      if (client) return client;
      if (!this.dataStore.isFallbackAllowed()) {
        throw new NotFoundException(`Client with ID ${id} not found`);
      }
    } catch (err: any) {
      if (err instanceof NotFoundException || !this.dataStore.isFallbackAllowed()) {
        throw err;
      }
    }

    const found = this.dataStore.clients.find((c) => c.id === id) || this.dataStore.clients[0];
    return {
      ...found,
      crmActivities: [
        {
          id: 'act-1',
          activityType: 'meeting',
          notes: 'اجتماع مناقشة عروض أسعار حاويات ميناء الإسكندرية',
          createdAt: new Date().toISOString(),
          user: { id: 'u-1', name: 'أحمد الشريف' },
        },
      ],
      quotations: [],
      shipments: [],
    };
  }

  async create(tenantId: string, data: any) {
    try {
      const { contacts, ...clientData } = data;
      return await this.prisma.client.create({
        data: {
          ...clientData,
          companyId: tenantId,
          contacts: contacts && contacts.length > 0 ? {
            create: contacts.map((c: any) => ({
              ...c,
              companyId: tenantId,
            })),
          } : undefined,
        },
        include: { contacts: true },
      });
    } catch (err: any) {
      if (!this.dataStore.isFallbackAllowed()) {
        this.logger.error(`Database error in clients.create: ${err.message}`, err.stack);
        throw err;
      }
      // Fallback persistent storage
      const newClient = {
        id: `client-${Date.now()}`,
        name: data.name,
        tradeName: data.tradeName || data.name,
        taxNumber: data.taxNumber || '',
        commercialReg: data.commercialReg || '',
        status: data.status || 'active',
        type: data.type || (data.taxNumber && data.commercialReg ? 'actual' : 'lead'),
        category: data.category || 'مستورد وتجارة عامة',
        city: data.city || 'القاهرة',
        country: 'Egypt',
        contactName: data.contactName || '',
        phone: data.phone || '',
        email: data.email || '',
        commodityInterest: data.commodityInterest || '',
        totalShipments: 0,
        totalRevenue: 0,
        createdAt: new Date().toISOString(),
        contacts: data.contacts || [],
        salesRep: { id: 'user-sales', name: 'أحمد الشريف', email: 'sales@redshipping.com' },
      };
      this.dataStore.clients.unshift(newClient as any);
      this.dataStore.persist();
      return newClient;
    }
  }

  async addActivity(tenantId: string, clientId: string, userId: string, data: any) {
    return this.prisma.crmActivity.create({
      data: {
        ...data,
        clientId,
        userId,
        companyId: tenantId,
      },
    });
  }
}
