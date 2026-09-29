import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * Master Data service — full implementation of the approved spec (الجلسة الفنية الأولى):
 *  1. Dynamic reference libraries (units / logistics categories / port types)
 *  2. Country Atlas — user-managed cities per country
 *  3. Multi-level hierarchy (Line → Branches → Persons in Charge) for
 *     shipping lines, vendors and overseas agents
 *  4. Multi-select services + official registration + expiry dates (vendors/agents)
 *  5. Expiry alerts feed (commercial registries, tax cards, driver licenses)
 */
@Injectable()
export class MastersService {
  private readonly logger = new Logger(MastersService.name);

  constructor(private prisma: PrismaService) {}

  // ═══════════════ DYNAMIC REFERENCE LIBRARIES (المكتبات المرجعية الديناميكية) ═══════════════

  private static readonly LIBRARY_MODELS: Record<string, string> = {
    units: 'measurementUnit',
    'logistics-categories': 'logisticsCategory',
    'port-types': 'portType',
  };

  private static readonly LIBRARY_DEFAULTS: Record<string, Array<{ code: string; nameEn: string; nameAr: string }>> = {
    units: [
      { code: 'container', nameEn: 'Per Container', nameAr: 'بالكونتينر' },
      { code: 'shipment', nameEn: 'Per Shipment', nameAr: 'بالشحنة' },
      { code: 'ton', nameEn: 'Per Ton', nameAr: 'بالطن' },
      { code: 'cbm', nameEn: 'Per CBM', nameAr: 'بالمتر المكعب' },
      { code: 'bl', nameEn: 'Per B/L', nameAr: 'بالبوليصة' },
      { code: 'cube', nameEn: 'Per Cube', nameAr: 'بالكيوب' },
      { code: 'set', nameEn: 'Per Set', nameAr: 'بالعديدة' },
      { code: 'hour', nameEn: 'Per Hour', nameAr: 'بالساعة' },
      { code: 'kg', nameEn: 'Per KG', nameAr: 'بالكيلوجرام' },
      { code: 'day', nameEn: 'Per Day', nameAr: 'باليوم' },
    ],
    'logistics-categories': [
      { code: 'freight', nameEn: 'Ocean Freight', nameAr: 'نولون بحري' },
      { code: 'inland', nameEn: 'Inland Transport', nameAr: 'نقل داخلي / بري' },
      { code: 'thc', nameEn: 'THC', nameAr: 'مصاريف الميناء (THC)' },
      { code: 'clearance', nameEn: 'Customs Clearance', nameAr: 'تخليص جمركي' },
      { code: 'documentation', nameEn: 'Documentation', nameAr: 'مستندات' },
      { code: 'storage', nameEn: 'Storage & Warehousing', nameAr: 'تخزين وخدمات' },
      { code: 'insurance', nameEn: 'Insurance', nameAr: 'تأمين' },
      { code: 'commission', nameEn: 'Commission', nameAr: 'عمولة' },
      { code: 'other', nameEn: 'Other', nameAr: 'أخرى' },
    ],
    'port-types': [
      { code: 'sea', nameEn: 'Sea Port', nameAr: 'ميناء بحري' },
      { code: 'dry', nameEn: 'Dry Port', nameAr: 'ميناء جاف' },
      { code: 'air', nameEn: 'Airport / Air Hub', nameAr: 'مطار / مركز جوي' },
      { code: 'transit', nameEn: 'Transit Port', nameAr: 'ميناء ترانزيت' },
      { code: 'river', nameEn: 'River Port', nameAr: 'ميناء نهري' },
      { code: 'logistics', nameEn: 'Logistics Zone', nameAr: 'منطقة لوجستية' },
    ],
  };

  private libraryModel(lib: string): any {
    const model = MastersService.LIBRARY_MODELS[lib];
    if (!model) throw new BadRequestException(`Unknown library "${lib}" — expected units | logistics-categories | port-types`);
    return (this.prisma as any)[model];
  }

