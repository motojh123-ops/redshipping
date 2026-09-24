import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { ShipmentStage } from '@banna/shared-types';
import { extractSequenceNumber } from '../../common/utils/numbering.util';
import { ShipmentStageChangedEvent } from '../../common/events/shipment-events';

function isUuid(val?: string): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

function normalizeContainerType(type?: string): any {
  if (!type) return 'HQ_40';
  const clean = String(type).trim().toUpperCase();
  if (clean === '40HQ' || clean === 'HQ_40' || clean === '40_HQ') return 'HQ_40';
  if (clean === '20GP' || clean === 'GP_20' || clean === '20_GP' || clean === '20FT') return 'GP_20';
  if (clean === '40GP' || clean === 'GP_40' || clean === '40_GP' || clean === '40FT') return 'GP_40';
  if (clean === '45HQ' || clean === 'HQ_45' || clean === '45_HQ') return 'HQ_45';
  if (clean === '20RF' || clean === 'RF_20' || clean === 'REEFER_20') return 'RF_20';
  if (clean === '40RF' || clean === 'RF_40' || clean === 'REEFER_40') return 'RF_40';
  if (clean === 'FLAT_RACK' || clean === 'FLATRACK' || clean === 'FR') return 'FLAT_RACK';
  if (clean === 'OPEN_TOP' || clean === 'OPENTOP' || clean === 'OT') return 'OPEN_TOP';
  return 'HQ_40';
}

