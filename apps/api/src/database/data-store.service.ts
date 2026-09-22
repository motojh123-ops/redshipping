import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface StoredClient {
  id: string;
  name: string;
  tradeName?: string;
  taxNumber?: string;
  commercialReg?: string;
  status: 'active' | 'prospect' | 'inactive';
  type?: 'actual' | 'lead';
  category: string;
  address?: string;
  city?: string;
  country?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  commodityInterest?: string;
  totalShipments?: number;
  totalRevenue?: number;
  createdAt: string;
  contacts?: any[];
  salesRep?: any;
}

export interface StoredShipment {
  id: string;
  jobFileNumber: string;
  shipmentType: string;
  incoterm: string;
  currentStage: string;
  blNumber: string;
  vesselName: string;
  voyageNumber: string;
  etd?: string;
  eta?: string;
  ata?: string;
  freeDaysAllowed: number;
  cargoDescription: string;
  grossWeightKg?: number;
  volumeCbm?: number;
  deliveryOrderNumber?: string;
  deliveryOrderExpiryDate?: string;
  deliveryOrderStatus?: string;
  createdAt: string;
  client: { id: string; name: string };
  originPort: { id: string; code: string; nameEn: string };
  destinationPort: { id: string; code: string; nameEn: string };
  shippingLine: { id: string; name: string };
  containers: any[];
  events?: any[];
}

export interface StoredCustomsDossier {
  id: string;
  acidNumber: string;
  daysLeft: number;
  certNumber: string;
  shipmentFile: string;
  blNumber: string;
  client: string;
  status: 'acid_issued' | 'inspected' | 'release_issued';
  duties: string;
  vat: string;
  inspectionDate: string;
  port: string;
  createdAt: string;
}

export interface StoredRate {
  id: string;
  shippingLine: string;
  lineCode: string;
  originPort: string;
  originPortCode: string;
  destinationPort: string;
  destinationPortCode: string;
  rate20GP: number;
  rate40HQ: number;
  currency: string;
  transitTimeDays: number;
  freeDays: number;
  routing: 'Direct' | 'Transshipment';
  transshipmentPort?: string;
  validFrom: string;
  validUntil: string;
  notes?: string;
  isSpotRate: boolean;
  createdAt: string;
}

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  companyId: string;
  companyName: string;
  isActive: boolean;
  createdAt: string;
}

@Injectable()
export class DataStoreService {
  private readonly logger = new Logger(DataStoreService.name);
  private readonly dataDir = path.resolve(process.cwd(), 'data');
  private readonly storeFilePath = path.join(this.dataDir, 'store.json');

  public users: StoredUser[] = [];
  public clients: StoredClient[] = [];
  public shipments: StoredShipment[] = [];
  public customs: StoredCustomsDossier[] = [];
  public rates: StoredRate[] = [];
  public customCollections: Record<string, any[]> = {};

  constructor() {
    this.initStore();
  }

