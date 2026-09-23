import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QuotationStatus, ShipmentStage } from '@banna/shared-types';
import { extractSequenceNumber } from '../../common/utils/numbering.util';

@Injectable()
export class QuotationsService {
  private readonly logger = new Logger(QuotationsService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query?: { status?: any; clientId?: string }) {
    const where: any = { companyId: tenantId };
    if (query?.status) where.status = query.status;
    if (query?.clientId) where.clientId = query.clientId;

    return this.prisma.quotation.findMany({
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
  }

  async findOne(tenantId: string, id: string) {
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

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID ${id} not found`);
    }
    return quotation;
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
        chargeItemId: item.chargeItemId || null,
        description: item.description || 'بند شحن',
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

    let destinationPortUuid: string | null = null;
    if (data.destinationPortId) {
      if (isUuid(data.destinationPortId)) {
        destinationPortUuid = data.destinationPortId;
      } else {
        const port = await this.prisma.port.findFirst({ where: { code: data.destinationPortId.toUpperCase() } });
        if (port) destinationPortUuid = port.id;
      }
    }

    let shipmentType: any = (data.shipmentType || 'fcl').toString().toLowerCase();
    if (!['fcl', 'lcl', 'air', 'land', 'clearance_only'].includes(shipmentType)) {
      shipmentType = 'fcl';
    }

    let incoterm: any = (data.incoterm || 'FOB').toString().toUpperCase();
    const validIncoterms = ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF'];
    if (!validIncoterms.includes(incoterm)) {
      incoterm = 'FOB';
    }

    try {
      return await this.prisma.quotation.create({
        data: {
          companyId: tenantId,
          quotationNumber,
          versionNumber: 1,
          clientId: data.clientId,
          salesRepId: isUuid(salesRepId) ? salesRepId : (await this.prisma.user.findFirst({ where: { companyId: tenantId } }))!.id,
          originPortId: originPortUuid,
          destinationPortId: destinationPortUuid,
          shipmentType,
          incoterm,
          status: QuotationStatus.DRAFT,
          validUntil: data.validUntil ? new Date(data.validUntil) : new Date(Date.now() + 14 * 24 * 3600 * 1000),
          currency: data.currency || 'USD',
          totalCost,
          totalSell,
          totalProfit,
          estimatedTransitDays: data.estimatedTransitDays ? Number(data.estimatedTransitDays) : null,
          termsAndConditions: data.termsAndConditions || null,
          notes: data.notes || null,
          items: {
            create: formattedItems,
          },
        },
        include: { items: true, client: true },
      });
    } catch (err: any) {
      this.logger.error(`Database error creating quotation: ${err.message}`, err.stack);
      if (err?.code === 'P2003' || /foreign key/i.test(err?.message || '')) {
        throw new BadRequestException('Invalid reference: clientId does not exist for this tenant');
      }
      throw err;
    }
  }

  async acceptAndConvertToShipment(tenantId: string, quotationId: string, userId: string) {
    const quotation: any = await this.findOne(tenantId, quotationId);

    if (quotation.status === QuotationStatus.ACCEPTED) {
      throw new BadRequestException('Quotation has already been accepted and converted');
    }

    // Update quote status
    await this.prisma.quotation.update({
      where: { id: quotationId },
      data: { status: QuotationStatus.ACCEPTED },
    });

    // Generate Job File Number
    const year = new Date().getFullYear();
    const latestShipment = await this.prisma.shipment.findFirst({
      where: {
        companyId: tenantId,
        jobFileNumber: { startsWith: `BAN-${year}-` },
      },
      orderBy: { jobFileNumber: 'desc' },
      select: { jobFileNumber: true },
    });

    const nextSeq = extractSequenceNumber(latestShipment?.jobFileNumber) + 1;
    const jobFileNumber = `BAN-${year}-${String(nextSeq).padStart(4, '0')}`;

    // Create Shipment Job File
    return this.prisma.shipment.create({
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
  }

  async updateStatus(tenantId: string, id: string, newStatus: QuotationStatus) {
    await this.findOne(tenantId, id);
    return this.prisma.quotation.update({
      where: { id },
      data: { status: newStatus },
      include: {
        client: { select: { id: true, name: true } },
        items: true,
      },
    });
  }

  async addItem(tenantId: string, quotationId: string, data: any) {
    // Validate the quotation belongs to this tenant first
    await this.findOne(tenantId, quotationId);

    const qty = Number(data.quantity || 1);
    const costRate = Number(data.costRate || 0);
    const sellRate = Number(data.sellRate || 0);
    const totalCost = costRate * qty;
    const totalSell = sellRate * qty;
    const profit = totalSell - totalCost;
    const margin = totalSell > 0 ? (profit / totalSell) * 100 : 0;

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
  }

  async removeItem(tenantId: string, quotationId: string, itemId: string) {
    await this.findOne(tenantId, quotationId);
    await this.prisma.quotationItem.delete({ where: { id: itemId } });
    await this.recalculateTotals(quotationId);
    return { success: true };
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

    return this.prisma.quotation.create({
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
  }

  private async recalculateTotals(quotationId: string) {
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
  }
}
