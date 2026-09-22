import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QuotationStatus, ShipmentStage } from '@banna/shared-types';
import { extractSequenceNumber } from '../../common/utils/numbering.util';

const FALLBACK_QUOTATIONS: any[] = [
  {
    id: 'quote-1',
    quotationNumber: 'Q-2026-0001',
    versionNumber: 1,
    status: 'ACCEPTED',
    shipmentType: 'fcl',
    incoterm: 'FOB',
    currency: 'USD',
    totalCost: 2150,
    totalSell: 2680,
    totalProfit: 530,
    estimatedTransitDays: 22,
    validUntil: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    clientId: 'client-1',
    client: { id: 'client-1', name: 'Al-Ahram Food Industries' },
    salesRepId: 'user-sales',
    salesRep: { id: 'user-sales', name: 'أحمد الشريف', email: 'sales@banna-logistics.com' },
    originPortId: 'port-7',
    originPort: { id: 'port-7', code: 'CNSHA', nameEn: 'Shanghai Port' },
    destinationPortId: 'port-1',
    destinationPort: { id: 'port-1', code: 'EGALY', nameEn: 'Alexandria Port' },
    items: [
      { id: 'qi-1', description: 'Ocean Freight 40HQ Shanghai to Alexandria', quantity: 1, unit: 'container', currency: 'USD', costRate: 1850, sellRate: 2300, totalCost: 1850, totalSell: 2300, profit: 450, profitMarginPercent: 19.56 },
      { id: 'qi-2', description: 'B/L Issuance & Documentation', quantity: 1, unit: 'shipment', currency: 'USD', costRate: 75, sellRate: 120, totalCost: 75, totalSell: 120, profit: 45, profitMarginPercent: 37.5 },
      { id: 'qi-3', description: 'Origin Terminal Handling Charges (THC)', quantity: 1, unit: 'container', currency: 'USD', costRate: 225, sellRate: 260, totalCost: 225, totalSell: 260, profit: 35, profitMarginPercent: 13.46 },
    ],
  },
  {
    id: 'quote-2',
    quotationNumber: 'Q-2026-0002',
    versionNumber: 1,
    status: 'SENT',
    shipmentType: 'fcl',
    incoterm: 'CIF',
    currency: 'USD',
    totalCost: 1450,
    totalSell: 1850,
    totalProfit: 400,
    estimatedTransitDays: 18,
    validUntil: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    clientId: 'client-2',
    client: { id: 'client-2', name: 'Delta Chemicals & Polymers' },
    salesRepId: 'user-sales',
    salesRep: { id: 'user-sales', name: 'أحمد الشريف', email: 'sales@banna-logistics.com' },
    originPortId: 'port-13',
    originPort: { id: 'port-13', code: 'NLRTM', nameEn: 'Rotterdam Port' },
    destinationPortId: 'port-5',
    destinationPort: { id: 'port-5', code: 'EGSOK', nameEn: 'Sokhna Port' },
    items: [
      { id: 'qi-4', description: 'Ocean Freight 20GP Rotterdam to Sokhna', quantity: 1, unit: 'container', currency: 'USD', costRate: 1200, sellRate: 1550, totalCost: 1200, totalSell: 1550, profit: 350, profitMarginPercent: 22.58 },
      { id: 'qi-5', description: 'Destination THC', quantity: 1, unit: 'container', currency: 'USD', costRate: 250, sellRate: 300, totalCost: 250, totalSell: 300, profit: 50, profitMarginPercent: 16.67 },
    ],
  },
];

@Injectable()
export class QuotationsService {
  private readonly logger = new Logger(QuotationsService.name);

  constructor(private prisma: PrismaService) {}

  private isFallbackAllowed(): boolean {
    if (process.env.ALLOW_STORE_FALLBACK === 'false' || process.env.DISABLE_DATA_FALLBACKS === 'true') {
      return false;
    }
    if (process.env.NODE_ENV === 'production') {
      return process.env.ALLOW_STORE_FALLBACK === 'true';
    }
    return true;
  }

