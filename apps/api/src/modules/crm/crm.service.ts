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
  if (client.status === 'active') return 'won';
  const cat = client.category || '';
  if (cat.startsWith(STAGE_KEY)) {
    const s = cat.slice(STAGE_KEY.length);
    if ((VALID_STAGES as readonly string[]).includes(s)) return s as LeadItem['stage'];
  }
  return 'new';
}

function toIsoDate(val: any, fallback = ''): string {
  if (!val) return fallback;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  const s = String(val);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function metaFromClient(client: any): CrmLeadMeta {
  try {
    const lines = (client.notes || '').split('\n').filter((l: string) => l.startsWith(META_KEY));
    const note = lines[lines.length - 1];
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
  const today = new Date().toISOString().slice(0, 10);
  const createdDate = toIsoDate(client.createdAt, today);
  const displayClient = client.nameAr || client.tradeName || client.name;
  const rawCat = client.category || '';
  const cleanCat = rawCat.startsWith(STAGE_KEY) ? '' : rawCat;

  return {
    id: client.id,
    title: meta.title || `${cleanCat.includes('مصنع') ? 'توريد' : 'شحن'} — ${displayClient}`,
    client: displayClient,
    clientId: client.id,
    clientType: meta.clientType,
    serviceType: meta.serviceType,
    origin: meta.origin,
    destination: meta.destination,
    estimatedValue: Number(meta.estimatedValue) || 0,
    currency: meta.currency,
    salesPerson: client.salesRep?.name || meta.salesPerson || 'فريق المبيعات',
    stage,
    expectedCloseDate: meta.expectedCloseDate || createdDate,
    createdAt: createdDate,
    priority: meta.priority,
    notes: (client.notes || '')
      .split('\n')
      .filter((l: string) => l && !l.startsWith(META_KEY) && !l.startsWith(STAGE_KEY))
      .join('\n'),
    activities: activities.map((a) => ({
      id: a.id,
      type: a.activityType,
      description: a.body || a.subject || '',
      date: toIsoDate(a.createdAt, ''),
      user: a.user?.name || '—',
    })),
  };
}

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService) {}

  private async resolveUserId(tenantId: string, userId?: string): Promise<string | null> {
    if (userId) return userId;
    const u = await this.prisma.user.findFirst({ where: { companyId: tenantId }, select: { id: true } });
    return u?.id || null;
  }

  private async loadLead(tenantId: string, id: string, allowConverted = true) {
    const client = await this.prisma.client.findFirst({
      where: {
        id,
        companyId: tenantId,
        ...(allowConverted ? {} : { status: 'prospect' }),
      },
      include: {
        salesRep: { select: { name: true } },
        companyType: { select: { nameAr: true, nameEn: true } },
        industrySector: { select: { nameAr: true, nameEn: true } },
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
    const where: any = {
      companyId: tenantId,
      OR: [
        { status: 'prospect' },
        { category: { startsWith: STAGE_KEY } },
        { convertedAt: { not: null } },
      ],
    };
    if (query?.search) {
      where.AND = [
        {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { nameAr: { contains: query.search, mode: 'insensitive' } },
            { tradeName: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const clients = await this.prisma.client.findMany({
      where,
      include: {
        salesRep: { select: { name: true } },
        companyType: { select: { nameAr: true, nameEn: true } },
        industrySector: { select: { nameAr: true, nameEn: true } },
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
    const client = await this.loadLead(tenantId, id, true);
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

  async create(tenantId: string, data: any, userId?: string) {
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

    const companyName = String(data.client || data.name || data.nameAr || data.title || 'عميل محتمل').trim();
    const companyNameAr = data.nameAr
      ? String(data.nameAr).trim()
      : /[\u0600-\u06FF]/.test(companyName)
      ? companyName
      : null;

    let targetClient: any = null;
    if (data.clientId) {
      targetClient = await this.prisma.client.findFirst({
        where: { id: String(data.clientId), companyId: tenantId },
      });
    }

    if (targetClient) {
      const existingNotes = (targetClient.notes || '')
        .split('\n')
        .filter((l: string) => l && !l.startsWith(META_KEY) && !l.startsWith(STAGE_KEY));
      if (data.notes) existingNotes.push(String(data.notes).trim());
      existingNotes.push(`${META_KEY}${JSON.stringify(meta)}`);

      targetClient = await this.prisma.client.update({
        where: { id: targetClient.id },
        data: {
          category: targetClient.status === 'active' ? `${STAGE_KEY}won` : `${STAGE_KEY}new`,
          notes: existingNotes.filter(Boolean).join('\n'),
        },
      });
    } else {
      targetClient = await this.prisma.client.create({
        data: {
          companyId: tenantId,
          name: companyName,
          nameAr: companyNameAr,
          status: 'prospect',
          category: `${STAGE_KEY}new`,
          salesRepId: userId || undefined,
          notes: [data.notes ? String(data.notes).trim() : '', `${META_KEY}${JSON.stringify(meta)}`].filter(Boolean).join('\n'),
        },
      });
    }

    const resolvedUid = await this.resolveUserId(tenantId, userId);
    if ((data.title || data.notes) && resolvedUid) {
      await this.prisma.crmActivity.create({
        data: {
          companyId: tenantId,
          clientId: targetClient.id,
          userId: resolvedUid,
          activityType: 'note',
          subject: 'lead:created',
          body: data.title || data.notes || 'تم إنشاء فرصة جديدة',
        },
      });
    }

    return this.findOne(tenantId, targetClient.id);
  }

  async updateStage(tenantId: string, id: string, stage: LeadItem['stage'], userId?: string) {
    if (!(VALID_STAGES as readonly string[]).includes(stage)) {
      throw new NotFoundException(`Invalid lead stage '${stage}'`);
    }
    const lead = await this.loadLead(tenantId, id, true);
    const oldStage = stageFromClient(lead);

    const notesLines = (lead.notes || '').split('\n');
    const metaLines = notesLines.filter((l: string) => l.startsWith(META_KEY));
    const metaLine = metaLines[metaLines.length - 1] || `${META_KEY}${JSON.stringify(defaultMeta())}`;
    const cleanNotes = notesLines.filter((l: string) => l && !l.startsWith(STAGE_KEY) && !l.startsWith(META_KEY));

    await this.prisma.client.update({
      where: { id: lead.id },
      data: {
        category: `${STAGE_KEY}${stage}`,
        notes: [...cleanNotes, metaLine].filter(Boolean).join('\n'),
        ...(stage === 'won' && oldStage !== 'won'
          ? { status: 'active', convertedAt: lead.convertedAt || new Date() }
          : stage !== 'won' && lead.status === 'active'
          ? { status: 'prospect' }
          : {}),
      },
    });

    const resolvedUid = await this.resolveUserId(tenantId, userId);
    if (resolvedUid) {
      await this.prisma.crmActivity.create({
        data: {
          companyId: tenantId,
          clientId: lead.id,
          userId: resolvedUid,
          activityType: 'note',
          subject: 'lead:stage',
          body: `تم تغيير مرحلة الفرصة من "${oldStage}" إلى "${stage}"`,
        },
      });
    }

    const updated = await this.loadLead(tenantId, id, true);
    return toLeadItem(updated, updated.crmActivities || []);
  }

  async addActivity(tenantId: string, id: string, activityData: { type: LeadActivity['type']; description: string; userId?: string }) {
    const lead = await this.loadLead(tenantId, id, true);
    const resolvedUid = await this.resolveUserId(tenantId, activityData.userId);

    if (resolvedUid) {
      await this.prisma.crmActivity.create({
        data: {
          companyId: tenantId,
          clientId: lead.id,
          userId: resolvedUid,
          activityType: activityData.type || 'note',
          subject: 'lead:activity',
          body: activityData.description,
        },
      });
    }

    const updated = await this.loadLead(tenantId, id, true);
    return toLeadItem(updated, updated.crmActivities || []);
  }

  async convert(tenantId: string, id: string, targetType: 'shipment' | 'client', userId?: string) {
    const lead = await this.loadLead(tenantId, id, true);

    // Mark the prospect as a real active client
    await this.prisma.client.update({
      where: { id: lead.id },
      data: {
        status: 'active',
        convertedAt: lead.convertedAt || new Date(),
        category: `${STAGE_KEY}won`,
      },
    });

    const resolvedUid = await this.resolveUserId(tenantId, userId);
    if (resolvedUid) {
      await this.prisma.crmActivity.create({
        data: {
          companyId: tenantId,
          clientId: lead.id,
          userId: resolvedUid,
          activityType: 'note',
          subject: 'lead:converted',
          body: `تم تحويل الفرصة بنجاح إلى ${targetType === 'shipment' ? 'ملف شحنة تشغيلية' : 'عميل معتمد في النظام'}`,
        },
      });
    }

    const updated = await this.loadLead(tenantId, id, true);
    return toLeadItem(updated, updated.crmActivities || []);
  }
}
