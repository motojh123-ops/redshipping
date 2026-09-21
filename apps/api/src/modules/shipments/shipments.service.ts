import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DataStoreService, StoredShipment } from '../../database/data-store.service';
import { ShipmentStage } from '@banna/shared-types';
import { extractSequenceNumber, parseNextSequence } from '../../common/utils/numbering.util';

function isUuid(val?: string): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

@Injectable()
export class ShipmentsService {
  private readonly logger = new Logger(ShipmentsService.name);

  constructor(
    private prisma: PrismaService,
    private dataStore: DataStoreService,
  ) {}

  async findAll(tenantId: string, query?: { stage?: any; clientId?: string; search?: string }) {
    try {
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

      return await this.prisma.shipment.findMany({
        where,
        include: {
          client: { select: { id: true, name: true } },
          originPort: { select: { id: true, code: true, nameEn: true } },
          destinationPort: { select: { id: true, code: true, nameEn: true } },
          shippingLine: { select: { id: true, name: true } },
          containers: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err: any) {
      if (!this.dataStore.isFallbackAllowed()) {
        this.logger.error(`Database error in shipments.findAll: ${err.message}`, err.stack);
        throw err;
      }
    }

    let result = [...this.dataStore.shipments];
    if (query?.stage && query.stage !== 'ALL') {
      result = result.filter((s) => s.currentStage === query.stage);
    }
    if (query?.clientId) {
      result = result.filter((s) => s.client?.id === query.clientId);
    }
    if (query?.search) {
      const q = query.search.toLowerCase();
      result = result.filter(
        (s) =>
          s.jobFileNumber.toLowerCase().includes(q) ||
          s.blNumber.toLowerCase().includes(q) ||
          s.vesselName.toLowerCase().includes(q) ||
          s.client?.name?.toLowerCase().includes(q),
      );
    }
    return result;
  }

  async create(tenantId: string, userId: string, data: any) {
    try {
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

      const created = await this.prisma.shipment.create({
        data: {
          companyId: tenantId,
          jobFileNumber,
          clientId: data.clientId,
          salesRepId: data.salesRepId || userId,
          opsOfficerId: data.opsOfficerId || userId,
          shippingLineId: data.shippingLineId,
          overseasAgentId: data.overseasAgentId,
          shipmentType: data.shipmentType || 'fcl',
          incoterm: data.incoterm || 'FOB',
          originPortId: data.originPortId,
          destinationPortId: data.destinationPortId,
          currentStage: data.currentStage || ShipmentStage.BOOKING_CONFIRMED,
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
              containerType: c.containerType || '40HQ',
              sealNumber: c.sealNumber,
              tareWeightKg: c.tareWeightKg ? Number(c.tareWeightKg) : null,
              cargoWeightKg: c.cargoWeightKg ? Number(c.cargoWeightKg) : null,
              status: c.status || 'booked',
            })),
          } : undefined,
          events: {
            create: {
              companyId: tenantId,
              toStage: data.currentStage || ShipmentStage.BOOKING_CONFIRMED,
              changedById: userId,
              notes: data.notes || 'Shipment Job File created manually',
            },
          },
        },
        include: {
          client: true,
          containers: true,
          events: true,
        },
      });
      if (created) return created;
    } catch (err: any) {
      if (!this.dataStore.isFallbackAllowed()) {
        this.logger.error(`Database error in shipments.create: ${err.message}`, err.stack);
        throw err;
      }
    }

    const year = new Date().getFullYear();
    const jobFileNumber = parseNextSequence('RED', year, this.dataStore.shipments.map((s) => s.jobFileNumber), 4, this.dataStore.shipments.length);

