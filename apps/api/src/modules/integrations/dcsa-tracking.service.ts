import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface DcsaEvent {
  eventID: string;
  eventType: 'EQUIPMENT' | 'TRANSPORT' | 'SHIPMENT';
  eventDateTime: string;
  eventClassifierCode: 'ACT' | 'PLN' | 'EST'; // Actual, Planned, Estimated
  eventCreatedDateTime: string;
  transportEventTypeCode?: 'DEPA' | 'ARRI';
  equipmentEventTypeCode?: 'LOAD' | 'DISC' | 'GTIN' | 'GTOT' | 'STOW';
  facilityTypeCode?: 'POTE' | 'RAMP' | 'INTE' | 'COFS';
  UNLocationCode?: string;
  facilityCode?: string;
  equipmentReference?: string;
  emptyIndicatorCode?: 'EMPTY' | 'LADEN';
  transportCall?: {
    transportCallSequenceNumber: number;
    vessel: {
      vesselIMONumber: string;
      vesselName: string;
      vesselFlag: string;
    };
    carrierVoyageNumber: string;
  };
  description?: string;
}

export interface DemurrageCalculationResult {
  containerNumber: string;
  dischargedDate: string;
  daysSinceDischarge: number;
  freeDaysAllowed: number;
  freeDaysRemaining: number;
  isOverdue: boolean;
  overdueDays: number;
  estimatedDemurrageCostUSD: number;
  riskLevel: 'LOW' | 'WARNING' | 'CRITICAL';
}

@Injectable()
export class DcsaTrackingService {
  private readonly logger = new Logger(DcsaTrackingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Fetch track & trace events conforming to DCSA standard from real database shipment events
   */
  async getEventsByContainer(carrierCode: string, containerNumber: string): Promise<DcsaEvent[]> {
    if (!containerNumber) return [];

    const container = await this.prisma.shipmentContainer.findFirst({
      where: { containerNumber: containerNumber.trim().toUpperCase() },
      include: {
        shipment: {
          include: {
            originPort: true,
            destinationPort: true,
            shippingLine: true,
            events: { orderBy: { eventAt: 'asc' } },
          },
        },
      },
    });

    if (!container || !container.shipment) {
      return [];
    }

    const shp = container.shipment;
    const events: DcsaEvent[] = [];

    // Map shipment events to DCSA events
    (shp.events || []).forEach((ev, idx) => {
      let eqCode: DcsaEvent['equipmentEventTypeCode'] = 'STOW';
      let eventType: DcsaEvent['eventType'] = 'SHIPMENT';
      const stage = (ev.toStage || '').toLowerCase();

      if (stage.includes('cargo_received') || stage.includes('gate_in')) {
        eventType = 'EQUIPMENT';
        eqCode = 'GTIN';
      } else if (stage.includes('in_transit')) {
        eventType = 'TRANSPORT';
      } else if (stage.includes('arrived') || stage.includes('discharged')) {
        eventType = 'EQUIPMENT';
        eqCode = 'DISC';
      } else if (stage.includes('out_for_delivery') || stage.includes('gate_out')) {
        eventType = 'EQUIPMENT';
        eqCode = 'GTOT';
      }

      events.push({
        eventID: ev.id || `evt-${idx + 1}`,
        eventType,
        eventClassifierCode: 'ACT',
        equipmentEventTypeCode: eqCode,
        emptyIndicatorCode: stage.includes('returned') ? 'EMPTY' : 'LADEN',
        eventDateTime: new Date(ev.eventAt).toISOString(),
        eventCreatedDateTime: new Date(ev.eventAt).toISOString(),
        UNLocationCode: shp.destinationPort?.code || shp.originPort?.code || 'EGALY',
        equipmentReference: container.containerNumber || undefined,
        description: ev.notes || `Shipment transition to ${ev.toStage}`,
        transportCall: shp.vesselName
          ? {
              transportCallSequenceNumber: 1,
              vessel: {
                vesselIMONumber: '—',
                vesselName: shp.vesselName,
                vesselFlag: '—',
              },
              carrierVoyageNumber: shp.voyageNumber || '—',
            }
          : undefined,
      });
    });

    return events;
  }

  /**
   * Calculate Container Demurrage & Detention (D&D) risk and financial liabilities
   */
  calculateDemurrage(
    containerNumber: string,
    dischargeDate: Date,
    freeDaysAllowed: number = 14,
    gateOutDate?: Date
  ): DemurrageCalculationResult {
    const endDate = gateOutDate || new Date();
    const diffMs = endDate.getTime() - dischargeDate.getTime();
    const daysSinceDischarge = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    const isOverdue = daysSinceDischarge > freeDaysAllowed;
    const overdueDays = isOverdue ? daysSinceDischarge - freeDaysAllowed : 0;
    const freeDaysRemaining = isOverdue ? 0 : freeDaysAllowed - daysSinceDischarge;

    // Standard D&D tier tariff (Egyptian ports average: Tier 1: $40/day, Tier 2: $80/day, Tier 3: $120/day)
    let estimatedCost = 0;
    if (overdueDays > 0) {
      const tier1 = Math.min(overdueDays, 7) * 40;
      const tier2 = Math.min(Math.max(0, overdueDays - 7), 7) * 80;
      const tier3 = Math.max(0, overdueDays - 14) * 120;
      estimatedCost = tier1 + tier2 + tier3;
    }

    let riskLevel: 'LOW' | 'WARNING' | 'CRITICAL' = 'LOW';
    if (isOverdue) {
      riskLevel = 'CRITICAL';
    } else if (freeDaysRemaining <= 3) {
      riskLevel = 'WARNING';
    }

    return {
      containerNumber,
      dischargedDate: dischargeDate.toISOString().split('T')[0],
      daysSinceDischarge,
      freeDaysAllowed,
      freeDaysRemaining,
      isOverdue,
      overdueDays,
      estimatedDemurrageCostUSD: estimatedCost,
      riskLevel,
    };
  }
}
