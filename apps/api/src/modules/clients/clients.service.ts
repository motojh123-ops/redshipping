import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CLIENT_STATUS_VALUES = ['prospect', 'active', 'inactive', 'blacklisted'];

/** Shared include for list/detail payloads (سجل العملاء والشركات — جلسة 3) */
const CLIENT_INCLUDE = {
  contacts: true,
  branches: {
    include: {
      contacts: true,
      cityRef: { select: { id: true, nameEn: true, nameAr: true, countryCode: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  salesRep: { select: { id: true, name: true, email: true } },
  companyType: { select: { id: true, code: true, nameEn: true, nameAr: true } },
  industrySector: { select: { id: true, code: true, nameEn: true, nameAr: true } },
  cityRef: { select: { id: true, nameEn: true, nameAr: true, countryCode: true } },
  _count: { select: { quotations: true, shipments: true, branches: true } },
};

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(private prisma: PrismaService) { }

  async findAll(tenantId: string, query?: { status?: any; search?: string; full?: string }) {
    const where: any = { companyId: tenantId };
    if (query?.status && query.status !== 'all') where.status = query.status;
    if (query?.search) {
      const s = query.search;
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { nameAr: { contains: s } },
        { tradeName: { contains: s, mode: 'insensitive' } },
        { taxNumber: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s } },
        { email: { contains: s, mode: 'insensitive' } },
      ];
    }

    const list = await this.prisma.client.findMany({
      where,
      include: CLIENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    if (list.length > 0) {
      const ids = list.map((c) => c.id);
      const [docs, invoices] = await Promise.all([
        this.prisma.entityDocument.findMany({
          where: { companyId: tenantId, entityType: 'client', entityId: { in: ids } },
          select: {
            id: true, entityId: true, category: true, fileName: true,
            fileSize: true, mimeType: true, expiryDate: true, createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.invoice.findMany({
          where: { companyId: tenantId, clientId: { in: ids }, status: { not: 'cancelled' } },
          select: {
            clientId: true, status: true, total: true, currency: true, exchangeRate: true,
          },
        }),
      ]);

      const docsByClient = new Map<string, any[]>();
      for (const d of docs) {
        const arr = docsByClient.get(d.entityId) || [];
        arr.push(d);
        docsByClient.set(d.entityId, arr);
      }

      const finByClient = new Map<string, { billed: number; paid: number }>();
      for (const inv of invoices) {
        const rate = Number(inv.exchangeRate || 1) > 0 ? Number(inv.exchangeRate || 1) : 1;
        const amount = Math.round(Number(inv.total || 0) * rate);
        const cur = finByClient.get(inv.clientId) || { billed: 0, paid: 0 };
        cur.billed += amount;
        if (inv.status === 'paid') {
          cur.paid += amount;
        }
        finByClient.set(inv.clientId, cur);
      }

      return list.map((c) => {
        const fin = finByClient.get(c.id) || { billed: 0, paid: 0 };
        return {
          ...c,
          entityDocuments: docsByClient.get(c.id) || [],
          totalShipments: c._count?.shipments ?? 0,
          totalRevenue: fin.billed,
          totalPaid: fin.paid,
          outstandingBalance: Math.max(0, fin.billed - fin.paid),
        };
      });
    }

    return list;
  }

  async findOne(tenantId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, companyId: tenantId },
      include: {
        ...CLIENT_INCLUDE,
        branches: { include: { contacts: true, cityRef: true }, orderBy: { createdAt: 'asc' } },
        crmActivities: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        quotations: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            originPort: { select: { id: true, code: true, nameEn: true, nameAr: true } },
            destinationPort: { select: { id: true, code: true, nameEn: true, nameAr: true } },
            clearancePort: { select: { id: true, code: true, nameEn: true, nameAr: true } },
            pickupBranch: { select: { id: true, name: true, address: true } },
          },
        },
        shipments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            originPort: { select: { id: true, code: true, nameEn: true, nameAr: true } },
            destinationPort: { select: { id: true, code: true, nameEn: true, nameAr: true } },
            shippingLine: true,
            containers: { select: { id: true, containerNumber: true, containerType: true } },
          },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            shipment: { select: { id: true, jobFileNumber: true } },
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    // Official documents (سجل تجاري / بطاقة ضريبية / سجل مستوردين — §5أ)
    // stored polymorphically in entity_documents → fetched separately
    const entityDocuments = await this.prisma.entityDocument.findMany({
      where: { companyId: tenantId, entityType: 'client', entityId: id },
      select: {
        id: true, category: true, fileName: true, fileSize: true,
        mimeType: true, expiryDate: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeInvoices = (client.invoices || []).filter((inv: any) => inv.status !== 'cancelled');
    let totalRevenue = 0;
    let totalPaid = 0;
    for (const inv of activeInvoices) {
      const rate = Number(inv.exchangeRate || 1) > 0 ? Number(inv.exchangeRate || 1) : 1;
      const amount = Math.round(Number(inv.total || 0) * rate);
      totalRevenue += amount;
      if (inv.status === 'paid') {
        totalPaid += amount;
      }
    }
    const outstandingBalance = Math.max(0, totalRevenue - totalPaid);

    return {
      ...client,
      entityDocuments,
      totalShipments: client._count?.shipments ?? client.shipments?.length ?? 0,
      totalRevenue,
      totalPaid,
      outstandingBalance,
    };
  }

  /** Validate a tenant-scoped FK (company type / industry sector / city) */
  private async resolveRef(
    tenantId: string,
    model: 'companyType' | 'industrySector' | 'city',
    id: string | null | undefined,
    labelAr: string,
  ): Promise<string | null> {
    if (!id) return null;
    const found = await (this.prisma as any)[model].findFirst({ where: { id, companyId: tenantId } });
    if (!found) throw new BadRequestException(`${labelAr} غير موجود في المرجعيات`);
    return found.id;
  }

  /** Map request body → client scalar fields (quick entry §2 + master completion §5) */
  private clientScalar(rest: any): any {
    const data: any = {
      name: String(rest.name || '').trim(),
      nameAr: rest.nameAr ? String(rest.nameAr).trim() : null,
      tradeName: rest.tradeName ? String(rest.tradeName).trim() : null,
      taxNumber: rest.taxNumber ? String(rest.taxNumber).trim() : null,
      commercialReg: rest.commercialReg ? String(rest.commercialReg).trim() : null,
      taxCardNumber: rest.taxCardNumber ? String(rest.taxCardNumber).trim() : null,
      importerRegistryNumber: rest.importerRegistryNumber ? String(rest.importerRegistryNumber).trim() : null,
      commercialRegExpiry: rest.commercialRegExpiry ? new Date(rest.commercialRegExpiry) : null,
      taxCardExpiry: rest.taxCardExpiry ? new Date(rest.taxCardExpiry) : null,
      importerRegistryExpiry: rest.importerRegistryExpiry ? new Date(rest.importerRegistryExpiry) : null,
      category: rest.category ? String(rest.category).trim() : null,
      address: rest.address ? String(rest.address).trim() : null,
      city: rest.city ? String(rest.city).trim() : null,
      country: rest.country ? String(rest.country).trim() : 'Egypt',
      countryCode: rest.countryCode ? String(rest.countryCode).trim().toUpperCase() : null,
      phone: rest.phone ? String(rest.phone).trim() : null,
      email: rest.email ? String(rest.email).trim() : null,
      website: rest.website ? String(rest.website).trim() : null,
      personInCharge: rest.personInCharge ? String(rest.personInCharge).trim() : null,
      notes: rest.notes ? String(rest.notes).trim() : null,
    };
    if (rest.salesRepId && UUID_RE.test(rest.salesRepId)) data.salesRepId = rest.salesRepId;
    return data;
  }

  async create(tenantId: string, data: any) {
    const { contacts, type, contactName, contactMobile, contactEmail, contactTitle, ...rest } = data;

    // §1: الإضافة الموحدة — كل إدخال سريع يبدأ «مستهدف (Prospect)»
    // ويُرقّى تلقائياً إلى «فعلي» عند قبول أول عرض سعر (quotations.accept)
    let clientStatus: string = 'prospect';
    if (rest.status && CLIENT_STATUS_VALUES.includes(String(rest.status).toLowerCase())) {
      clientStatus = String(rest.status).toLowerCase();
    } else if (type === 'lead') {
      clientStatus = 'prospect';
    }

    const companyTypeId = await this.resolveRef(tenantId, 'companyType', rest.companyTypeId, 'نوع الشركة المختار');
    const industrySectorId = await this.resolveRef(tenantId, 'industrySector', rest.industrySectorId, 'قطاع النشاط المختار');
    const cityId = await this.resolveRef(tenantId, 'city', rest.cityId, 'المدينة المختارة');
    if (cityId && rest.countryCode) {
      const city = await this.prisma.city.findUnique({ where: { id: cityId } });
      if (city && city.countryCode !== String(rest.countryCode).toUpperCase()) {
        throw new BadRequestException('المدينة المختارة لا تتبع الدولة المختارة');
      }
    }

    // Handle contacts array or single Person-in-Charge fallback
    const contactList = Array.isArray(contacts) ? contacts : [];
    if (contactList.length === 0 && (contactName || contactMobile || contactEmail || rest.personInCharge)) {
      contactList.push({
        name: contactName || rest.personInCharge || String(rest.name || '').trim(),
        title: contactTitle || 'مسؤول الاتصال',
        mobile: contactMobile || rest.phone || null,
        email: contactEmail || rest.email || null,
        isPrimary: true,
      });
    }

    try {
      return await this.prisma.client.create({
        data: {
          companyId: tenantId,
          ...this.clientScalar(rest),
          status: clientStatus as any,
          companyTypeId,
          industrySectorId,
          cityId,
          contacts: contactList.length > 0
            ? {
              create: contactList.map((c: any) => ({
                companyId: tenantId,
                name: String(c.name || rest.name || '').trim(),
                title: c.title ? String(c.title).trim() : null,
                phone: c.phone ? String(c.phone).trim() : null,
                mobile: c.mobile ? String(c.mobile).trim() : null,
                email: c.email ? String(c.email).trim() : null,
                isPrimary: Boolean(c.isPrimary),
                notes: c.notes ? String(c.notes).trim() : null,
              })),
            }
            : undefined,
        },
        include: CLIENT_INCLUDE,
      });
    } catch (err: any) {
      this.logger.error(`Database error in clients.create: ${err.message}`, err.stack);
      throw err;
    }
  }

  async update(tenantId: string, id: string, data: any) {
    const existing = await this.prisma.client.findFirst({ where: { id, companyId: tenantId } });
    if (!existing) throw new NotFoundException(`Client with ID ${id} not found`);

    const { contacts, branches, status, companyTypeId, industrySectorId, cityId, ...rest } = data || {};

    const payload: any = this.clientScalar(rest);
    // Partial-PATCH semantics: drop any key not actually present in the body
    for (const k of Object.keys(payload)) {
      if (rest[k] === undefined) delete payload[k];
    }

    if (status !== undefined) {
      if (!CLIENT_STATUS_VALUES.includes(String(status).toLowerCase())) {
        throw new BadRequestException('حالة العميل غير صالحة');
      }
      payload.status = String(status).toLowerCase();
      if (payload.status === 'active' && existing.status !== 'active' && !existing.convertedAt) {
        payload.convertedAt = new Date();
      }
    }
    if (companyTypeId !== undefined) {
      payload.companyTypeId = await this.resolveRef(tenantId, 'companyType', companyTypeId, 'نوع الشركة المختار');
    }
    if (industrySectorId !== undefined) {
      payload.industrySectorId = await this.resolveRef(tenantId, 'industrySector', industrySectorId, 'قطاع النشاط المختار');
    }
    if (cityId !== undefined) {
      payload.cityId = await this.resolveRef(tenantId, 'city', cityId, 'المدينة المختارة');
      if (payload.cityId && rest.countryCode) {
        const city = await this.prisma.city.findUnique({ where: { id: payload.cityId } });
        if (city && city.countryCode !== String(rest.countryCode).toUpperCase()) {
          throw new BadRequestException('المدينة المختارة لا تتبع الدولة المختارة');
        }
      }
    }

    if (Object.keys(payload).length > 0) {
      await this.prisma.client.update({ where: { id }, data: payload });
    }

    // ── Multi-level hierarchy sync (الفروع ومسؤولي كل فرع — مطابق للخطوط الملاحية والوكلاء) ──
    if (Array.isArray(branches)) {
      const existingBranches = await this.prisma.clientBranch.findMany({
        where: { clientId: id, companyId: tenantId },
      });
      const existingBranchIds = new Set(existingBranches.map((b) => b.id));
      const validBranches = branches.filter((b: any) => String(b?.name || '').trim());
      const incomingIds = new Set(
        validBranches.map((b: any) => b.id).filter((bid: any) => bid && existingBranchIds.has(bid)),
      );

      // Remove branches that were deleted in the tree editor
      for (const eb of existingBranches) {
        if (!incomingIds.has(eb.id)) {
          await this.prisma.clientContact.deleteMany({ where: { branchId: eb.id, clientId: id } });
          try {
            await this.prisma.clientBranch.delete({ where: { id: eb.id } });
          } catch {
            await this.prisma.clientBranch.update({ where: { id: eb.id }, data: { isActive: false } });
          }
        }
      }

      // Upsert incoming branches and their nested contacts (مسؤولو الفرع)
      for (const b of validBranches) {
        const bCityId = b.cityId ? await this.resolveRef(tenantId, 'city', b.cityId, 'المدينة المختارة') : null;
        const branchContacts = Array.isArray(b.contacts)
          ? b.contacts.filter((c: any) => String(c?.name || '').trim())
          : null;

        if (b.id && existingBranchIds.has(b.id)) {
          await this.prisma.clientBranch.update({
            where: { id: b.id },
            data: { ...this.branchScalar(b), ...(b.cityId !== undefined ? { cityId: bCityId } : {}) },
          });
          if (branchContacts !== null) {
            await this.prisma.clientContact.deleteMany({ where: { branchId: b.id, clientId: id } });
            for (const c of branchContacts) {
              await this.prisma.clientContact.create({
                data: {
                  companyId: tenantId,
                  clientId: id,
                  branchId: b.id,
                  name: String(c.name).trim(),
                  title: c.title ? String(c.title).trim() : null,
                  phone: c.phone ? String(c.phone).trim() : null,
                  mobile: c.mobile ? String(c.mobile).trim() : null,
                  email: c.email ? String(c.email).trim() : null,
                  isPrimary: Boolean(c.isPrimary),
                  notes: c.notes ? String(c.notes).trim() : null,
                },
              });
            }
          }
        } else {
          const createdBranch = await this.prisma.clientBranch.create({
            data: {
              companyId: tenantId,
              clientId: id,
              ...this.branchScalar(b),
              cityId: bCityId,
            },
          });
          if (branchContacts && branchContacts.length > 0) {
            for (const c of branchContacts) {
              await this.prisma.clientContact.create({
                data: {
                  companyId: tenantId,
                  clientId: id,
                  branchId: createdBranch.id,
                  name: String(c.name).trim(),
                  title: c.title ? String(c.title).trim() : null,
                  phone: c.phone ? String(c.phone).trim() : null,
                  mobile: c.mobile ? String(c.mobile).trim() : null,
                  email: c.email ? String(c.email).trim() : null,
                  isPrimary: Boolean(c.isPrimary),
                  notes: c.notes ? String(c.notes).trim() : null,
                },
              });
            }
          }
        }
      }
    }

    // ── Company-level Persons in Charge (الأشخاص المسؤولون على مستوى الشركة) ──
    if (Array.isArray(contacts)) {
      await this.prisma.clientContact.deleteMany({
        where: { clientId: id, companyId: tenantId, branchId: null },
      });
      const validContacts = contacts.filter((c: any) => String(c?.name || '').trim());
      for (const c of validContacts) {
        await this.prisma.clientContact.create({
          data: {
            companyId: tenantId,
            clientId: id,
            branchId: c.branchId || null,
            name: String(c.name).trim(),
            title: c.title ? String(c.title).trim() : null,
            phone: c.phone ? String(c.phone).trim() : null,
            mobile: c.mobile ? String(c.mobile).trim() : null,
            email: c.email ? String(c.email).trim() : null,
            isPrimary: Boolean(c.isPrimary),
            notes: c.notes ? String(c.notes).trim() : null,
          },
        });
      }
    }

    return this.findOne(tenantId, id);
  }

  // ═══════════════ BRANCHES — الفروع وعناوين التحميل (§5ب) ═══════════════

  private branchScalar(b: any): any {
    return {
      name: String(b?.name || '').trim(),
      address: b?.address ? String(b.address).trim() : null,
      city: b?.city ? String(b.city).trim() : null,
      countryCode: b?.countryCode ? String(b.countryCode).toUpperCase() : null,
      phone: b?.phone ? String(b.phone).trim() : null,
      email: b?.email ? String(b.email).trim() : null,
      isLoadingAddress: b?.isLoadingAddress === undefined ? false : Boolean(b.isLoadingAddress),
      isActive: b?.isActive === undefined ? true : Boolean(b.isActive),
    };
  }

  private async assertClient(tenantId: string, clientId: string) {
    const client = await this.prisma.client.findFirst({ where: { id: clientId, companyId: tenantId } });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  private async assertBranch(tenantId: string, clientId: string, branchId: string) {
    const branch = await this.prisma.clientBranch.findFirst({
      where: { id: branchId, clientId, companyId: tenantId },
    });
    if (!branch) throw new NotFoundException('Branch not found for this client');
    return branch;
  }

  async addBranch(tenantId: string, clientId: string, data: any) {
    await this.assertClient(tenantId, clientId);
    const name = String(data?.name || '').trim();
    if (!name) throw new BadRequestException('اسم الفرع مطلوب');
    const cityId = await this.resolveRef(tenantId, 'city', data?.cityId, 'المدينة المختارة');
    const branchContacts = Array.isArray(data?.contacts)
      ? data.contacts.filter((c: any) => String(c?.name || '').trim())
      : [];
    const created = await this.prisma.clientBranch.create({
      data: { companyId: tenantId, ...this.branchScalar(data), clientId, cityId },
    });
    for (const c of branchContacts) {
      await this.prisma.clientContact.create({
        data: {
          companyId: tenantId,
          clientId,
          branchId: created.id,
          name: String(c.name).trim(),
          title: c.title ? String(c.title).trim() : null,
          phone: c.phone ? String(c.phone).trim() : null,
          mobile: c.mobile ? String(c.mobile).trim() : null,
          email: c.email ? String(c.email).trim() : null,
          isPrimary: Boolean(c.isPrimary),
          notes: c.notes ? String(c.notes).trim() : null,
        },
      });
    }
    return this.prisma.clientBranch.findUnique({
      where: { id: created.id },
      include: { contacts: true, cityRef: true },
    });
  }

  async updateBranch(tenantId: string, clientId: string, branchId: string, data: any) {
    await this.assertBranch(tenantId, clientId, branchId);
    const payload = this.branchScalar(data);
    for (const k of Object.keys(payload)) {
      if (data[k] === undefined) delete payload[k];
    }
    if (data?.cityId !== undefined) {
      payload.cityId = await this.resolveRef(tenantId, 'city', data.cityId, 'المدينة المختارة');
    }
    if (Object.keys(payload).length > 0) {
      await this.prisma.clientBranch.update({
        where: { id: branchId },
        data: payload,
      });
    }
    if (Array.isArray(data?.contacts)) {
      await this.prisma.clientContact.deleteMany({ where: { branchId, clientId } });
      const branchContacts = data.contacts.filter((c: any) => String(c?.name || '').trim());
      for (const c of branchContacts) {
        await this.prisma.clientContact.create({
          data: {
            companyId: tenantId,
            clientId,
            branchId,
            name: String(c.name).trim(),
            title: c.title ? String(c.title).trim() : null,
            phone: c.phone ? String(c.phone).trim() : null,
            mobile: c.mobile ? String(c.mobile).trim() : null,
            email: c.email ? String(c.email).trim() : null,
            isPrimary: Boolean(c.isPrimary),
            notes: c.notes ? String(c.notes).trim() : null,
          },
        });
      }
    }
    return this.prisma.clientBranch.findUnique({
      where: { id: branchId },
      include: { contacts: true, cityRef: true },
    });
  }

  async deleteBranch(tenantId: string, clientId: string, branchId: string) {
    await this.assertBranch(tenantId, clientId, branchId);
    await this.prisma.clientBranch.delete({ where: { id: branchId } });
    return { success: true };
  }

  // ═══════════════ CONTACTS — جهات الاتصال (مع ربط اختياري بفرع) ═══════════════

  async addContact(tenantId: string, clientId: string, data: any) {
    await this.assertClient(tenantId, clientId);
    const name = String(data?.name || '').trim();
    if (!name) throw new BadRequestException('اسم جهة الاتصال مطلوب');
    if (data?.branchId) await this.assertBranch(tenantId, clientId, data.branchId);
    return this.prisma.clientContact.create({
      data: {
        companyId: tenantId,
        clientId,
        branchId: data?.branchId || null,
        name,
        title: data?.title ? String(data.title).trim() : null,
        phone: data?.phone ? String(data.phone).trim() : null,
        mobile: data?.mobile ? String(data.mobile).trim() : null,
        email: data?.email ? String(data.email).trim() : null,
        isPrimary: Boolean(data?.isPrimary),
        notes: data?.notes ? String(data.notes).trim() : null,
      },
    });
  }

  async updateContact(tenantId: string, clientId: string, contactId: string, data: any) {
    const contact = await this.prisma.clientContact.findFirst({
      where: { id: contactId, clientId, companyId: tenantId },
    });
    if (!contact) throw new NotFoundException('Contact not found for this client');
    const payload: any = {};
    for (const k of ['name', 'title', 'phone', 'mobile', 'email', 'notes']) {
      if (data?.[k] !== undefined) {
        payload[k] = data[k] === null || data[k] === '' ? null : String(data[k]).trim();
      }
    }
    if (data?.isPrimary !== undefined) payload.isPrimary = Boolean(data.isPrimary);
    if (data?.branchId !== undefined) {
      if (data.branchId) await this.assertBranch(tenantId, clientId, data.branchId);
      payload.branchId = data.branchId || null;
    }
    return this.prisma.clientContact.update({ where: { id: contactId }, data: payload });
  }

  async deleteContact(tenantId: string, clientId: string, contactId: string) {
    const contact = await this.prisma.clientContact.findFirst({
      where: { id: contactId, clientId, companyId: tenantId },
    });
    if (!contact) throw new NotFoundException('Contact not found for this client');
    await this.prisma.clientContact.delete({ where: { id: contactId } });
    return { success: true };
  }

  async addActivity(tenantId: string, clientId: string, userId: string, data: any) {
    await this.assertClient(tenantId, clientId);
    return this.prisma.crmActivity.create({
      data: {
        activityType: data.activityType,
        subject: data.subject ?? null,
        body: data.body ?? null,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        completedAt: data.completedAt ? new Date(data.completedAt) : null,
        clientId,
        userId,
        companyId: tenantId,
      },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  async updateActivity(tenantId: string, clientId: string, activityId: string, data: any) {
    const act = await this.prisma.crmActivity.findFirst({
      where: { id: activityId, clientId, companyId: tenantId },
    });
    if (!act) throw new NotFoundException('Activity not found for this client');
    const payload: any = {};
    if (data?.subject !== undefined) payload.subject = data.subject;
    if (data?.body !== undefined) payload.body = data.body;
    if (data?.scheduledAt !== undefined) {
      payload.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
    }
    if (data?.completedAt !== undefined) {
      payload.completedAt = data.completedAt ? new Date(data.completedAt) : null;
    }
    return this.prisma.crmActivity.update({
      where: { id: activityId },
      data: payload,
      include: { user: { select: { id: true, name: true } } },
    });
  }
}