@Injectable()
export class ShipmentsService {
  private readonly logger = new Logger(ShipmentsService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async findAll(tenantId: string, query?: { stage?: any; clientId?: string; search?: string }) {
    const where: any = { companyId: tenantId };
    if (query?.stage && query.stage !== 'ALL') where.currentStage = query.stage;
    if (query?.clientId) where.clientId = query.clientId;
    if (query?.search) {
      where.OR = [
        { jobFileNumber: { contains: query.search, mode: 'insensitive' } },
        { blNumber: { contains: query.search, mode: 'insensitive' } },
        { vesselName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.shipment.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            contacts: { select: { phone: true, mobile: true, isPrimary: true } },
          },
        },
        originPort: { select: { id: true, code: true, nameEn: true, nameAr: true } },
        destinationPort: { select: { id: true, code: true, nameEn: true, nameAr: true } },
        shippingLine: { select: { id: true, name: true } },
        containers: true,
        customsDossier: true,
        events: {
          include: { changedBy: { select: { id: true, name: true } } },
          orderBy: { eventAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, userId: string, data: any) {
    const year = new Date().getFullYear();
    const latest = await this.prisma.shipment.findFirst({
      where: {
        companyId: tenantId,
        jobFileNumber: { startsWith: `BAN-${year}-` },
      },
      orderBy: { jobFileNumber: 'desc' },
      select: { jobFileNumber: true },
    });

    const nextSeq = extractSequenceNumber(latest?.jobFileNumber) + 1;
    const jobFileNumber = `BAN-${year}-${String(nextSeq).padStart(4, '0')}`;

    const resolvePortId = async (input?: string): Promise<string | null> => {
      if (!input) return null;
      if (isUuid(input)) return input;
      const match = input.match(/\(([A-Z0-9]{5})\)/);
      const code = match ? match[1] : input.trim().toUpperCase();
      const port = await this.prisma.port.findFirst({
        where: {
          OR: [
            { code },
            { nameEn: { contains: input.trim(), mode: 'insensitive' } },
          ],
        },
      });
      return port ? port.id : null;
    };

    const originPortUuid = await resolvePortId(data.originPortId);
    const destPortUuid = await resolvePortId(data.destinationPortId);

    let eventUser = isUuid(userId) ? userId : null;
    if (!eventUser) {
      const u = await this.prisma.user.findFirst({ where: { companyId: tenantId } });
      eventUser = u ? u.id : null;
    }

    try {
      return await this.prisma.shipment.create({
        data: {
          companyId: tenantId,
          jobFileNumber,
          clientId: data.clientId,
          salesRepId: (data.salesRepId && isUuid(data.salesRepId)) ? data.salesRepId : (isUuid(userId) ? userId : null),
          opsOfficerId: (data.opsOfficerId && isUuid(data.opsOfficerId)) ? data.opsOfficerId : (isUuid(userId) ? userId : null),
          shippingLineId: (data.shippingLineId && isUuid(data.shippingLineId)) ? data.shippingLineId : null,
          overseasAgentId: (data.overseasAgentId && isUuid(data.overseasAgentId)) ? data.overseasAgentId : null,
          shipmentType: data.shipmentType ? String(data.shipmentType).toLowerCase() as any : 'fcl',
          incoterm: (data.incoterm ? String(data.incoterm).toUpperCase() : 'FOB') as any,
          originPortId: originPortUuid,
          destinationPortId: destPortUuid,
          currentStage: (data.currentStage ? String(data.currentStage).toLowerCase() : 'booking_confirmed') as any,
          blNumber: data.blNumber,
          vesselName: data.vesselName,
          voyageNumber: data.voyageNumber,
          etd: data.etd ? new Date(data.etd) : null,
          eta: data.eta ? new Date(data.eta) : null,
          freeDaysAllowed: data.freeDaysAllowed ? Number(data.freeDaysAllowed) : 14,
          cargoDescription: data.cargoDescription,
          grossWeightKg: data.grossWeightKg ? Number(data.grossWeightKg) : null,
          volumeCbm: data.volumeCbm ? Number(data.volumeCbm) : null,
          packageCount: data.packageCount ? Number(data.packageCount) : null,
          packageType: data.packageType,
          containers: data.containers && data.containers.length > 0 ? {
            create: data.containers.map((c: any) => ({
              companyId: tenantId,
              containerNumber: c.containerNumber,
              containerType: normalizeContainerType(c.containerType),
              sealNumber: c.sealNumber,
              tareWeightKg: c.tareWeightKg ? Number(c.tareWeightKg) : null,
              cargoWeightKg: c.cargoWeightKg ? Number(c.cargoWeightKg) : null,
              status: c.status ? String(c.status).toLowerCase() : 'booked',
            })),
          } : undefined,
          events: eventUser ? {
            create: {
              companyId: tenantId,
              toStage: (data.currentStage ? String(data.currentStage).toLowerCase() : 'booking_confirmed') as any,
              changedById: eventUser,
              notes: data.notes || 'Shipment Job File created manually',
            },
          } : undefined,
        },
        include: {
          client: true,
          containers: true,
          events: true,
        },
      });
    } catch (err: any) {
      this.logger.error(`Database error in shipments.create: ${err.message}`, err.stack);
      // Translate raw Prisma FK violations into a clean client-facing 400
      if (err?.code === 'P2003' || /foreign key/i.test(err?.message || '')) {
        throw new BadRequestException(
          'Invalid reference: clientId, shipping line, or port does not exist for this tenant',
        );
      }
      throw err;
    }
  }

  async findOne(tenantId: string, id: string) {
    const where: any = isUuid(id)
      ? { id, companyId: tenantId }
      : { jobFileNumber: id, companyId: tenantId };

    const shipment = await this.prisma.shipment.findFirst({
      where,
      include: {
        client: true,
        salesRep: { select: { id: true, name: true } },
        opsOfficer: { select: { id: true, name: true } },
        shippingLine: true,
        overseasAgent: true,
        originPort: true,
        destinationPort: true,
        containers: true,
        events: {
          include: { changedBy: { select: { id: true, name: true } } },
          orderBy: { eventAt: 'desc' },
        },
        costs: {
          include: { vendor: true, chargeItem: true },
        },
        customsDossier: true,
        invoices: {
          include: { items: true },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment '${id}' not found`);
    }

    const usdRate = 51.5;
    let invoicedUsd = 0;
    let invoicedEgp = 0;
    shipment.invoices.forEach((inv) => {
      const amt = Number(inv.total) || 0;
      if (inv.currency === 'USD') invoicedUsd += amt;
      else invoicedEgp += amt;
    });

    let actualCostUsd = 0;
    let actualCostEgp = 0;
    shipment.costs.forEach((c) => {
      const amt = Number(c.actualCost) || 0;
      if (c.currency === 'USD') actualCostUsd += amt;
      else actualCostEgp += amt;
    });

    const netProfitUsd = invoicedUsd - actualCostUsd;
    const netProfitEgp = invoicedEgp - actualCostEgp;
    const consolidatedRevUsd = invoicedUsd + invoicedEgp / usdRate;
    const totalCostConsolidatedUsd = actualCostUsd + actualCostEgp / usdRate;
    const profitMarginPercent =
      consolidatedRevUsd > 0
        ? Math.round(((consolidatedRevUsd - totalCostConsolidatedUsd) / consolidatedRevUsd) * 1000) / 10
        : 0;

    return {
      ...shipment,
      financialSummary: {
        invoicedUsd,
        invoicedEgp,
        actualCostUsd,
        actualCostEgp,
        netProfitUsd,
        netProfitEgp,
        consolidatedRevUsd,
        profitMarginPercent,
      },
    };
  }

  async updateStage(tenantId: string, id: string, userId: string, newStage: ShipmentStage, notes?: string) {
    const where: any = isUuid(id)
      ? { id, companyId: tenantId }
      : { jobFileNumber: id, companyId: tenantId };

    const shipment = await this.prisma.shipment.findFirst({ where });
    if (!shipment) {
      throw new NotFoundException(`Shipment '${id}' not found`);
    }

    const updated = await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        currentStage: newStage,
        events: {
          create: {
            companyId: tenantId,
            fromStage: shipment.currentStage as ShipmentStage,
            toStage: newStage,
            changedById: userId,
            notes,
          },
        },
      },
      include: { events: true },
    });

    // Domain event → notifications + reminder jobs (listener is fail-soft)
    this.eventEmitter.emit(
      'shipment.stage.changed',
      new ShipmentStageChangedEvent(
        tenantId,
        updated.id,
        updated.jobFileNumber,
        shipment.currentStage as string,
        newStage as string,
        null,
      ),
    );

    return updated;
  }

  async addContainer(tenantId: string, shipmentId: string, data: any) {
    const where: any = isUuid(shipmentId)
      ? { id: shipmentId, companyId: tenantId }
      : { jobFileNumber: shipmentId, companyId: tenantId };

    const shipment = await this.prisma.shipment.findFirst({ where });
    if (!shipment) {
      throw new NotFoundException(`Shipment '${shipmentId}' not found`);
    }

    const containerType = normalizeContainerType(data.containerType);

    return this.prisma.shipmentContainer.create({
      data: {
        ...data,
        containerType,
        shipmentId: shipment.id,
        companyId: tenantId,
      },
    });
  }

  async addCost(tenantId: string, shipmentId: string, data: any) {
    const where: any = isUuid(shipmentId)
      ? { id: shipmentId, companyId: tenantId }
      : { jobFileNumber: shipmentId, companyId: tenantId };

    const shipment = await this.prisma.shipment.findFirst({ where });
    if (!shipment) {
      throw new NotFoundException(`Shipment '${shipmentId}' not found`);
    }

    return this.prisma.shipmentCost.create({
      data: {
        ...data,
        shipmentId: shipment.id,
        companyId: tenantId,
      },
    });
  }

  async updateContainerStatus(tenantId: string, shipmentId: string, containerId: string, data: any) {
    // Tenant guard: resolve the container through its parent shipment scoped to this tenant
    const where: any = isUuid(shipmentId)
      ? { id: shipmentId, companyId: tenantId }
      : { jobFileNumber: shipmentId, companyId: tenantId };
    const shipment = await this.prisma.shipment.findFirst({
      where,
      select: { id: true, containers: { select: { id: true } } },
    });
    if (!shipment) {
      throw new NotFoundException(`Shipment '${shipmentId}' not found`);
    }
    const containerBelongsToShipment = shipment.containers.some((c) => c.id === containerId);
    if (!containerBelongsToShipment) {
      throw new NotFoundException(`Container '${containerId}' not found on shipment '${shipmentId}'`);
    }

    return this.prisma.shipmentContainer.update({
      where: { id: containerId },
      data: {
        status: data.status,
        dischargedAt: data.status === 'discharged' ? new Date() : data.dischargedAt,
        emptyReturnedAt: data.status === 'returned_empty' ? new Date() : data.emptyReturnedAt,
        notes: data.notes,
      },
    });
  }

  async reconcileCost(tenantId: string, shipmentId: string, costId: string, data: any) {
    // Tenant guard: verify the cost belongs to a shipment of this tenant before updating
    const where: any = isUuid(shipmentId)
      ? { id: shipmentId, companyId: tenantId }
      : { jobFileNumber: shipmentId, companyId: tenantId };
    const shipment = await this.prisma.shipment.findFirst({
      where,
      select: { id: true, costs: { select: { id: true } } },
    });
    if (!shipment) {
      throw new NotFoundException(`Shipment '${shipmentId}' not found`);
    }
    if (!shipment.costs.some((c) => c.id === costId)) {
      throw new NotFoundException(`Cost '${costId}' not found on shipment '${shipmentId}'`);
    }

    return this.prisma.shipmentCost.update({
      where: { id: costId },
      data: {
        actualCost: data.actualCost !== undefined ? Number(data.actualCost) : undefined,
        isReconciled: data.isReconciled !== undefined ? data.isReconciled : true,
        notes: data.notes,
      },
      include: { vendor: true, chargeItem: true },
    });
  }

  async getTimeline(tenantId: string, shipmentId: string) {
    return this.prisma.shipmentEvent.findMany({
      where: { shipmentId, companyId: tenantId },
      include: {
        changedBy: { select: { id: true, name: true } },
      },
      orderBy: { eventAt: 'desc' },
    });
  }
}