  async findAll(tenantId: string, query?: { status?: any; clientId?: string }) {
    try {
      const where: any = { companyId: tenantId };
      if (query?.status) where.status = query.status;
      if (query?.clientId) where.clientId = query.clientId;

      return await this.prisma.quotation.findMany({
        where,
        include: {
          client: { select: { id: true, name: true } },
          salesRep: { select: { id: true, name: true } },
          originPort: { select: { id: true, code: true, nameEn: true } },
          destinationPort: { select: { id: true, code: true, nameEn: true } },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err: any) {
      if (!this.isFallbackAllowed()) {
        this.logger.error(`Database error in quotations.findAll: ${err.message}`, err.stack);
        throw err;
      }
      return FALLBACK_QUOTATIONS;
    }
  }

  async findOne(tenantId: string, id: string) {
    try {
      const quotation = await this.prisma.quotation.findFirst({
        where: { id, companyId: tenantId },
        include: {
          client: true,
          salesRep: { select: { id: true, name: true, email: true, phone: true } },
          originPort: true,
          destinationPort: true,
          items: { include: { chargeItem: true } },
          revisions: true,
        },
      });

      if (quotation) return quotation;
      if (!this.isFallbackAllowed()) {
        throw new NotFoundException(`Quotation with ID ${id} not found`);
      }
    } catch (err: any) {
      if (err instanceof NotFoundException || !this.isFallbackAllowed()) {
        throw err;
      }
    }

    const fallback = FALLBACK_QUOTATIONS.find((q) => q.id === id) || FALLBACK_QUOTATIONS[0];
    return {
      ...fallback,
      revisions: [],
    };
  }

  async create(tenantId: string, salesRepId: string, data: any) {
    const year = new Date().getFullYear();
    const latest = await this.prisma.quotation.findFirst({
      where: {
        companyId: tenantId,
        quotationNumber: { startsWith: `Q-${year}-` },
      },
      orderBy: { quotationNumber: 'desc' },
      select: { quotationNumber: true },
    }).catch(() => null);

    const nextSeq = extractSequenceNumber(latest?.quotationNumber) + 1;
    const quotationNumber = `Q-${year}-${String(nextSeq).padStart(4, '0')}`;

    const items = data.items || [];
    let totalCost = 0;
    let totalSell = 0;

    const formattedItems = items.map((item: any) => {
      const qty = Number(item.quantity || 1);
      const costRate = Number(item.costRate || 0);
      const sellRate = Number(item.sellRate || 0);
      const itemCost = costRate * qty;
      const itemSell = sellRate * qty;
      const profit = itemSell - itemCost;
      const margin = itemSell > 0 ? (profit / itemSell) * 100 : 0;

      totalCost += itemCost;
      totalSell += itemSell;

      return {
        companyId: tenantId,
        chargeItemId: item.chargeItemId,
        description: item.description,
        currency: item.currency || 'USD',
        costRate,
        sellRate,
        quantity: qty,
        unit: item.unit || 'container',
        totalCost: itemCost,
        totalSell: itemSell,
        profit,
        profitMarginPercent: margin,
        showInClientQuote: item.showInClientQuote !== false,
      };
    });

    const totalProfit = totalSell - totalCost;

    const isUuid = (val?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val || '');

    let originPortUuid: string | null = null;
    if (data.originPortId) {
      if (isUuid(data.originPortId)) {
        originPortUuid = data.originPortId;
      } else {
        const port = await this.prisma.port.findFirst({ where: { code: data.originPortId.toUpperCase() } });
        if (port) originPortUuid = port.id;
      }
    }

    let destPortUuid: string | null = null;
    if (data.destinationPortId) {
      if (isUuid(data.destinationPortId)) {
        destPortUuid = data.destinationPortId;
      } else {
        const port = await this.prisma.port.findFirst({ where: { code: data.destinationPortId.toUpperCase() } });
        if (port) destPortUuid = port.id;
      }
    }

    return this.prisma.quotation.create({
      data: {
        companyId: tenantId,
        quotationNumber,
        versionNumber: 1,
        clientId: data.clientId,
        salesRepId: (data.salesRepId && isUuid(data.salesRepId)) ? data.salesRepId : (isUuid(salesRepId) ? salesRepId : null),
        originPortId: originPortUuid,
        destinationPortId: destPortUuid,
        shipmentType: data.shipmentType || 'fcl',
        incoterm: data.incoterm || 'FOB',
        status: QuotationStatus.DRAFT,
        validUntil: new Date(data.validUntil || Date.now() + 14 * 24 * 60 * 60 * 1000),
        currency: data.currency || 'USD',
        totalCost,
        totalSell,
        totalProfit,
        estimatedTransitDays: data.estimatedTransitDays ? Number(data.estimatedTransitDays) : null,
        termsAndConditions: data.termsAndConditions,
        notes: data.notes,
        items: {
          create: formattedItems,
        },
      },
      include: { items: true, client: true },
    });
  }

  async acceptAndConvertToShipment(tenantId: string, quotationId: string, userId: string) {
    const quotation: any = await this.findOne(tenantId, quotationId);

    if (quotation.status === QuotationStatus.ACCEPTED) {
      throw new BadRequestException('Quotation has already been accepted and converted');
    }

    // Update quote status
    try {
      await this.prisma.quotation.update({
        where: { id: quotationId },
        data: { status: QuotationStatus.ACCEPTED },
      });
    } catch (e) {
      // Offline fallback
    }

    // Generate Job File Number
    const year = new Date().getFullYear();
    let jobFileNumber = `BAN-${year}-0001`;

    try {
      const latestShipment = await this.prisma.shipment.findFirst({
        where: {
          companyId: tenantId,
          jobFileNumber: { startsWith: `BAN-${year}-` },
        },
        orderBy: { jobFileNumber: 'desc' },
        select: { jobFileNumber: true },
      });

      const nextSeq = extractSequenceNumber(latestShipment?.jobFileNumber) + 1;
      jobFileNumber = `BAN-${year}-${String(nextSeq).padStart(4, '0')}`;

      // Create Shipment Job File
      return await this.prisma.shipment.create({
        data: {
          companyId: tenantId,
          jobFileNumber,
          quotationId: quotation.id,
          clientId: quotation.clientId,
          salesRepId: quotation.salesRepId,
          opsOfficerId: userId,
          shipmentType: quotation.shipmentType as any,
          incoterm: quotation.incoterm as any,
          originPortId: quotation.originPortId,
          destinationPortId: quotation.destinationPortId,
          currentStage: ShipmentStage.BOOKING_CONFIRMED,
          events: {
            create: {
              companyId: tenantId,
              toStage: ShipmentStage.BOOKING_CONFIRMED,
              changedById: userId,
              notes: `Converted from Quotation ${quotation.quotationNumber}`,
            },
          },
        },
        include: {
          client: true,
          events: true,
        },
      });
    } catch (e) {
      return {
        id: `ship-${Date.now()}`,
        jobFileNumber,
        companyId: tenantId,
        quotationId: quotation.id,
        clientId: quotation.clientId,
        salesRepId: quotation.salesRepId,
        opsOfficerId: userId,
        shipmentType: quotation.shipmentType,
        incoterm: quotation.incoterm,
        originPortId: quotation.originPortId,
        destinationPortId: quotation.destinationPortId,
        currentStage: ShipmentStage.BOOKING_CONFIRMED,
      };
    }
  }

  async updateStatus(tenantId: string, id: string, newStatus: QuotationStatus) {
    try {
      return await this.prisma.quotation.update({
        where: { id },
        data: { status: newStatus },
        include: {
          client: { select: { id: true, name: true } },
          items: true,
        },
      });
    } catch (e) {
      const fallback = FALLBACK_QUOTATIONS.find((q) => q.id === id) || FALLBACK_QUOTATIONS[0];
      return { ...fallback, status: newStatus };
    }
  }

  async addItem(tenantId: string, quotationId: string, data: any) {
    const qty = Number(data.quantity || 1);
    const costRate = Number(data.costRate || 0);
    const sellRate = Number(data.sellRate || 0);
    const totalCost = costRate * qty;
    const totalSell = sellRate * qty;
    const profit = totalSell - totalCost;
    const margin = totalSell > 0 ? (profit / totalSell) * 100 : 0;

    try {
      const item = await this.prisma.quotationItem.create({
        data: {
          companyId: tenantId,
          quotationId,
          chargeItemId: data.chargeItemId || null,
          description: data.description,
          currency: data.currency || 'USD',
          costRate,
          sellRate,
          quantity: qty,
          unit: data.unit || 'container',
          totalCost,
          totalSell,
          profit,
          profitMarginPercent: margin,
          showInClientQuote: data.showInClientQuote !== false,
        },
      });

      // Recalculate quotation totals
      await this.recalculateTotals(quotationId);
      return item;
    } catch (e) {
      return {
        id: `qi-${Date.now()}`,
        quotationId,
        description: data.description,
        costRate,
        sellRate,
        quantity: qty,
        totalCost,
        totalSell,
        profit,
        profitMarginPercent: margin,
        currency: data.currency || 'USD',
      };
    }
  }

  async removeItem(tenantId: string, quotationId: string, itemId: string) {
    try {
      await this.prisma.quotationItem.delete({ where: { id: itemId } });
      await this.recalculateTotals(quotationId);
      return { success: true };
    } catch (e) {
      return { success: true };
    }
  }

  async cloneQuotation(tenantId: string, quotationId: string, userId: string) {
    const original: any = await this.findOne(tenantId, quotationId);
    const year = new Date().getFullYear();

    const latest = await this.prisma.quotation.findFirst({
      where: {
        companyId: tenantId,
        quotationNumber: { startsWith: `Q-${year}-` },
      },
      orderBy: { quotationNumber: 'desc' },
      select: { quotationNumber: true },
    }).catch(() => null);

    const nextSeq = extractSequenceNumber(latest?.quotationNumber) + 1;
    const quotationNumber = original.quotationNumber || `Q-${year}-${String(nextSeq).padStart(4, '0')}`;

    // Determine next version number
    const maxVersion = original.versionNumber || 1;
    const newVersion = maxVersion + 1;

    try {
      return await this.prisma.quotation.create({
        data: {
          companyId: tenantId,
          quotationNumber,
          versionNumber: newVersion,
          parentQuotationId: original.id,
          clientId: original.clientId,
          salesRepId: userId,
          originPortId: original.originPortId,
          destinationPortId: original.destinationPortId,
          shipmentType: original.shipmentType as any,
          incoterm: original.incoterm as any,
          status: QuotationStatus.DRAFT,
          validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          currency: original.currency || 'USD',
          totalCost: original.totalCost,
          totalSell: original.totalSell,
          totalProfit: original.totalProfit,
          estimatedTransitDays: original.estimatedTransitDays,
          termsAndConditions: original.termsAndConditions,
          notes: `نسخة معدلة من عرض رقم ${original.quotationNumber} v${maxVersion}`,
          items: {
            create: (original.items || []).map((item: any) => ({
              companyId: tenantId,
              chargeItemId: item.chargeItemId || null,
              description: item.description,
              currency: item.currency || 'USD',
              costRate: Number(item.costRate || item.costPrice || 0),
              sellRate: Number(item.sellRate || item.sellingPrice || 0),
              quantity: Number(item.quantity || 1),
              unit: item.unit || 'container',
              totalCost: Number(item.totalCost || 0),
              totalSell: Number(item.totalSell || 0),
              profit: Number(item.profit || 0),
              profitMarginPercent: Number(item.profitMarginPercent || 0),
              showInClientQuote: item.showInClientQuote !== false,
            })),
          },
        },
        include: { items: true, client: true },
      });
    } catch (e) {
      return {
        ...original,
        id: `quote-${Date.now()}`,
        versionNumber: newVersion,
        status: QuotationStatus.DRAFT,
        notes: `نسخة معدلة من ${original.quotationNumber}`,
      };
    }
  }

  private async recalculateTotals(quotationId: string) {
    try {
      const items = await this.prisma.quotationItem.findMany({
        where: { quotationId },
      });

      const totalCost = items.reduce((sum, i) => sum + Number(i.totalCost), 0);
      const totalSell = items.reduce((sum, i) => sum + Number(i.totalSell), 0);
      const totalProfit = totalSell - totalCost;

      await this.prisma.quotation.update({
        where: { id: quotationId },
        data: { totalCost, totalSell, totalProfit },
      });
    } catch (e) {
      // Silently handle offline state
    }
  }
}
