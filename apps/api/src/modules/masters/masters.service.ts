import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class MastersService {
  private readonly logger = new Logger(MastersService.name);

  constructor(private prisma: PrismaService) {}

  // =================== PORTS ===================
  async getPorts(tenantId: string) {
    return this.prisma.port.findMany({
      where: {
        OR: [{ companyId: null }, { companyId: tenantId }],
        isActive: true,
      },
      orderBy: { nameEn: 'asc' },
    });
  }

  // =================== SHIPPING LINES ===================
  async getShippingLines(tenantId: string, includeInactive = false) {
    return this.prisma.shippingLine.findMany({
      where: { companyId: tenantId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { name: 'asc' },
    });
  }

  async updateShippingLine(tenantId: string, id: string, data: any) {
    const { companyId, id: _ignored, ...rest } = data || {};
    return this.prisma.shippingLine.update({
      where: { id },
      data: rest,
    });
  }

  async createShippingLine(tenantId: string, data: any) {
    return this.prisma.shippingLine.create({
      data: {
        ...data,
        companyId: tenantId,
      },
    });
  }

  // =================== OVERSEAS AGENTS ===================
  async getOverseasAgents(tenantId: string, includeInactive = false) {
    return this.prisma.overseasAgent.findMany({
      where: { companyId: tenantId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { name: 'asc' },
    });
  }

  async updateOverseasAgent(tenantId: string, id: string, data: any) {
    const { companyId, id: _ignored, ...rest } = data || {};
    return this.prisma.overseasAgent.update({
      where: { id },
      data: rest,
    });
  }

  async createOverseasAgent(tenantId: string, data: any) {
    return this.prisma.overseasAgent.create({
      data: {
        ...data,
        companyId: tenantId,
      },
    });
  }

  // =================== VENDORS ===================
  async getVendors(tenantId: string, includeInactive = false) {
    return this.prisma.vendor.findMany({
      where: { companyId: tenantId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { name: 'asc' },
    });
  }

  async updateVendor(tenantId: string, id: string, data: any) {
    const { companyId, id: _ignored, ...rest } = data || {};
    return this.prisma.vendor.update({
      where: { id },
      data: rest,
    });
  }

  async createVendor(tenantId: string, data: any) {
    return this.prisma.vendor.create({
      data: {
        ...data,
        companyId: tenantId,
      },
    });
  }

  // =================== DRIVERS (السائقون) ===================
  async getDrivers(tenantId: string, includeInactive = false) {
    return this.prisma.driver.findMany({
      where: { companyId: tenantId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { name: 'asc' },
    });
  }

  async updateDriver(tenantId: string, id: string, data: any) {
    const { companyId, id: _ignored, ...rest } = data || {};
    if (rest.licenseExpiry) rest.licenseExpiry = new Date(rest.licenseExpiry);
    return this.prisma.driver.update({
      where: { id },
      data: rest,
    });
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

  // =================== CHARGE ITEMS (البنود) ===================
  async getChargeItems(tenantId: string, context?: 'pricing' | 'quotation' | 'invoice') {
    const where: any = { companyId: tenantId, isActive: true };
    if (context === 'pricing') where.showInPricing = true;
    if (context === 'quotation') where.showInQuotation = true;
    if (context === 'invoice') where.showInInvoice = true;

    return this.prisma.chargeItem.findMany({
      where,
      orderBy: { nameEn: 'asc' },
    });
  }

  async createChargeItem(tenantId: string, data: any) {
    return this.prisma.chargeItem.create({
      data: {
        ...data,
        companyId: tenantId,
      },
    });
  }
}
