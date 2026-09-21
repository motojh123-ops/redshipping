import { Injectable, NotFoundException } from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';

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

const INITIAL_LEADS: LeadItem[] = [
  {
    id: 'LD-2026-001',
    title: 'شحن خط إنتاج كامل — 8 حاويات',
    client: 'العربية للصناعات الهندسية',
    clientType: 'manufacturer',
    serviceType: 'sea_fcl',
    origin: 'شنغهاي — CNSHA',
    destination: 'الإسكندرية — EGALY',
    estimatedValue: 48000,
    currency: 'USD',
    salesPerson: 'أحمد سليم',
    stage: 'negotiation',
    expectedCloseDate: '2026-09-30',
    createdAt: '2026-09-08',
    priority: 'high',
    notes: 'العميل يطلب خصم 5% على إجمالي النولون — يحتاج موافقة المدير',
    activities: [
      { id: 'a1', type: 'call', description: 'مكالمة أولية مع مدير المشتريات م. حسام', date: '2026-09-08', user: 'أحمد سليم' },
      { id: 'a2', type: 'email', description: 'إرسال عرض سعر أولي رقم QT-2026-089', date: '2026-09-10', user: 'أحمد سليم' },
      { id: 'a3', type: 'meeting', description: 'اجتماع بمقر العميل للتفاوض على شروط الدفع', date: '2026-09-15', user: 'أحمد سليم' },
    ],
  },
  {
    id: 'LD-2026-002',
    title: 'تخليص جمركي — شحنة أدوية مبردة',
    client: 'فارما كير للأدوية',
    clientType: 'trader',
    serviceType: 'clearance',
    origin: 'فرانكفورت — DEFRA',
    destination: 'مطار القاهرة — CAI',
    estimatedValue: 12500,
    currency: 'EUR',
    salesPerson: 'سارة أحمد',
    stage: 'quoted',
    expectedCloseDate: '2026-09-25',
    createdAt: '2026-09-12',
    priority: 'high',
    notes: 'مطلوب موافقة هيئة الدواء المصرية EDA — شحنة عاجلة جداً',
    activities: [
      { id: 'a4', type: 'call', description: 'استفسار عن متطلبات الإفراج الطبي', date: '2026-09-12', user: 'سارة أحمد' },
      { id: 'a5', type: 'whatsapp', description: 'إرسال قائمة المستندات المطلوبة عبر واتساب', date: '2026-09-13', user: 'سارة أحمد' },
    ],
  },
  {
    id: 'LD-2026-003',
    title: 'شحن بحري LCL — قطع غيار سيارات',
    client: 'أوتو بارتس مصر',
    clientType: 'trader',
    serviceType: 'sea_lcl',
    origin: 'بوسان — KRPUS',
    destination: 'الدخيلة — EGDKH',
    estimatedValue: 6200,
    currency: 'USD',
    salesPerson: 'محمد فتحي',
    stage: 'contacted',
    expectedCloseDate: '2026-10-05',
    createdAt: '2026-09-14',
    priority: 'medium',
    notes: 'حجم 14 CBM — وزن 4.2 طن',
    activities: [
      { id: 'a6', type: 'call', description: 'تأكيد أبعاد ووزن الطرود', date: '2026-09-14', user: 'محمد فتحي' },
    ],
  },
  {
    id: 'LD-2026-004',
    title: 'شحن جوي عاجل — عينات كيماوية',
    client: 'تكنو كيميكالز',
    clientType: 'manufacturer',
    serviceType: 'air',
    origin: 'دبي — DXB',
    destination: 'مطار القاهرة — CAI',
    estimatedValue: 3800,
    currency: 'USD',
    salesPerson: 'محمد فتحي',
    stage: 'new',
    expectedCloseDate: '2026-09-22',
    createdAt: '2026-09-16',
    priority: 'high',
    notes: 'بضاعة خطرة Dangerous Goods (DGR Class 3) — تتطلب شهادة MSDS',
    activities: [],
  },
  {
    id: 'LD-2026-005',
    title: 'تصدير — حاصلات زراعية إلى هولندا',
    client: 'وادي النيل للتصدير',
    clientType: 'trader',
    serviceType: 'sea_fcl',
    origin: 'الإسكندرية — EGALY',
    destination: 'روتردام — NLRTM',
    estimatedValue: 32000,
    currency: 'EUR',
    salesPerson: 'أحمد سليم',
    stage: 'won',
    expectedCloseDate: '2026-09-20',
    createdAt: '2026-09-01',
    priority: 'medium',
    notes: 'تم التحويل لملف شحنة بنجاح — رقم الشحنة SHP-2026-010',
    activities: [
      { id: 'a11', type: 'call', description: 'مكالمة بيع ناجحة', date: '2026-09-01', user: 'أحمد سليم' },
      { id: 'a12', type: 'email', description: 'عرض سعر مُرسل ومقبول', date: '2026-09-02', user: 'أحمد سليم' },
      { id: 'a13', type: 'meeting', description: 'توقيع العقد الرسمي', date: '2026-09-10', user: 'أحمد سليم' },
    ],
  },
];