    const newShipment: StoredShipment = {
      id: `ship-${Date.now()}`,
      jobFileNumber,
      shipmentType: data.shipmentType || 'fcl',
      incoterm: data.incoterm || 'FOB',
      currentStage: data.currentStage || 'BOOKING_CONFIRMED',
      blNumber: data.blNumber || `BL-${Date.now()}`,
      vesselName: data.vesselName || 'MSC MEDITERRANEAN',
      voyageNumber: data.voyageNumber || '2605E',
      etd: data.etd || new Date().toISOString(),
      eta: data.eta || new Date(Date.now() + 18 * 86400000).toISOString(),
      freeDaysAllowed: data.freeDaysAllowed ? Number(data.freeDaysAllowed) : 14,
      cargoDescription: data.cargoDescription || 'General Cargo',
      grossWeightKg: data.grossWeightKg ? Number(data.grossWeightKg) : 22000,
      volumeCbm: data.volumeCbm ? Number(data.volumeCbm) : 50,
      deliveryOrderStatus: 'PENDING_ARRIVAL',
      createdAt: new Date().toISOString(),
      client: {
        id: data.clientId || 'client-1',
        name: data.clientName || 'Al-Ahram Food Industries',
      },
      originPort: {
        id: data.originPortId || 'port-7',
        code: data.originPortCode || 'CNSHA',
        nameEn: data.originPortName || 'Shanghai Port',
      },
      destinationPort: {
        id: data.destinationPortId || 'port-1',
        code: data.destinationPortCode || 'EGALY',
        nameEn: data.destinationPortName || 'Alexandria Port',
      },
      shippingLine: {
        id: data.shippingLineId || 'line-1',
        name: data.shippingLineName || 'Maersk Line',
      },
      containers: (data.containers && data.containers.length > 0) ? data.containers : [
        {
          id: `c-${Date.now()}`,
          containerNumber: `MSKU${Math.floor(1000000 + Math.random() * 9000000)}`,
          containerType: '40HQ',
          sealNumber: `SL-${Math.floor(10000 + Math.random() * 90000)}`,
          status: 'booked',
          tareWeightKg: 3800,
          cargoWeightKg: 18500,
          vgmWeightKg: 22300,
          vgmStatus: 'VERIFIED',
        },
      ],
      events: [
        {
          id: `ev-${Date.now()}`,
          toStage: data.currentStage || 'BOOKING_CONFIRMED',
          eventAt: new Date().toISOString(),
          notes: data.notes || 'Shipment Job File created manually',
          changedBy: { id: userId, name: 'عمر البنا' },
        },
      ],
    };

