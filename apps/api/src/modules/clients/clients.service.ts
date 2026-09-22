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
      const { contacts, type, contactName, contactMobile, contactEmail, contactTitle, commodityInterest, ...rest } = data;

      // Map client status: if type is 'lead' default to 'prospect', otherwise 'active'
      let clientStatus: 'prospect' | 'active' | 'inactive' | 'blacklisted' = 'active';
      if (rest.status && ['prospect', 'active', 'inactive', 'blacklisted'].includes(rest.status.toLowerCase())) {
        clientStatus = rest.status.toLowerCase();
      } else if (type === 'lead') {
        clientStatus = 'prospect';
      }

      const cleanClientData: any = {
        companyId: tenantId,
        name: String(rest.name || '').trim(),
        tradeName: rest.tradeName ? String(rest.tradeName).trim() : null,
        taxNumber: rest.taxNumber ? String(rest.taxNumber).trim() : null,
        commercialReg: rest.commercialReg ? String(rest.commercialReg).trim() : null,
        status: clientStatus,
        category: rest.category ? String(rest.category).trim() : null,
        address: rest.address ? String(rest.address).trim() : null,
        city: rest.city ? String(rest.city).trim() : null,
        country: rest.country ? String(rest.country).trim() : 'Egypt',
        notes: rest.notes ? String(rest.notes).trim() : null,
      };

      if (rest.salesRepId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rest.salesRepId)) {
        cleanClientData.salesRepId = rest.salesRepId;
      }

      // Handle contacts array or single contact fallback
      const contactList = Array.isArray(contacts) ? contacts : [];
      if (contactList.length === 0 && (contactName || contactMobile || contactEmail)) {
        contactList.push({
          name: contactName || cleanClientData.name,
          title: contactTitle || 'مسؤول الاتصال',
          mobile: contactMobile || null,
          email: contactEmail || null,
          isPrimary: true,
        });
      }

      return await this.prisma.client.create({
        data: {
          ...cleanClientData,
          contacts: contactList.length > 0 ? {
            create: contactList.map((c: any) => ({
              companyId: tenantId,
              name: String(c.name || cleanClientData.name).trim(),
              title: c.title ? String(c.title).trim() : null,
              phone: c.phone ? String(c.phone).trim() : null,
              mobile: c.mobile ? String(c.mobile).trim() : null,
              email: c.email ? String(c.email).trim() : null,
              isPrimary: Boolean(c.isPrimary),
              notes: c.notes ? String(c.notes).trim() : null,
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
