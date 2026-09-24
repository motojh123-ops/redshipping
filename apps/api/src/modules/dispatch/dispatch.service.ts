import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface DispatchTrip {
  id: string;
  tripNumber: string;
  shipmentId?: string | null;
  jobFileNumber?: string | null;
  clientName: string;
  containerNumber: string;
  containerType: string;
  pickupLocation: string;
  deliveryLocation: string;
  driverId?: string | null;
  driverName: string;
  driverPhone: string;
  truckPlate: string;
  truckType: string;
  status: 'scheduled' | 'loading' | 'in_transit' | 'delivered' | 'cancelled';
  scheduledDate: string;
  departureTime?: string;
  estimatedArrival?: string;
  actualArrival?: string;
  costRate: number;
  sellRate: number;
  currency: 'EGP' | 'USD';
  waybillNumber: string;
  notes?: string;
}

const VALID_STATUSES = ['scheduled', 'loading', 'in_transit', 'delivered', 'cancelled'] as const;
type TripStatus = (typeof VALID_STATUSES)[number];

/**
 * Dispatch trips persisted in PostgreSQL via the DispatchTrip model.
 * Tenant-scoped on company_id; every query is filtered by tenantId.
 */
@Injectable()
export class DispatchService {
  constructor(private prisma: PrismaService) {}

  private toDto(t: any): DispatchTrip {
    return {
      id: t.id,
      tripNumber: t.tripNumber,
      shipmentId: t.shipmentId,
      jobFileNumber: t.shipment?.jobFileNumber ?? null,
      clientName: t.clientName,
      containerNumber: t.containerNumber ?? '',
      containerType: t.containerType ?? '',
      pickupLocation: t.pickupLocation ?? '',
      deliveryLocation: t.deliveryLocation ?? '',
      driverId: t.driverId ?? null,
      driverName: t.driverName ?? '',
      driverPhone: t.driverPhone ?? '',
      truckPlate: t.truckPlate ?? '',
      truckType: t.truckType ?? '',
      status: t.status as TripStatus,
      scheduledDate: t.scheduledDate ? String(t.scheduledDate).slice(0, 10) : '',
      departureTime: t.departureTime ?? undefined,
      estimatedArrival: t.estimatedArrival ?? undefined,
      actualArrival: t.actualArrival ?? undefined,
      costRate: Number(t.costRate),
      sellRate: Number(t.sellRate),
      currency: t.currency as 'EGP' | 'USD',
      waybillNumber: t.waybillNumber ?? '',
      notes: t.notes ?? undefined,
    };
  }

  async getTrips(tenantId: string, filter?: { status?: string; search?: string }): Promise<DispatchTrip[]> {
    const where: any = { companyId: tenantId };

    if (filter?.status && (VALID_STATUSES as readonly string[]).includes(filter.status)) {
      where.status = filter.status;
    }
    if (filter?.search) {
      const q = filter.search;
      where.OR = [
        { tripNumber: { contains: q, mode: 'insensitive' } },
        { clientName: { contains: q, mode: 'insensitive' } },
        { containerNumber: { contains: q, mode: 'insensitive' } },
        { driverName: { contains: q, mode: 'insensitive' } },
        { truckPlate: { contains: q, mode: 'insensitive' } },
      ];
    }

    const trips = await this.prisma.dispatchTrip.findMany({
      where,
      include: { shipment: { select: { jobFileNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return trips.map((t) => this.toDto(t));
  }

  async getTripById(tenantId: string, id: string): Promise<DispatchTrip> {
    const trip = await this.prisma.dispatchTrip.findFirst({
      where: { id, companyId: tenantId },
      include: { shipment: { select: { jobFileNumber: true } } },
    });
    if (!trip) {
      throw new NotFoundException(`Dispatch trip with id ${id} not found`);
    }
    return this.toDto(trip);
  }

  async createTrip(tenantId: string, dto: any): Promise<DispatchTrip> {
    // Generate a per-tenant sequential trip number: TRP-YYYY-NNNN
    const year = new Date().getFullYear();
    const count = await this.prisma.dispatchTrip.count({ where: { companyId: tenantId } });
    let tripNumber = dto.tripNumber || `TRP-${year}-${String(count + 1).padStart(4, '0')}`;

    // Guard against unique-constraint collisions on the (companyId, tripNumber) pair
    const exists = await this.prisma.dispatchTrip.findFirst({
      where: { companyId: tenantId, tripNumber },
      select: { id: true },
    });
    if (exists) {
      tripNumber = `TRP-${year}-${Date.now().toString().slice(-6)}`;
    }

    // Resolve optional shipment link (must belong to the same tenant)
    let shipmentId: string | null = null;
    if (dto.shipmentId) {
      const shipment = await this.prisma.shipment.findFirst({
        where: { id: dto.shipmentId, companyId: tenantId },
        select: { id: true },
      });
      shipmentId = shipment?.id ?? null;
    }

    // Resolve optional driver from the drivers master (tenant-scoped); snapshot its data onto the trip
    let driverId: string | null = null;
    let driverSnapshot: { driverName?: string | null; driverPhone?: string | null; truckPlate?: string | null; truckType?: string | null } = {};
    if (dto.driverId) {
      const driver = await this.prisma.driver.findFirst({
        where: { id: dto.driverId, companyId: tenantId },
        select: { id: true, name: true, phone: true, truckPlate: true, truckType: true },
      });
      if (driver) {
        driverId = driver.id;
        driverSnapshot = {
          driverName: driver.name,
          driverPhone: driver.phone,
          truckPlate: driver.truckPlate,
          truckType: driver.truckType,
        };
      }
    }

    const newTrip = await this.prisma.dispatchTrip.create({
      data: {
        companyId: tenantId,
        shipmentId,
        driverId,
        tripNumber,
        clientName: String(dto.clientName || '—').trim(),
        containerNumber: dto.containerNumber || null,
        containerType: dto.containerType || null,
        pickupLocation: dto.pickupLocation || null,
        deliveryLocation: dto.deliveryLocation || null,
        driverName: dto.driverName || driverSnapshot.driverName || null,
        driverPhone: dto.driverPhone || driverSnapshot.driverPhone || null,
        truckPlate: dto.truckPlate || driverSnapshot.truckPlate || null,
        truckType: dto.truckType || driverSnapshot.truckType || null,
        status: 'scheduled',
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
        costRate: Number(dto.costRate) || 0,
        sellRate: Number(dto.sellRate) || 0,
        currency: dto.currency === 'USD' ? 'USD' : 'EGP',
        waybillNumber: dto.waybillNumber || null,
        notes: dto.notes || null,
      },
      include: { shipment: { select: { jobFileNumber: true } } },
    });

    return this.toDto(newTrip);
  }

  async updateTripStatus(
    tenantId: string,
    id: string,
    status: TripStatus,
  ): Promise<DispatchTrip> {
    if (!(VALID_STATUSES as readonly string[]).includes(status)) {
      throw new NotFoundException(`Invalid trip status '${status}'`);
    }
    const trip = await this.prisma.dispatchTrip.findFirst({
      where: { id, companyId: tenantId },
    });
    if (!trip) {
      throw new NotFoundException(`Dispatch trip with id ${id} not found`);
    }

    const data: any = { status };
    if (status === 'in_transit' && !trip.departureTime) {
      data.departureTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    }
    if (status === 'delivered') {
      data.actualArrival = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    }

    const updated = await this.prisma.dispatchTrip.update({
      where: { id: trip.id },
      data,
      include: { shipment: { select: { jobFileNumber: true } } },
    });

    return this.toDto(updated);
  }
}