  private initStore() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      if (fs.existsSync(this.storeFilePath)) {
        const content = fs.readFileSync(this.storeFilePath, 'utf-8');
        const parsed = JSON.parse(content);
        this.users = parsed.users || [];
        this.clients = parsed.clients || [];
        this.shipments = parsed.shipments || [];
        this.customs = parsed.customs || [];
        this.rates = parsed.rates || [];
        this.customCollections = parsed.customCollections || {};
        if (this.users.length === 0) {
          this.seedUsers();
          this.persist();
        }
        this.logger.log(`Loaded ${this.shipments.length} shipments and ${this.clients.length} clients from store.json`);
      } else {
        this.seedInitialData();
        this.persist();
      }
    } catch (err: any) {
      this.logger.warn(`Failed reading store.json, using in-memory defaults: ${err.message}`);
      this.seedInitialData();
    }
  }

  public persist() {
    try {
      const data = {
        users: this.users,
        clients: this.clients,
        shipments: this.shipments,
        customs: this.customs,
        rates: this.rates,
        customCollections: this.customCollections,
        lastUpdated: new Date().toISOString(),
      };
      fs.writeFileSync(this.storeFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err: any) {
      this.logger.error(`Error saving store.json: ${err.message}`);
    }
  }

  public isFallbackAllowed(): boolean {
    if (process.env.ALLOW_STORE_FALLBACK === 'false' || process.env.DISABLE_DATA_FALLBACKS === 'true') {
      return false;
    }
    if (process.env.NODE_ENV === 'production') {
      return process.env.ALLOW_STORE_FALLBACK === 'true';
    }
    return true;
  }

  public async getItems<T = any>(tenantId: string, collectionKey: string, fallbackData?: T[]): Promise<T[]> {
    const key = `${tenantId}:${collectionKey}`;
    // Only seed with fallback if the key has NEVER been initialized.
    // If the key exists but is empty (e.g. after an explicit reset), respect that and return [].
    if (!(key in this.customCollections)) {
      if (fallbackData && fallbackData.length > 0) {
        this.customCollections[key] = [...fallbackData];
        this.persist();
      } else {
        return [];
      }
    }
    return this.customCollections[key] as T[];
  }

  public async saveItem<T = any>(tenantId: string, collectionKey: string, itemId: string, item: T): Promise<T> {
    const key = `${tenantId}:${collectionKey}`;
    if (!this.customCollections[key]) {
      this.customCollections[key] = [];
    }
    const idx = this.customCollections[key].findIndex((x: any) => x.id === itemId);
    if (idx >= 0) {
      this.customCollections[key][idx] = item;
    } else {
      this.customCollections[key].unshift(item);
    }
    this.persist();
    return item;
  }

  public async getItemById<T = any>(tenantId: string, collectionKey: string, itemId: string): Promise<T | null> {
    const items = await this.getItems<T>(tenantId, collectionKey);
    return (items.find((x: any) => x.id === itemId) as T) || null;
  }

  public async deleteItem(tenantId: string, collectionKey: string, itemId: string): Promise<boolean> {
    const key = `${tenantId}:${collectionKey}`;
    if (!this.customCollections[key]) return false;
    const initialLen = this.customCollections[key].length;
    this.customCollections[key] = this.customCollections[key].filter((x: any) => x.id !== itemId);
    const deleted = this.customCollections[key].length < initialLen;
    if (deleted) this.persist();
    return deleted;
  }

  // All known collection keys that are considered "operational" (non-master data)
  private static readonly OPERATIONAL_COLLECTION_KEYS = [
    'disbursements',
    'invoices',
    'crm_leads',
    'dispatch_trips',
  ];

  // Collection keys that are considered "master/reference" data (kept on operational reset)
  private static readonly MASTER_COLLECTION_KEYS = [
    'pricing_tariffs',
  ];

  public clearOperationalData(tenantId?: string) {
    // Clear old-style arrays
    this.shipments = [];
    this.customs = [];

    // Clear all known operational customCollections for this tenant
    if (tenantId) {
      for (const key of DataStoreService.OPERATIONAL_COLLECTION_KEYS) {
        this.customCollections[`${tenantId}:${key}`] = [];
      }
    }
    // Also clear any legacy collections ending with operational keys (e.g., comp-demo-1:disbursements)
    for (const fullKey of Object.keys(this.customCollections)) {
      const collName = fullKey.split(':').slice(1).join(':');
      if (DataStoreService.OPERATIONAL_COLLECTION_KEYS.includes(collName)) {
        this.customCollections[fullKey] = [];
      }
    }
    this.persist();
    this.logger.log(`Cleared operational data${tenantId ? ` for tenant ${tenantId}` : ' (all tenants)'}`);
  }

  public clearAllData(tenantId?: string) {
    this.clearOperationalData(tenantId);
    this.clients = [];
    // Also clear master collections
    if (tenantId) {
      for (const key of DataStoreService.MASTER_COLLECTION_KEYS) {
        this.customCollections[`${tenantId}:${key}`] = [];
      }
    }
    for (const fullKey of Object.keys(this.customCollections)) {
      const collName = fullKey.split(':').slice(1).join(':');
      if (DataStoreService.MASTER_COLLECTION_KEYS.includes(collName)) {
        this.customCollections[fullKey] = [];
      }
    }
    this.persist();
    this.logger.log(`Cleared ALL data${tenantId ? ` for tenant ${tenantId}` : ' (all tenants)'}`);
  }

  public seedUsers() {
    this.users = [
      {
        id: 'usr-admin-1',
        email: 'admin@redshipping.com',
        name: 'عمر السيد (مدير عام)',
        passwordHash: '$2b$10$gPv/H3pO6KCokgINtDWTQ.VG.Q/9pyn2/qs/rCOWg.iP/9wa0PJDi', // password123
        role: 'super_admin',
        companyId: '7f75539c-6168-4a0a-9519-38e3ee32022b',
        companyName: 'Banna Freight & Logistics Egypt',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'usr-sales-1',
        email: 'sales@redshipping.com',
        name: 'أحمد الشريف (مسؤول مبيعات)',
        passwordHash: '$2b$10$gPv/H3pO6KCokgINtDWTQ.VG.Q/9pyn2/qs/rCOWg.iP/9wa0PJDi', // password123
        role: 'sales_rep',
        companyId: '7f75539c-6168-4a0a-9519-38e3ee32022b',
        companyName: 'Banna Freight & Logistics Egypt',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'usr-ops-1',
        email: 'ops@redshipping.com',
        name: 'سارة حسين (مسؤولة عمليات وتخليص)',
        passwordHash: '$2b$10$gPv/H3pO6KCokgINtDWTQ.VG.Q/9pyn2/qs/rCOWg.iP/9wa0PJDi', // password123
        role: 'ops_officer',
        companyId: '7f75539c-6168-4a0a-9519-38e3ee32022b',
        companyName: 'Banna Freight & Logistics Egypt',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'usr-acc-1',
        email: 'accountant@redshipping.com',
        name: 'سامي كمال (المدير المالي)',
        passwordHash: '$2b$10$gPv/H3pO6KCokgINtDWTQ.VG.Q/9pyn2/qs/rCOWg.iP/9wa0PJDi', // password123
        role: 'accountant',
        companyId: '7f75539c-6168-4a0a-9519-38e3ee32022b',
        companyName: 'Banna Freight & Logistics Egypt',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'usr-banna-1',
        email: 'admin@banna-logistics.com',
        name: 'عمر البنا',
        passwordHash: '$2b$10$gPv/H3pO6KCokgINtDWTQ.VG.Q/9pyn2/qs/rCOWg.iP/9wa0PJDi', // password123
        role: 'super_admin',
        companyId: '7f75539c-6168-4a0a-9519-38e3ee32022b',
        companyName: 'Banna Freight & Logistics Egypt',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  private seedInitialData() {
    this.seedUsers();
    this.clients = [
      {
        id: 'client-1',
        name: 'Al-Ahram Food Industries',
        tradeName: 'الأهرام للصناعات الغذائية',
        taxNumber: 'EG-TAX-28394721',
        commercialReg: 'CR-2021-8372',
        status: 'active',
        type: 'actual',
        category: 'مصنع ومستورد مواد غذائية',
        address: 'المنطقة الصناعية الثالثة، مدينة 6 أكتوبر، الجيزة',
        city: 'القاهرة / الجيزة',
        country: 'Egypt',
        contactName: 'أحمد محمد الشريف',
        phone: '+20 100 123 4567',
        email: 'ahmed@alahram-foods.com',
        totalShipments: 42,
        totalRevenue: 1450000,
        createdAt: new Date().toISOString(),
        contacts: [
          { id: 'cnt-1', name: 'أحمد محمد الشريف', title: 'مدير سلاسل الإمداد', phone: '+20 100 123 4567', isPrimary: true },
        ],
        salesRep: { id: 'user-sales', name: 'أحمد الشريف', email: 'sales@redshipping.com' },
      },
      {
        id: 'client-2',
        name: 'Delta Chemicals & Polymers',
        tradeName: 'دلتا للكيماويات والبوليمرات',
        taxNumber: 'EG-TAX-99881122',
        commercialReg: 'CR-2019-4412',
        status: 'active',
        type: 'actual',
        category: 'استيراد وتوزيع خامات صناعية',
        address: 'المنطقة الحرة العامة بالعامرية، الإسكندرية',
        city: 'الإسكندرية',
        country: 'Egypt',
        contactName: 'م. إيهاب سلامة',
        phone: '+20 111 987 6543',
        email: 'ehab@deltachem-eg.com',
        totalShipments: 28,
        totalRevenue: 980000,
        createdAt: new Date().toISOString(),
        contacts: [
          { id: 'cnt-2', name: 'م. إيهاب سلامة', title: 'مدير الاستيراد', phone: '+20 111 987 6543', isPrimary: true },
        ],
        salesRep: { id: 'user-sales', name: 'أحمد الشريف', email: 'sales@redshipping.com' },
      },
      {
        id: 'client-3',
        name: 'Nile Electronics & Appliances',
        tradeName: 'النيل للأجهزة الكهربائية والتوزيع',
        taxNumber: 'EG-TAX-55443322',
        commercialReg: 'CR-2022-9011',
        status: 'active',
        type: 'actual',
        category: 'استيراد وتجارة أجهزة كهربائية',
        address: 'شارع التسعين الشمالي، التجمع الخامس، القاهرة الجديدة',
        city: 'القاهرة',
        country: 'Egypt',
        contactName: 'سامح نصار',
        phone: '+20 102 777 8899',
        email: 'sameh@nile-electronics.eg',
        totalShipments: 19,
        totalRevenue: 640000,
        createdAt: new Date().toISOString(),
        contacts: [
          { id: 'cnt-3', name: 'سامح نصار', title: 'رئيس قسم اللوجستيات', phone: '+20 102 777 8899', isPrimary: true },
        ],
        salesRep: { id: 'user-sales', name: 'أحمد الشريف', email: 'sales@redshipping.com' },
      },
      {
        id: 'client-4',
        name: 'El-Badr Solar Solutions',
        tradeName: 'البدر للطاقة المتجددة والخلايا الشمسية',
        taxNumber: '',
        commercialReg: '',
        status: 'prospect',
        type: 'lead',
        category: 'طاقة متجددة واستيراد ألواح',
        address: 'القرية الذكية، الجيزة',
        city: 'الجيزة',
        country: 'Egypt',
        contactName: 'م. شريف البدر',
        phone: '+20 109 444 3322',
        email: 'sherif@elbadr-solar.com',
        commodityInterest: 'ألواح وخلايا كهروضوئية ومحولات طاقة من ميناء نينغبو الصيني',
        totalShipments: 0,
        totalRevenue: 0,
        createdAt: new Date().toISOString(),
        contacts: [],
        salesRep: { id: 'user-sales', name: 'أحمد الشريف', email: 'sales@redshipping.com' },
      },
    ];

    this.shipments = [
      {
        id: 'ship-1',
        jobFileNumber: 'RED-2026-0001',
        shipmentType: 'fcl',
        incoterm: 'FOB',
        currentStage: 'CUSTOMS_CLEARANCE',
        blNumber: 'MSCU8912839',
        vesselName: 'MSC TINA',
        voyageNumber: '2603W',
        etd: new Date(Date.now() - 15 * 86400000).toISOString(),
        eta: new Date(Date.now() - 4 * 86400000).toISOString(),
        ata: new Date(Date.now() - 4 * 86400000).toISOString(),
        freeDaysAllowed: 21,
        cargoDescription: 'Frozen Foodstuffs & Raw Ingredients in Reefer 40HQ',
        grossWeightKg: 24500,
        volumeCbm: 68,
        deliveryOrderNumber: 'DO-MSC-2026-0891',
        deliveryOrderExpiryDate: new Date(Date.now() + 8 * 86400000).toISOString(),
        deliveryOrderStatus: 'VALID',
        createdAt: new Date().toISOString(),
        client: { id: 'client-1', name: 'شركة الأهرام للصناعات الغذائية' },
        originPort: { id: 'port-7', code: 'CNSHA', nameEn: 'Shanghai Port (ميناء شنغهاي)' },
        destinationPort: { id: 'port-1', code: 'EGALY', nameEn: 'Alexandria Port (ميناء الإسكندرية)' },
        shippingLine: { id: 'line-2', name: 'MSC (Mediterranean Shipping Co)' },
        containers: [
          {
            id: 'c-1',
            containerNumber: 'MSKU8849120',
            containerType: '40HQ',
            sealNumber: 'SL-99120',
            status: 'discharged',
            dischargedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
            tareWeightKg: 3820,
            cargoWeightKg: 20680,
            vgmWeightKg: 24500,
            vgmStatus: 'VERIFIED',
          },
        ],
      },
      {
        id: 'ship-2',
        jobFileNumber: 'RED-2026-0002',
        shipmentType: 'fcl',
        incoterm: 'CIF',
        currentStage: 'VESSEL_DEPARTED',
        blNumber: 'MAEU9041280',
        vesselName: 'MAERSK MC-KINNEY MOLLER',
        voyageNumber: '2604W',
        etd: new Date(Date.now() - 5 * 86400000).toISOString(),
        eta: new Date(Date.now() + 14 * 86400000).toISOString(),
        freeDaysAllowed: 14,
        cargoDescription: 'Polymer Raw Granules in 20GP Bags',
        grossWeightKg: 42000,
        volumeCbm: 54,
        deliveryOrderStatus: 'PENDING_ARRIVAL',
        createdAt: new Date().toISOString(),
        client: { id: 'client-2', name: 'مجموعة القاهرة للكيماويات والبوليمر' },
        originPort: { id: 'port-13', code: 'NLRTM', nameEn: 'Rotterdam Port (ميناء روتردام)' },
        destinationPort: { id: 'port-2', code: 'EGDXH', nameEn: 'Dekheila Port (ميناء الدخيلة)' },
        shippingLine: { id: 'line-1', name: 'Maersk Line' },
        containers: [
          {
            id: 'c-2',
            containerNumber: 'MAEU4410921',
            containerType: '20GP',
            sealNumber: 'SL-33412',
            status: 'on_board',
            tareWeightKg: 2200,
            cargoWeightKg: 19800,
            vgmWeightKg: 22000,
            vgmStatus: 'VERIFIED',
          },
        ],
      },
    ];

    this.customs = [
      {
        id: '1',
        acidNumber: '2026-9281-0049-881',
        daysLeft: 42,
        certNumber: '46/2026/8912',
        shipmentFile: 'RED-2026-0001',
        blNumber: 'MSCU8912839',
        client: 'شركة الأهرام للصناعات الغذائية',
        status: 'inspected',
        duties: '145,200 ج.م',
        vat: '82,400 ج.م',
        inspectionDate: '2026-09-22',
        port: 'ميناء الإسكندرية (EGALY)',
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        acidNumber: '2026-8812-4401-209',
        daysLeft: 14,
        certNumber: 'قيد الإصدار',
        shipmentFile: 'RED-2026-0002',
        blNumber: 'MAEU9041280',
        client: 'مجموعة القاهرة للكيماويات والبوليمر',
        status: 'acid_issued',
        duties: 'قيد التقدير',
        vat: 'قيد التقدير',
        inspectionDate: '—',
        port: 'ميناء الدخيلة (EGDXH)',
        createdAt: new Date().toISOString(),
      },
      {
        id: '3',
        acidNumber: '2026-7734-1102-554',
        daysLeft: 71,
        certNumber: '46/2026/9021',
        shipmentFile: 'RED-2026-0003',
        blNumber: 'CMDU5581920',
        client: 'العالمية للاستيراد والتصدير',
        status: 'release_issued',
        duties: '92,000 ج.م',
        vat: '51,500 ج.م',
        inspectionDate: '2026-09-14',
        port: 'ميناء السخنة (EGSOK)',
        createdAt: new Date().toISOString(),
      },
      {
        id: '4',
        acidNumber: '2026-4401-9921-105',
        daysLeft: 8,
        certNumber: 'قيد المراجعة',
        shipmentFile: 'RED-2026-0004',
        blNumber: 'ONEY3382910',
        client: 'النيل للأجهزة المنزلية والكهربائية',
        status: 'acid_issued',
        duties: '210,000 ج.م',
        vat: '115,000 ج.م',
        inspectionDate: '2026-09-21',
        port: 'ميناء دمياط (EGDAM)',
        createdAt: new Date().toISOString(),
      },
    ];

    this.rates = [
      {
        id: 'rate-1',
        shippingLine: 'Maersk Line',
        lineCode: 'MAEU',
        originPort: 'Shanghai Port (ميناء شنغهاي)',
        originPortCode: 'CNSHA',
        destinationPort: 'Alexandria Port (ميناء الإسكندرية)',
        destinationPortCode: 'EGALY',
        rate20GP: 1650,
        rate40HQ: 2300,
        currency: 'USD',
        transitTimeDays: 22,
        freeDays: 14,
        routing: 'Direct',
        validFrom: '2026-09-01',
        validUntil: '2026-09-30',
        notes: 'يشمل مصاريف السوليداريتي BAF وEBS',
        isSpotRate: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'rate-2',
        shippingLine: 'MSC (Mediterranean Shipping Co)',
        lineCode: 'MSCU',
        originPort: 'Shanghai Port (ميناء شنغهاي)',
        originPortCode: 'CNSHA',
        destinationPort: 'Alexandria Port (ميناء الإسكندرية)',
        destinationPortCode: 'EGALY',
        rate20GP: 1550,
        rate40HQ: 2150,
        currency: 'USD',
        transitTimeDays: 26,
        freeDays: 21,
        routing: 'Transshipment',
        transshipmentPort: 'Piraeus (اليونان)',
        validFrom: '2026-09-05',
        validUntil: '2026-09-28',
        notes: '21 يوم سماح غرامات أرضيات (Free Days)',
        isSpotRate: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'rate-3',
        shippingLine: 'COSCO Shipping Lines',
        lineCode: 'COSU',
        originPort: 'Shanghai Port (ميناء شنغهاي)',
        originPortCode: 'CNSHA',
        destinationPort: 'Alexandria Port (ميناء الإسكندرية)',
        destinationPortCode: 'EGALY',
        rate20GP: 1500,
        rate40HQ: 2100,
        currency: 'USD',
        transitTimeDays: 24,
        freeDays: 14,
        routing: 'Direct',
        validFrom: '2026-09-10',
        validUntil: '2026-09-30',
        notes: 'أفضل سعر للحاويات الـ 40HQ',
        isSpotRate: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'rate-4',
        shippingLine: 'CMA CGM Group',
        lineCode: 'CMDU',
        originPort: 'Ningbo Port (ميناء نينغبو)',
        originPortCode: 'CNNGB',
        destinationPort: 'Sokhna Port (ميناء السخنة)',
        destinationPortCode: 'EGSOK',
        rate20GP: 1700,
        rate40HQ: 2400,
        currency: 'USD',
        transitTimeDays: 19,
        freeDays: 14,
        routing: 'Direct',
        validFrom: '2026-09-01',
        validUntil: '2026-10-15',
        notes: 'خدمة مباشرة وسريعة لميناء السخنة',
        isSpotRate: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'rate-5',
        shippingLine: 'Hapag-Lloyd',
        lineCode: 'HLCU',
        originPort: 'Rotterdam Port (ميناء روتردام)',
        originPortCode: 'NLRTM',
        destinationPort: 'Port Said East (شرق بورسعيد)',
        destinationPortCode: 'EGPSD',
        rate20GP: 1100,
        rate40HQ: 1650,
        currency: 'USD',
        transitTimeDays: 11,
        freeDays: 14,
        routing: 'Direct',
        validFrom: '2026-09-01',
        validUntil: '2026-09-30',
        notes: 'رحلة أسبوعية ثابتة كل ثلاثاء',
        isSpotRate: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'rate-6',
        shippingLine: 'ONE (Ocean Network Express)',
        lineCode: 'ONEY',
        originPort: 'Shenzhen Port (ميناء شنتشن)',
        originPortCode: 'CNSZX',
        destinationPort: 'Damietta Port (ميناء دمياط)',
        destinationPortCode: 'EGDAM',
        rate20GP: 1580,
        rate40HQ: 2220,
        currency: 'USD',
        transitTimeDays: 23,
        freeDays: 14,
        routing: 'Direct',
        validFrom: '2026-09-08',
        validUntil: '2026-09-30',
        notes: 'خدمة مباشرة وسريعة لميناء دمياط',
        isSpotRate: true,
        createdAt: new Date().toISOString(),
      },
    ];
  }
}