@Injectable()
export class CrmService {
  private readonly collectionKey = 'crm_leads';

  constructor(private dataStore: DataStoreService) {}

  async findAll(tenantId: string, query?: { stage?: string; salesPerson?: string; search?: string }) {
    let leads = await this.dataStore.getItems<LeadItem>(tenantId, this.collectionKey, INITIAL_LEADS);

    if (query?.stage && query.stage !== 'all') {
      leads = leads.filter((l) => l.stage === query.stage);
    }

    if (query?.salesPerson && query.salesPerson !== 'all') {
      leads = leads.filter((l) => l.salesPerson === query.salesPerson);
    }

    if (query?.search) {
      const q = query.search.toLowerCase();
      leads = leads.filter(
        (l) =>
          l.id.toLowerCase().includes(q) ||
          l.title.toLowerCase().includes(q) ||
          l.client.toLowerCase().includes(q) ||
          l.salesPerson.toLowerCase().includes(q),
      );
    }

    return leads;
  }

  async findOne(tenantId: string, id: string) {
    const lead = await this.dataStore.getItemById<LeadItem>(tenantId, this.collectionKey, id);
    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }
    return lead;
  }

  async getStats(tenantId: string) {
    const leads = await this.dataStore.getItems<LeadItem>(tenantId, this.collectionKey, INITIAL_LEADS);

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
    const leads = await this.dataStore.getItems<LeadItem>(tenantId, this.collectionKey, INITIAL_LEADS);
    const newId = `LD-${new Date().getFullYear()}-${String(leads.length + 10).padStart(3, '0')}`;

    const newLead: LeadItem = {
      id: newId,
      title: data.title || 'فرصة شحن لوجستي جديدة',
      client: data.client || 'عميل تجاري محتمل',
      clientType: data.clientType || 'trader',
      serviceType: data.serviceType || 'sea_fcl',
      origin: data.origin || 'شنغهاي — CNSHA',
      destination: data.destination || 'الإسكندرية — EGALY',
      estimatedValue: Number(data.estimatedValue) || 15000,
      currency: data.currency || 'USD',
      salesPerson: data.salesPerson || 'فريق المبيعات',
      stage: data.stage || 'new',
      expectedCloseDate: data.expectedCloseDate || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      createdAt: new Date().toISOString().slice(0, 10),
      priority: data.priority || 'medium',
      notes: data.notes || '',
      activities: [],
    };

    return this.dataStore.saveItem<LeadItem>(tenantId, this.collectionKey, newLead.id, newLead);
  }

  async updateStage(tenantId: string, id: string, stage: LeadItem['stage'], user?: string) {
    const lead = await this.findOne(tenantId, id);
    const oldStage = lead.stage;
    lead.stage = stage;

    lead.activities.unshift({
      id: `act-${Date.now()}`,
      type: 'note',
      description: `تم تغيير مرحلة الفرصة من "${oldStage}" إلى "${stage}"`,
      date: new Date().toISOString().slice(0, 10),
      user: user || 'مسؤول المبيعات',
    });

    return this.dataStore.saveItem<LeadItem>(tenantId, this.collectionKey, id, lead);
  }

  async addActivity(tenantId: string, id: string, activityData: { type: LeadActivity['type']; description: string; user?: string }) {
    const lead = await this.findOne(tenantId, id);
    const activity: LeadActivity = {
      id: `act-${Date.now()}`,
      type: activityData.type || 'note',
      description: activityData.description,
      date: new Date().toISOString().slice(0, 10),
      user: activityData.user || 'مسؤول المبيعات',
    };
    lead.activities.unshift(activity);
    return this.dataStore.saveItem<LeadItem>(tenantId, this.collectionKey, id, lead);
  }

  async convert(tenantId: string, id: string, targetType: 'shipment' | 'client') {
    const lead = await this.findOne(tenantId, id);
    lead.stage = 'won';

    // If converting to client, save in clients list
    if (targetType === 'client') {
      const newClient = {
        id: `client-${Date.now()}`,
        name: lead.client,
        category: lead.clientType,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
      };
      this.dataStore.clients.unshift(newClient as any);
      this.dataStore.persist();
    }

    // Add activity note
    lead.activities.unshift({
      id: `act-${Date.now()}`,
      type: 'note',
      description: `تم تحويل الفرصة بنجاح إلى ${targetType === 'shipment' ? 'ملف شحنة تشغيلية' : 'عميل معتمد في النظام'}`,
      date: new Date().toISOString().slice(0, 10),
      user: 'مدير المبيعات',
    });

    return this.dataStore.saveItem<LeadItem>(tenantId, this.collectionKey, id, lead);
  }
}
