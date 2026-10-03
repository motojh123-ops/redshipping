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
      { code: 'origin_charges', nameEn: 'Origin Charges', nameAr: 'مصاريف ميناء المنشأ' },
      { code: 'destination_charges', nameEn: 'Destination Charges', nameAr: 'مصاريف ميناء الوصول' },
      { code: 'customs_clearance', nameEn: 'Customs Clearance', nameAr: 'تخليص جمركي' },
      { code: 'inland_haulage', nameEn: 'Inland Haulage', nameAr: 'نقل بري داخلي' },
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

  /** optional numeric input → number | null */
  private static toNumberOrNull(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  async createCity(tenantId: string, data: any) {
    const countryCode = String(data?.countryCode || '').trim().toUpperCase();
    const nameEn = String(data?.nameEn || '').trim();
    if (!countryCode || countryCode.length !== 2) throw new BadRequestException('A valid 2-letter countryCode is required');
    if (!nameEn) throw new BadRequestException('nameEn is required');
    const existing = await this.prisma.city.findFirst({ where: { companyId: tenantId, countryCode, nameEn } });
    if (existing) throw new BadRequestException('This city already exists for the selected country');

    const latitude = MastersService.toNumberOrNull(data?.latitude);
    const longitude = MastersService.toNumberOrNull(data?.longitude);
    if (latitude !== null && (latitude < -90 || latitude > 90)) throw new BadRequestException('latitude must be between -90 and 90');
    if (longitude !== null && (longitude < -180 || longitude > 180)) throw new BadRequestException('longitude must be between -180 and 180');

    return this.prisma.city.create({
      data: {
        companyId: tenantId,
        countryCode,
        nameEn,
        nameAr: data?.nameAr ? String(data.nameAr).trim() : null,
        state: data?.state ? String(data.state).trim() : null,
        cityCode: data?.cityCode ? String(data.cityCode).trim().toUpperCase() : null,
        timezone: data?.timezone ? String(data.timezone).trim() : null,
        latitude,
        longitude,
        isLogisticsHub: data?.isLogisticsHub === undefined ? false : Boolean(data.isLogisticsHub),
        notes: data?.notes ? String(data.notes).trim() : null,
        isActive: data?.isActive === undefined ? true : Boolean(data.isActive),
      },
    });
  }

  async updateCity(tenantId: string, id: string, data: any) {
    const city = await this.prisma.city.findFirst({ where: { id, companyId: tenantId } });
    if (!city) throw new NotFoundException('City not found');

    const payload: any = {};
    if (data?.nameEn !== undefined) {
      const nameEn = String(data.nameEn).trim();
      if (!nameEn) throw new BadRequestException('nameEn cannot be empty');
      payload.nameEn = nameEn;
    }
    if (data?.nameAr !== undefined) payload.nameAr = data.nameAr ? String(data.nameAr).trim() : null;
    if (data?.state !== undefined) payload.state = data.state ? String(data.state).trim() : null;
    if (data?.cityCode !== undefined) payload.cityCode = data.cityCode ? String(data.cityCode).trim().toUpperCase() : null;
    if (data?.timezone !== undefined) payload.timezone = data.timezone ? String(data.timezone).trim() : null;
    if (data?.latitude !== undefined) {
      const lat = MastersService.toNumberOrNull(data.latitude);
      if (lat !== null && (lat < -90 || lat > 90)) throw new BadRequestException('latitude must be between -90 and 90');
      payload.latitude = lat;
    }
    if (data?.longitude !== undefined) {
      const lng = MastersService.toNumberOrNull(data.longitude);
      if (lng !== null && (lng < -180 || lng > 180)) throw new BadRequestException('longitude must be between -180 and 180');
      payload.longitude = lng;
    }
    if (data?.isLogisticsHub !== undefined) payload.isLogisticsHub = Boolean(data.isLogisticsHub);
    if (data?.notes !== undefined) payload.notes = data.notes ? String(data.notes).trim() : null;
    if (data?.isActive !== undefined) payload.isActive = Boolean(data.isActive);

    return this.prisma.city.update({ where: { id }, data: payload });
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
    // Sequential writes (no interactive transaction — the Neon HTTP driver on
    // Workers does not support transactions). On mid-failure the caller gets
    // the error and the UI re-saves the full hierarchy.
    await this.prisma.shippingLine.update({ where: { id }, data: rest });
    if (Array.isArray(branches)) {
      await this.prisma.shippingLineBranch.deleteMany({ where: { shippingLineId: id } });
      for (const b of branches) {
        const { contacts: branchContacts, ...branchScalar } = b;
        await this.prisma.shippingLineBranch.create({
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
      await this.prisma.shippingLineContact.deleteMany({ where: { shippingLineId: id, branchId: null } });
      if (contacts.length) {
        await this.prisma.shippingLineContact.createMany({
          data: contacts.map((c: any) => ({
            ...this.contactFields(tenantId, c),
            shippingLineId: id,
            branchId: null,
          })),
        });
      }
    }
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
    const existing = await this.findVendor(tenantId, id);
    const { branches, contacts, companyId: _c, id: _i, ...rest } = data || {};
    // Merge with the current record so partial PATCHes (e.g. { isActive }) never wipe fields
    const merged = { ...existing, ...rest };
    // Sequential writes (no interactive transaction — the Neon HTTP driver on
    // Workers does not support transactions). On mid-failure the caller gets
    // the error and the UI re-saves the full hierarchy.
    await this.prisma.vendor.update({ where: { id }, data: this.vendorScalar(tenantId, merged) });
    if (Array.isArray(branches)) {
      await this.prisma.vendorBranch.deleteMany({ where: { vendorId: id } });
      for (const b of branches) {
        const { contacts: branchContacts, ...branchScalar } = b;
        await this.prisma.vendorBranch.create({
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
      await this.prisma.vendorContact.deleteMany({ where: { vendorId: id, branchId: null } });
      if (contacts.length) {
        await this.prisma.vendorContact.createMany({
          data: contacts.map((c: any) => ({ ...this.contactFields(tenantId, c), vendorId: id, branchId: null })),
        });
      }
    }
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
    const existing = await this.findOverseasAgent(tenantId, id);
    const { branches, contacts, companyId: _c, id: _i, ...rest } = data || {};
    // Merge with the current record so partial PATCHes (e.g. { isActive }) never wipe fields
    const merged = { ...existing, ...rest };
    // Sequential writes (no interactive transaction — the Neon HTTP driver on
    // Workers does not support transactions). On mid-failure the caller gets
    // the error and the UI re-saves the full hierarchy.
    await this.prisma.overseasAgent.update({ where: { id }, data: this.agentScalar(merged) });
    if (Array.isArray(branches)) {
      await this.prisma.overseasAgentBranch.deleteMany({ where: { overseasAgentId: id } });
      for (const b of branches) {
        const { contacts: branchContacts, ...branchScalar } = b;
        await this.prisma.overseasAgentBranch.create({
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
      await this.prisma.overseasAgentContact.deleteMany({ where: { overseasAgentId: id, branchId: null } });
      if (contacts.length) {
        await this.prisma.overseasAgentContact.createMany({
          data: contacts.map((c: any) => ({ ...this.contactFields(tenantId, c), overseasAgentId: id, branchId: null })),
        });
      }
    }
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
    // Merge with the current record so partial PATCHes never wipe fields
    const merged = { ...item, ...data };
    await this.prisma.chargeItem.update({
      where: { id },
      data: this.chargeItemScalar(merged),
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

  async getPorts(tenantId: string, includeInactive = false, countryCode?: string) {
    return this.prisma.port.findMany({
      where: {
        OR: [{ companyId: null }, { companyId: tenantId }],
        ...(includeInactive ? {} : { isActive: true }),
        ...(countryCode ? { countryCode: countryCode.toUpperCase() } : {}),
      },
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

  // ═══════════════ ENTITY DOCUMENTS (مرفقات السجلات الرسمية) ═══════════════
  // Attach scans of commercial registrations, tax cards, licenses… to any
  // master entity. Files are stored as base64 directly in PostgreSQL because
  // Cloudflare Workers have no filesystem (4MB practical limit per file).

  private static readonly DOC_CATEGORIES = new Set([
    'commercial_reg', 'tax_card', 'bl', 'packing_list', 'commercial_invoice',
    'acid_cert', 'cert_of_origin', 'eur1', 'customs_declaration',
    'delivery_order', 'disbursement_receipt', 'other',
  ]);

  private static readonly DOC_ENTITY_TYPES: Record<string, string> = {
    vendor: 'vendor',
    shipping_line: 'shippingLine',
    overseas_agent: 'overseasAgent',
    driver: 'driver',
  };

  private async assertDocEntity(tenantId: string, entityType: string, entityId: string) {
    const model = MastersService.DOC_ENTITY_TYPES[entityType];
    if (!model) throw new BadRequestException(`Unsupported entityType: ${entityType}`);
    const found = await (this.prisma as any)[model].findFirst({ where: { id: entityId, companyId: tenantId } });
    if (!found) throw new NotFoundException('Target entity not found');
    return found;
  }

  async getEntityDocuments(tenantId: string, entityType: string, entityId: string) {
    await this.assertDocEntity(tenantId, entityType, entityId);
    return this.prisma.entityDocument.findMany({
      where: { companyId: tenantId, entityType, entityId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, entityType: true, entityId: true, category: true,
        fileName: true, fileSize: true, mimeType: true,
        expiryDate: true, createdAt: true,
      },
    });
  }

  async uploadEntityDocument(tenantId: string, userId: string, data: any) {
    const entityType = String(data?.entityType || '').trim();
    const entityId = String(data?.entityId || '').trim();
    const category = String(data?.category || 'other').trim();
    const fileName = String(data?.fileName || '').trim();
    const mimeType = String(data?.mimeType || 'application/octet-stream').trim();
    const b64 = String(data?.dataBase64 || '').replace(/^data:[^,]+,/, '');

    await this.assertDocEntity(tenantId, entityType, entityId);
    if (!MastersService.DOC_CATEGORIES.has(category)) {
      throw new BadRequestException('Invalid document category');
    }
    if (!fileName) throw new BadRequestException('fileName is required');
    if (!b64) throw new BadRequestException('dataBase64 is required');

    const sizeBytes = Math.floor((b64.length * 3) / 4);
    if (sizeBytes > 4 * 1024 * 1024) {
      throw new BadRequestException('الملف أكبر من الحد المسموح (4 ميجابايت)');
    }

    return this.prisma.entityDocument.create({
      data: {
        companyId: tenantId,
        entityType,
        entityId,
        category: category as any,
        fileName: fileName.slice(0, 250),
        fileSize: sizeBytes,
        mimeType: mimeType.slice(0, 95),
        storageKey: 'db:base64',
        data: b64,
        expiryDate: data?.expiryDate ? new Date(data.expiryDate) : null,
        uploadedById: userId,
      },
      select: {
        id: true, entityType: true, entityId: true, category: true,
        fileName: true, fileSize: true, mimeType: true,
        expiryDate: true, createdAt: true,
      },
    });
  }

  async downloadEntityDocument(tenantId: string, id: string) {
    const doc = await this.prisma.entityDocument.findFirst({ where: { id, companyId: tenantId } });
    if (!doc) throw new NotFoundException('Document not found');
    if (!doc.data) throw new NotFoundException('Document payload is not stored in the database');
    return { fileName: doc.fileName, mimeType: doc.mimeType, data: doc.data };
  }

  async deleteEntityDocument(tenantId: string, id: string) {
    const doc = await this.prisma.entityDocument.findFirst({ where: { id, companyId: tenantId } });
    if (!doc) throw new NotFoundException('Document not found');
    await this.prisma.entityDocument.delete({ where: { id } });
    return { success: true };
  }
}