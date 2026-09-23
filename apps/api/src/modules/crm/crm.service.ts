import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface LeadActivity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'whatsapp' | 'note';
  description: string;
  date: string;
  user: string;
}

export interface LeadItem {
  id: string;
  title: string;
  client: string;
  clientId?: string | null;
  clientType: string;
  serviceType: string;
  origin: string;
  destination: string;
  estimatedValue: number;
  currency: string;
  salesPerson: string;
  stage: 'new' | 'contacted' | 'quoted' | 'negotiation' | 'won' | 'lost';
  expectedCloseDate: string;
  createdAt: string;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
  activities: LeadActivity[];
}

/**
 * CRM pipeline built on real persistence:
 *  - Leads            → prospect Clients (Client.status = 'prospect')
 *  - Stage            → Client.category ('lead:new', 'lead:contacted', ...)
 *  - Estimated value  → Client.notes head field (JSON-encoded CrmLeadMeta)
 *  - Activities       → CrmActivity rows (subject prefix 'lead:stage' / 'lead:activity')
 *
 * This keeps CRM data in PostgreSQL, tenant-scoped, without inventing a
 * parallel store. Lead "records" are projections over Client + CrmActivity.
 */

const STAGE_KEY = 'lead:stage:';
const META_KEY = 'lead:meta:';

interface CrmLeadMeta {
  serviceType: string;
  origin: string;
  destination: string;
  estimatedValue: number;
  currency: string;
  clientType: string;
  expectedCloseDate?: string;
  priority: 'high' | 'medium' | 'low';
  salesPerson?: string;
  title?: string;
}

const VALID_STAGES = ['new', 'contacted', 'quoted', 'negotiation', 'won', 'lost'] as const;

function stageFromClient(client: any): LeadItem['stage'] {
  const cat = client.category || '';
  if (cat.startsWith(STAGE_KEY)) {
    const s = cat.slice(STAGE_KEY.length);
    if ((VALID_STAGES as readonly string[]).includes(s)) return s as LeadItem['stage'];
  }
  return 'new';
}

function metaFromClient(client: any): CrmLeadMeta {
  try {
    const note = (client.notes || '').split('\n').find((l: string) => l.startsWith(META_KEY));
    if (note) return { ...defaultMeta(), ...JSON.parse(note.slice(META_KEY.length)) };
  } catch {
    // fall through to defaults
  }
  return defaultMeta();
}

function defaultMeta(): CrmLeadMeta {
  return {
    serviceType: 'sea_fcl',
    origin: '—',
    destination: '—',
    estimatedValue: 0,
    currency: 'USD',
    clientType: 'trader',
    priority: 'medium',
  };
}