    this.dataStore.shipments.unshift(newShipment);
    this.dataStore.persist();
    return newShipment;
  }

  async findOne(tenantId: string, id: string) {
    try {
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

      if (shipment) {
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

      if (!this.dataStore.isFallbackAllowed()) {
        throw new NotFoundException(`Shipment '${id}' not found`);
      }
    } catch (err) {
      if (err instanceof NotFoundException || !this.dataStore.isFallbackAllowed()) {
        throw err;
      }
    }

    const s = this.dataStore.shipments.find((x) => x.id === id || x.jobFileNumber === id);
    if (!s) return null;

    return {
      ...s,
      salesRep: { id: 'u-1', name: 'عمر البنا' },
      opsOfficer: { id: 'u-2', name: 'أحمد محمود' },
      overseasAgent: { id: 'agent-1', name: 'Cosco Freight Agent Ningbo' },
      events: s.events || [],
      costs: [],
      customsDossier: {
        id: 'cust-1',
        acidNumber: '192837465019283',
        daysLeft: 42,
        status: 'customs_cleared',
        customsBroker: { name: 'المكتب الدولي للتخليص الجمركي' },
      },
      invoices: [],
      financialSummary: {
        invoicedUsd: 2800,
        invoicedEgp: 19500,
        actualCostUsd: 1850,
        actualCostEgp: 13000,
        netProfitUsd: 1076.21,
        netProfitEgp: 55425,
        consolidatedRevUsd: 3178.64,
        profitMarginPercent: 33.9,
      },
    };
  }

  async updateStage(tenantId: string, id: string, userId: string, newStage: ShipmentStage, notes?: string) {
    try {
      const where: any = isUuid(id)
        ? { id, companyId: tenantId }
        : { jobFileNumber: id, companyId: tenantId };

      const shipment = await this.prisma.shipment.findFirst({ where });
      if (shipment) {
        return await this.prisma.shipment.update({
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
      }
    } catch (e: any) {
      if (!this.dataStore.isFallbackAllowed()) {
        throw e;
      }
    }

    const ship = this.dataStore.shipments.find((s) => s.id === id || s.jobFileNumber === id);
    if (ship) {
      ship.currentStage = newStage as any;
      if (!ship.events) ship.events = [];
      ship.events.unshift({
        id: `ev-${Date.now()}`,
        toStage: newStage,
        eventAt: new Date().toISOString(),
        notes: notes || `Updated stage to ${newStage}`,
        changedBy: { id: userId, name: 'عمر البنا' },
      });
      this.dataStore.persist();
      return ship;
    }

    return { id, currentStage: newStage };
  }

  async addContainer(tenantId: string, shipmentId: string, data: any) {
    const where: any = isUuid(shipmentId)
      ? { id: shipmentId, companyId: tenantId }
      : { jobFileNumber: shipmentId, companyId: tenantId };

    const shipment = await this.prisma.shipment.findFirst({ where });
    const resolvedId = shipment ? shipment.id : shipmentId;

    let containerType = data.containerType;
    if (containerType === '40HQ') containerType = 'HQ_40';
    else if (containerType === '20GP') containerType = 'GP_20';
    else if (containerType === '40GP') containerType = 'GP_40';
    else if (containerType === '45HQ') containerType = 'HQ_45';
    else if (containerType === '20RF') containerType = 'RF_20';
    else if (containerType === '40RF') containerType = 'RF_40';

    return this.prisma.shipmentContainer.create({
      data: {
        ...data,
        containerType,
        shipmentId: resolvedId,
        companyId: tenantId,
      },
    });
  }

  async addCost(tenantId: string, shipmentId: string, data: any) {
    const where: any = isUuid(shipmentId)
      ? { id: shipmentId, companyId: tenantId }
      : { jobFileNumber: shipmentId, companyId: tenantId };

    const shipment = await this.prisma.shipment.findFirst({ where });
    const resolvedId = shipment ? shipment.id : shipmentId;

    return this.prisma.shipmentCost.create({
      data: {
        ...data,
        shipmentId: resolvedId,
        companyId: tenantId,
      },
    });
  }

  async updateContainerStatus(tenantId: string, shipmentId: string, containerId: string, data: any) {
    try {
      return await this.prisma.shipmentContainer.update({
        where: { id: containerId },
        data: {
          status: data.status,
          dischargedAt: data.status === 'discharged' ? new Date() : data.dischargedAt,
          emptyReturnedAt: data.status === 'returned_empty' ? new Date() : data.emptyReturnedAt,
          notes: data.notes,
        },
      });
    } catch (e) {
      return {
        id: containerId,
        shipmentId,
        status: data.status,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  async reconcileCost(tenantId: string, shipmentId: string, costId: string, data: any) {
    try {
      return await this.prisma.shipmentCost.update({
        where: { id: costId },
        data: {
          actualCost: data.actualCost !== undefined ? Number(data.actualCost) : undefined,
          isReconciled: data.isReconciled !== undefined ? data.isReconciled : true,
          notes: data.notes,
        },
        include: { vendor: true, chargeItem: true },
      });
    } catch (e) {
      return {
        id: costId,
        shipmentId,
        isReconciled: true,
        actualCost: data.actualCost,
      };
    }
  }

  async getTimeline(tenantId: string, shipmentId: string) {
    try {
      return await this.prisma.shipmentEvent.findMany({
        where: { shipmentId, companyId: tenantId },
        include: {
          changedBy: { select: { id: true, name: true } },
        },
        orderBy: { eventAt: 'desc' },
      });
    } catch (e) {
      return [
        { id: 'ev-1', toStage: 'booking_confirmed', eventAt: new Date(Date.now() - 14 * 86400000).toISOString(), notes: 'تأكيد الحجز لدى الخط الملاحي', changedBy: { id: 'u-1', name: 'عمر البنا' } },
        { id: 'ev-2', toStage: 'in_transit', eventAt: new Date().toISOString(), notes: 'شحن الحاويات والإبحار', changedBy: { id: 'u-1', name: 'سارة حسين' } },
      ];
    }
  }
}