  async getLibrary(tenantId: string, lib: string) {
    const model = this.libraryModel(lib);
    let items = await model.findMany({
      where: { companyId: tenantId },
      orderBy: [{ isActive: 'desc' }, { code: 'asc' }],
    });
    // First use: seed the approved defaults once (idempotent — no manual setup)
    if (items.length === 0) {
      await model.createMany({
        data: MastersService.LIBRARY_DEFAULTS[lib].map((d) => ({ ...d, companyId: tenantId })),
      });
      items = await model.findMany({ where: { companyId: tenantId }, orderBy: { code: 'asc' } });
      this.logger.log(`Seeded default "${lib}" library with ${items.length} items`);
    }
    return items;
  }

  async createLibraryItem(tenantId: string, lib: string, data: any) {
    const model = this.libraryModel(lib);
    const code = String(data?.code || '').trim().toLowerCase().replace(/\s+/g, '_');
    if (!code) throw new BadRequestException('code is required');
    const existing = await model.findFirst({ where: { companyId: tenantId, code } });
    if (existing) throw new BadRequestException(`Item "${code}" already exists in this library`);
    return model.create({
      data: {
        companyId: tenantId,
        code,
        nameEn: String(data.nameEn || code).trim(),
        nameAr: data.nameAr ? String(data.nameAr).trim() : null,
      },
    });
  }

  async updateLibraryItem(tenantId: string, lib: string, id: string, data: any) {
    const model = this.libraryModel(lib);
    const item = await model.findFirst({ where: { id, companyId: tenantId } });
    if (!item) throw new NotFoundException('Library item not found');
    const { id: _ignored, companyId: _c, ...rest } = data || {};
    return model.update({ where: { id }, data: rest });
  }

  async deleteLibraryItem(tenantId: string, lib: string, id: string) {
    const model = this.libraryModel(lib);
    const item = await model.findFirst({ where: { id, companyId: tenantId } });
    if (!item) throw new NotFoundException('Library item not found');
    try {
      await model.delete({ where: { id } });
      return { success: true };
    } catch (err: any) {
      // Library is referenced by charge items / ports — deactivate instead of hard delete
      if (err?.code === 'P2003') {
        await model.update({ where: { id }, data: { isActive: false } });
        return { success: true, deactivated: true, message: 'Item is in use — deactivated instead of deleted' };
      }
      throw err;
    }
  }

  // ═══════════════ COUNTRY ATLAS — CITIES (أطلس الدول: المدن) ═══════════════

  async getCities(tenantId: string, countryCode?: string) {
    return this.prisma.city.findMany({
      where: { companyId: tenantId, ...(countryCode ? { countryCode: countryCode.toUpperCase() } : {}) },
      orderBy: [{ countryCode: 'asc' }, { nameEn: 'asc' }],
    });
  }

  async createCity(tenantId: string, data: any) {
    const countryCode = String(data?.countryCode || '').trim().toUpperCase();
    const nameEn = String(data?.nameEn || '').trim();
    if (!countryCode || countryCode.length !== 2) throw new BadRequestException('A valid 2-letter countryCode is required');
    if (!nameEn) throw new BadRequestException('nameEn is required');
    const existing = await this.prisma.city.findFirst({ where: { companyId: tenantId, countryCode, nameEn } });
    if (existing) throw new BadRequestException('This city already exists for the selected country');
    return this.prisma.city.create({
      data: { companyId: tenantId, countryCode, nameEn, nameAr: data.nameAr ? String(data.nameAr).trim() : null },
    });
  }

  async updateCity(tenantId: string, id: string, data: any) {
    const city = await this.prisma.city.findFirst({ where: { id, companyId: tenantId } });
    if (!city) throw new NotFoundException('City not found');
    const { id: _ignored, companyId: _c, ...rest } = data || {};
    return this.prisma.city.update({ where: { id }, data: rest });
  }