function toLeadItem(client: any, activities: any[]): LeadItem {
  const meta = metaFromClient(client);
  const stage = stageFromClient(client);
  return {
    id: client.id,
    title: meta.title || `${client.category?.includes('مصنع') ? 'توريد' : 'شحن'} — ${client.name}`,
    client: client.tradeName || client.name,
    clientId: client.id,
    clientType: meta.clientType,
    serviceType: meta.serviceType,
    origin: meta.origin,
    destination: meta.destination,
    estimatedValue: Number(meta.estimatedValue) || 0,
    currency: meta.currency,
    salesPerson: client.salesRep?.name || meta.salesPerson || 'فريق المبيعات',
    stage,
    expectedCloseDate: meta.expectedCloseDate || client.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    createdAt: client.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    priority: meta.priority,
    notes: (client.notes || '')
      .split('\n')
      .filter((l: string) => l && !l.startsWith(META_KEY) && !l.startsWith(STAGE_KEY))
      .join('\n'),
    activities: activities.map((a) => ({
      id: a.id,
      type: a.activityType,
      description: a.body || a.subject || '',
      date: a.createdAt?.slice(0, 10) || '',
      user: a.user?.name || '—',
    })),
  };
}

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService) {}

  private async loadLead(tenantId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, companyId: tenantId, status: 'prospect' },
      include: {
        salesRep: { select: { name: true } },
        crmActivities: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!client) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }
    return client;
  }

  async findAll(tenantId: string, query?: { stage?: string; salesPerson?: string; search?: string }) {
    const where: any = { companyId: tenantId, status: 'prospect' };
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { tradeName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const clients = await this.prisma.client.findMany({
      where,
      include: {
        salesRep: { select: { name: true } },
        crmActivities: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let leads = clients.map((c) => toLeadItem(c, c.crmActivities || []));

    if (query?.stage && query.stage !== 'all') {
      leads = leads.filter((l) => l.stage === query.stage);
    }
    if (query?.salesPerson && query.salesPerson !== 'all') {
      leads = leads.filter((l) => l.salesPerson === query.salesPerson);
    }
    return leads;
  }

  async findOne(tenantId: string, id: string) {
    const client = await this.loadLead(tenantId, id);
    return toLeadItem(client, client.crmActivities || []);
  }

  async getStats(tenantId: string) {
    const leads = await this.findAll(tenantId);

    const totalValue = leads.reduce((s, l) => s + l.estimatedValue, 0);
    const wonLeads = leads.filter((l) => l.stage === 'won');
    const wonValue = wonLeads.reduce((s, l) => s + l.estimatedValue, 0);
    const conversionRate = leads.length > 0 ? Math.round((wonLeads.length / leads.length) * 100) : 0;
    const highPriority = leads.filter((l) => l.priority === 'high' && l.stage !== 'won' && l.stage !== 'lost').length;

    return {
      totalLeads: leads.length,
      totalValueUsd: totalValue,
      wonLeadsCount: wonLeads.length,
      wonValueUsd: wonValue,
      conversionRatePercent: conversionRate,
      highPriorityCount: highPriority,
    };
  }

  async create(tenantId: string, data: any) {
    const meta: CrmLeadMeta = {
      serviceType: data.serviceType || 'sea_fcl',
      origin: data.origin || '—',
      destination: data.destination || '—',
      estimatedValue: Number(data.estimatedValue) || 0,
      currency: data.currency || 'USD',
      clientType: data.clientType || 'trader',
      expectedCloseDate: data.expectedCloseDate,
      priority: data.priority || 'medium',
      salesPerson: data.salesPerson,
      title: data.title,
    };

    const client = await this.prisma.client.create({
      data: {
        companyId: tenantId,
        name: String(data.client || data.title || 'عميل محتمل').trim(),
        status: 'prospect',
        category: `${STAGE_KEY}new`,
        notes: [data.notes, `${META_KEY}${JSON.stringify(meta)}`].filter(Boolean).join('\n'),
      },
    });

    if (data.title || data.notes) {
      await this.prisma.crmActivity.create({
        data: {
          companyId: tenantId,
          clientId: client.id,
          userId: (await this.prisma.user.findFirst({ where: { companyId: tenantId } }))!.id,
          activityType: 'note',
          subject: 'lead:created',
          body: data.title || data.notes || 'تم إنشاء فرصة جديدة',
        },
      });
    }

    return this.findOne(tenantId, client.id);
  }

  async updateStage(tenantId: string, id: string, stage: LeadItem['stage'], user?: string) {
    if (!(VALID_STAGES as readonly string[]).includes(stage)) {
      throw new NotFoundException(`Invalid lead stage '${stage}'`);
    }
    const lead = await this.loadLead(tenantId, id);
    const oldStage = stageFromClient(lead);

    const notesLines = (lead.notes || '').split('\n');
    const metaLine = notesLines.find((l: string) => l.startsWith(META_KEY)) || `${META_KEY}${JSON.stringify(defaultMeta())}`;

    await this.prisma.client.update({
      where: { id: lead.id },
      data: {
        category: `${STAGE_KEY}${stage}`,
        notes: [notesLines.filter((l: string) => !l.startsWith(STAGE_KEY)).join('\n'), metaLine].filter(Boolean).join('\n'),
      },
    });

    // When a lead is won, promote the client to active
    if (stage === 'won' && oldStage !== 'won') {
      await this.prisma.client.update({
        where: { id: lead.id },
        data: { status: 'active' },
      });
    }

    await this.prisma.crmActivity.create({
      data: {
        companyId: tenantId,
        clientId: lead.id,
        userId: (await this.prisma.user.findFirst({ where: { companyId: tenantId } }))!.id,
        activityType: 'note',
        subject: 'lead:stage',
        body: `تم تغيير مرحلة الفرصة من "${oldStage}" إلى "${stage}"`,
      },
    });

    return this.findOne(tenantId, id);
  }

  async addActivity(tenantId: string, id: string, activityData: { type: LeadActivity['type']; description: string; user?: string }) {
    const lead = await this.loadLead(tenantId, id);

    await this.prisma.crmActivity.create({
      data: {
        companyId: tenantId,
        clientId: lead.id,
        userId: (await this.prisma.user.findFirst({ where: { companyId: tenantId } }))!.id,
        activityType: activityData.type || 'note',
        subject: 'lead:activity',
        body: activityData.description,
      },
    });

    return this.findOne(tenantId, id);
  }

  async convert(tenantId: string, id: string, targetType: 'shipment' | 'client') {
    const lead = await this.loadLead(tenantId, id);

    // Mark the prospect as a real active client
    await this.prisma.client.update({
      where: { id: lead.id },
      data: {
        status: 'active',
        category: `${STAGE_KEY}won`,
      },
    });

    await this.prisma.crmActivity.create({
      data: {
        companyId: tenantId,
        clientId: lead.id,
        userId: (await this.prisma.user.findFirst({ where: { companyId: tenantId } }))!.id,
        activityType: 'note',
        subject: 'lead:converted',
        body: `تم تحويل الفرصة بنجاح إلى ${targetType === 'shipment' ? 'ملف شحنة تشغيلية' : 'عميل معتمد في النظام'}`,
      },
    });

    return this.findOne(tenantId, id);
  }
}