  async deleteCity(tenantId: string, id: string) {
    const city = await this.prisma.city.findFirst({ where: { id, companyId: tenantId } });
    if (!city) throw new NotFoundException('City not found');
    await this.prisma.city.delete({ where: { id } });
    return { success: true };
  }
  // ═══════════════ SHIPPING LINES (الخطوط الملاحية — الهيكل الشجري) ═══════════════

  private static readonly LINE_INCLUDE = {
    branches: { include: { contacts: true }, orderBy: { createdAt: 'asc' as const } },
    contacts: { where: { branchId: null } },
  };

  private contactFields(tenantId: string, c: any) {
    return {
      companyId: tenantId,
      name: String(c?.name || '').trim(),
      title: c?.title || null,
      phone: c?.phone || null,
      mobile: c?.mobile || null,
      email: c?.email || null,
      isPrimary: Boolean(c?.isPrimary),
      notes: c?.notes || null,
    };
  }

  private branchFields(b: any, extra: any) {
    return {
      ...extra,
      code: b?.code || null,
      name: String(b?.name || 'Branch').trim(),
      address: b?.address || null,
      city: b?.city || null,
      countryCode: b?.countryCode ? String(b.countryCode).toUpperCase() : null,
      phone: b?.phone || null,
      email: b?.email || null,
    };
  }

  async getShippingLines(tenantId: string, includeInactive = false) {
    return this.prisma.shippingLine.findMany({
      where: { companyId: tenantId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { name: 'asc' },
      include: MastersService.LINE_INCLUDE,
    });
  }

  private async findShippingLine(tenantId: string, id: string) {
    const line = await this.prisma.shippingLine.findFirst({
      where: { id, companyId: tenantId },
      include: MastersService.LINE_INCLUDE,
    });
    if (!line) throw new NotFoundException('Shipping line not found');
    return line;
  }

  async createShippingLine(tenantId: string, data: any) {
    const { branches, contacts, ...rest } = data || {};
    const line = await this.prisma.shippingLine.create({
      data: {
        name: String(rest.name || '').trim(),
        scac: rest.scac || null,
        website: rest.website || null,
        contactName: rest.contactName || null,
        contactEmail: rest.contactEmail || null,
        contactPhone: rest.contactPhone || null,
        isActive: rest.isActive ?? true,
        companyId: tenantId,
        ...(Array.isArray(branches)
          ? { branches: { create: branches.map((b: any) => ({
              ...this.branchFields(b, { companyId: tenantId }),
              ...(Array.isArray(b?.contacts) && b.contacts.length
                ? { contacts: { create: b.contacts.map((c: any) => this.contactFields(tenantId, c)) } }
                : {}),
            })) } }
          : {}),
        ...(Array.isArray(contacts)
          ? { contacts: { create: contacts.map((c: any) => this.contactFields(tenantId, c)) } }
          : {}),
      },
    });
    return this.findShippingLine(tenantId, line.id);
  }

  async updateShippingLine(tenantId: string, id: string, data: any) {
    await this.findShippingLine(tenantId, id);
    const { branches, contacts, companyId: _c, id: _i, ...rest } = data || {};
    await this.prisma.$transaction(async (tx) => {
      await tx.shippingLine.update({ where: { id }, data: rest });
      if (Array.isArray(branches)) {
        await tx.shippingLineBranch.deleteMany({ where: { shippingLineId: id } });
        for (const b of branches) {
          const { contacts: branchContacts, ...branchScalar } = b;
          await tx.shippingLineBranch.create({
            data: {
              ...this.branchFields(branchScalar, { companyId: tenantId, shippingLineId: id }),
              ...(Array.isArray(branchContacts) && branchContacts.length
                ? { contacts: { create: branchContacts.map((c: any) => this.contactFields(tenantId, c)) } }
                : {}),
            },
          });
        }
      }
      if (Array.isArray(contacts)) {
        await tx.shippingLineContact.deleteMany({ where: { shippingLineId: id, branchId: null } });
        if (contacts.length) {
          await tx.shippingLineContact.createMany({
            data: contacts.map((c: any) => ({
              ...this.contactFields(tenantId, c),
              shippingLineId: id,
              branchId: null,
            })),
          });
        }
      }
    });
    return this.findShippingLine(tenantId, id);
  }

  // ═══════════════ VENDORS (الموردون — خدمات متعددة + اعتمادات رسمية + شجرة اتصال) ═══════════════

  private static readonly VENDOR_INCLUDE = {
    branches: { include: { contacts: true }, orderBy: { createdAt: 'asc' as const } },
    contacts: { where: { branchId: null } },
  };

  private vendorScalar(tenantId: string, data: any) {
    const d = data || {};
    return {
      name: String(d.name || '').trim(),
      vendorType: (d.vendorType || 'trucking') as any,
      services: Array.isArray(d.services) ? d.services.map(String) : [],
      taxId: d.taxId || null,
      contactName: d.contactName || null,
      contactPhone: d.contactPhone || null,
      contactEmail: d.contactEmail || null,
      address: d.address || null,
      phone: d.phone || null,
      commercialReg: d.commercialReg || null,
      crExpiry: d.crExpiry ? new Date(d.crExpiry) : null,
      taxCardNumber: d.taxCardNumber || null,
      taxCardExpiry: d.taxCardExpiry ? new Date(d.taxCardExpiry) : null,
      isActive: d.isActive ?? true,
    };
  }

  async getVendors(tenantId: string, includeInactive = false) {
    return this.prisma.vendor.findMany({
      where: { companyId: tenantId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { name: 'asc' },
      include: MastersService.VENDOR_INCLUDE,
    });
  }

  private async findVendor(tenantId: string, id: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, companyId: tenantId },
      include: MastersService.VENDOR_INCLUDE,
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  async createVendor(tenantId: string, data: any) {
    const { branches, contacts, ...rest } = data || {};
    const vendor = await this.prisma.vendor.create({
      data: {
        ...this.vendorScalar(tenantId, rest),
        companyId: tenantId,
        ...(Array.isArray(branches)
          ? { branches: { create: branches.map((b: any) => ({
              ...this.branchFields(b, { companyId: tenantId }),
              ...(Array.isArray(b?.contacts) && b.contacts.length
                ? { contacts: { create: b.contacts.map((c: any) => this.contactFields(tenantId, c)) } }
                : {}),
            })) } }
          : {}),
        ...(Array.isArray(contacts)
          ? { contacts: { create: contacts.map((c: any) => this.contactFields(tenantId, c)) } }
          : {}),
      },
    });
    return this.findVendor(tenantId, vendor.id);
  }

  async updateVendor(tenantId: string, id: string, data: any) {
    await this.findVendor(tenantId, id);
    const { branches, contacts, companyId: _c, id: _i, ...rest } = data || {};
    await this.prisma.$transaction(async (tx) => {
      await tx.vendor.update({ where: { id }, data: this.vendorScalar(tenantId, rest) });
      if (Array.isArray(branches)) {
        await tx.vendorBranch.deleteMany({ where: { vendorId: id } });
        for (const b of branches) {
          const { contacts: branchContacts, ...branchScalar } = b;
          await tx.vendorBranch.create({
            data: {
              ...this.branchFields(branchScalar, { companyId: tenantId, vendorId: id }),
              ...(Array.isArray(branchContacts) && branchContacts.length
                ? { contacts: { create: branchContacts.map((c: any) => this.contactFields(tenantId, c)) } }
                : {}),
            },
          });
        }
      }
      if (Array.isArray(contacts)) {
        await tx.vendorContact.deleteMany({ where: { vendorId: id, branchId: null } });
        if (contacts.length) {
          await tx.vendorContact.createMany({
            data: contacts.map((c: any) => ({ ...this.contactFields(tenantId, c), vendorId: id, branchId: null })),
          });
        }
      }
    });
    return this.findVendor(tenantId, id);
  }
  // ═══════════════ OVERSEAS AGENTS (وكلاء الشحن بالخارج — نفس الهيكل الشجري) ═══════════════

  private static readonly AGENT_INCLUDE = {
    branches: { include: { contacts: true }, orderBy: { createdAt: 'asc' as const } },
    contacts: { where: { branchId: null } },
  };

  private agentScalar(d: any) {
    return {
      name: String(d?.name || '').trim(),
      countryCode: String(d?.countryCode || '').trim().toUpperCase(),
      city: String(d?.city || '').trim(),
      contactPerson: d?.contactPerson || null,
      contactEmail: d?.contactEmail || null,
      contactPhone: d?.contactPhone || null,
      specialization: d?.specialization || null,
      services: Array.isArray(d?.services) ? d.services.map(String) : [],
      isActive: d?.isActive ?? true,
    };
  }

  async getOverseasAgents(tenantId: string, includeInactive = false) {
    return this.prisma.overseasAgent.findMany({
      where: { companyId: tenantId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { name: 'asc' },
      include: MastersService.AGENT_INCLUDE,
    });
  }

  private async findOverseasAgent(tenantId: string, id: string) {
    const agent = await this.prisma.overseasAgent.findFirst({
      where: { id, companyId: tenantId },
      include: MastersService.AGENT_INCLUDE,
    });
    if (!agent) throw new NotFoundException('Overseas agent not found');
    return agent;
  }

  async createOverseasAgent(tenantId: string, data: any) {
    const { branches, contacts, ...rest } = data || {};
    const agent = await this.prisma.overseasAgent.create({
      data: {
        ...this.agentScalar(rest),
        companyId: tenantId,
        ...(Array.isArray(branches)
          ? { branches: { create: branches.map((b: any) => ({
              ...this.branchFields(b, { companyId: tenantId }),
              ...(Array.isArray(b?.contacts) && b.contacts.length
                ? { contacts: { create: b.contacts.map((c: any) => this.contactFields(tenantId, c)) } }
                : {}),
            })) } }
          : {}),
        ...(Array.isArray(contacts)
          ? { contacts: { create: contacts.map((c: any) => this.contactFields(tenantId, c)) } }
          : {}),
      },
    });
    return this.findOverseasAgent(tenantId, agent.id);
  }

  async updateOverseasAgent(tenantId: string, id: string, data: any) {
    await this.findOverseasAgent(tenantId, id);
    const { branches, contacts, companyId: _c, id: _i, ...rest } = data || {};
    await this.prisma.$transaction(async (tx) => {
      await tx.overseasAgent.update({ where: { id }, data: this.agentScalar(rest) });
      if (Array.isArray(branches)) {
        await tx.overseasAgentBranch.deleteMany({ where: { overseasAgentId: id } });
        for (const b of branches) {
          const { contacts: branchContacts, ...branchScalar } = b;
          await tx.overseasAgentBranch.create({
            data: {
              ...this.branchFields(branchScalar, { companyId: tenantId, overseasAgentId: id }),
              ...(Array.isArray(branchContacts) && branchContacts.length
                ? { contacts: { create: branchContacts.map((c: any) => this.contactFields(tenantId, c)) } }
                : {}),
            },
          });
        }
      }
      if (Array.isArray(contacts)) {
        await tx.overseasAgentContact.deleteMany({ where: { overseasAgentId: id, branchId: null } });
        if (contacts.length) {
          await tx.overseasAgentContact.createMany({
            data: contacts.map((c: any) => ({ ...this.contactFields(tenantId, c), overseasAgentId: id, branchId: null })),
          });
        }
      }
    });
    return this.findOverseasAgent(tenantId, id);
  }

  // ═══════════════ DRIVERS (السائقون) ═══════════════

  async getDrivers(tenantId: string, includeInactive = false) {
    return this.prisma.driver.findMany({
      where: { companyId: tenantId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { name: 'asc' },
    });
  }

  async updateDriver(tenantId: string, id: string, data: any) {
    const driver = await this.prisma.driver.findFirst({ where: { id, companyId: tenantId } });
    if (!driver) throw new NotFoundException('Driver not found');
    const { companyId: _c, id: _i, ...rest } = data || {};
    if (rest.licenseExpiry) rest.licenseExpiry = new Date(rest.licenseExpiry);
    return this.prisma.driver.update({ where: { id }, data: rest });
  }

  async createDriver(tenantId: string, data: any) {
    return this.prisma.driver.create({
      data: {
        name: String(data.name || '').trim(),
        phone: data.phone || null,
        nationalId: data.nationalId || null,
        licenseNumber: data.licenseNumber || null,
        licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry) : null,
        truckPlate: data.truckPlate || null,
        trailerPlate: data.trailerPlate || null,
        truckType: data.truckType || null,
        vendorId: data.vendorId || null,
        notes: data.notes || null,
        companyId: tenantId,
      },
    });
  }

  // ═══════════════ CHARGE ITEMS (البنود العامة — مرتبطة بالمكتبات الديناميكية) ═══════════════

  private static readonly CHARGE_ITEM_INCLUDE = { unit: true, categoryRef: true };

  async getChargeItems(tenantId: string, context?: string) {
    const where: any = { companyId: tenantId, isActive: true };
    if (context === 'pricing') where.showInPricing = true;
    if (context === 'quotation') where.showInQuotation = true;
    if (context === 'invoice') where.showInInvoice = true;
    if (context === 'disbursement') where.showInDisbursement = true;
    if (context === 'commission') where.showInCommission = true;
    if (context === 'operations') where.showInOperations = true;

    return this.prisma.chargeItem.findMany({
      where,
      orderBy: { nameEn: 'asc' },
      include: MastersService.CHARGE_ITEM_INCLUDE,
    });
  }

  private chargeItemScalar(d: any) {
    return {
      code: String(d?.code || '').trim(),
      nameEn: String(d?.nameEn || '').trim(),
      nameAr: String(d?.nameAr || '').trim(),
      category: String(d?.category || 'other').trim(),
      categoryId: d?.categoryId || null,
      unitId: d?.unitId || null,
      notes: d?.notes || null,
      showInPricing: d?.showInPricing ?? true,
      showInQuotation: d?.showInQuotation ?? true,
      showInInvoice: d?.showInInvoice ?? true,
      showInDisbursement: d?.showInDisbursement ?? false,
      showInCommission: d?.showInCommission ?? false,
      showInOperations: d?.showInOperations ?? false,
      isActive: d?.isActive ?? true,
    };
  }

  async createChargeItem(tenantId: string, data: any) {
    const item = await this.prisma.chargeItem.create({
      data: { ...this.chargeItemScalar(data), companyId: tenantId },
    });
    return this.prisma.chargeItem.findFirst({
      where: { id: item.id },
      include: MastersService.CHARGE_ITEM_INCLUDE,
    });
  }

  async updateChargeItem(tenantId: string, id: string, data: any) {
    const item = await this.prisma.chargeItem.findFirst({ where: { id, companyId: tenantId } });
    if (!item) throw new NotFoundException('Charge item not found');
    await this.prisma.chargeItem.update({
      where: { id },
      data: this.chargeItemScalar(data),
    });
    return this.prisma.chargeItem.findFirst({
      where: { id },
      include: MastersService.CHARGE_ITEM_INCLUDE,
    });
  }

  async deleteChargeItem(tenantId: string, id: string) {
    const item = await this.prisma.chargeItem.findFirst({ where: { id, companyId: tenantId } });
    if (!item) throw new NotFoundException('Charge item not found');
    // Soft delete — historical documents reference charge items
    await this.prisma.chargeItem.update({ where: { id }, data: { isActive: false } });
    return { success: true };
  }

  // ═══════════════ EXPIRY ALERTS FEED (محرك تنبيهات تواريخ الانتهاء — Alarms) ═══════════════

  async getExpiryAlerts(tenantId: string) {
    const [vendors, drivers] = await Promise.all([
      this.prisma.vendor.findMany({
        where: { companyId: tenantId, isActive: true },
        select: { id: true, name: true, commercialReg: true, crExpiry: true, taxCardNumber: true, taxCardExpiry: true },
      }),
      this.prisma.driver.findMany({
        where: { companyId: tenantId, isActive: true },
        select: { id: true, name: true, licenseNumber: true, licenseExpiry: true, truckPlate: true },
      }),
    ]);

    const daysOf = (d: Date) => Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
    const levelOf = (n: number) => (n < 0 ? 'expired' : n <= 7 ? 'critical' : n <= 30 ? 'warning' : 'ok');

    const alerts: any[] = [];
    for (const v of vendors) {
      if (v.crExpiry) {
        const days = daysOf(v.crExpiry);
        alerts.push({
          type: 'vendor_commercial_reg', entityType: 'vendor', entityId: v.id, entityName: v.name,
          labelAr: 'انتهاء السجل التجاري', labelEn: 'Commercial Registration Expiry',
          reference: v.commercialReg, expiryDate: v.crExpiry, daysRemaining: days, level: levelOf(days),
        });
      }
      if (v.taxCardExpiry) {
        const days = daysOf(v.taxCardExpiry);
        alerts.push({
          type: 'vendor_tax_card', entityType: 'vendor', entityId: v.id, entityName: v.name,
          labelAr: 'انتهاء البطاقة الضريبية', labelEn: 'Tax Card Expiry',
          reference: v.taxCardNumber, expiryDate: v.taxCardExpiry, daysRemaining: days, level: levelOf(days),
        });
      }
    }
    for (const d of drivers) {
      if (d.licenseExpiry) {
        const days = daysOf(d.licenseExpiry);
        alerts.push({
          type: 'driver_license', entityType: 'driver', entityId: d.id, entityName: d.name,
          labelAr: 'انتهاء رخصة القيادة', labelEn: 'Driver License Expiry',
          reference: d.licenseNumber, expiryDate: d.licenseExpiry, daysRemaining: days, level: levelOf(days),
          extra: d.truckPlate || undefined,
        });
      }
    }
    return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  // ═══════════════ PORTS (سجل الموانئ — مع مكتبة أنواع الموانئ) ═══════════════

  async getPorts(tenantId: string, includeInactive = false) {
    return this.prisma.port.findMany({
      where: { OR: [{ companyId: null }, { companyId: tenantId }], ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { nameEn: 'asc' },
      include: { portTypeRef: true },
    });
  }

  async createPort(tenantId: string, data: any) {
    return this.prisma.port.create({
      data: {
        companyId: tenantId,
        code: String(data?.code || '').trim().toUpperCase(),
        nameEn: String(data?.nameEn || '').trim(),
        nameAr: data?.nameAr || null,
        countryCode: String(data?.countryCode || '').trim().toUpperCase(),
        portType: String(data?.portType || 'sea').trim(),
        portTypeId: data?.portTypeId || null,
      },
    });
  }

  async updatePort(tenantId: string, id: string, data: any) {
    const port = await this.prisma.port.findFirst({ where: { id, companyId: tenantId } });
    if (!port) throw new NotFoundException('Port not found');
    const { id: _i, companyId: _c, ...rest } = data || {};
    if (rest.portType === undefined) delete rest.portType;
    return this.prisma.port.update({ where: { id }, data: rest });
  }
}