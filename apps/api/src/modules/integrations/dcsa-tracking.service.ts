import { Injectable, Logger } from '@nestjs/common';

export interface DcsaEvent {
  eventID: string;
  eventType: 'EQUIPMENT' | 'TRANSPORT' | 'SHIPMENT';
  eventDateTime: string;
  eventClassifierCode: 'ACT' | 'PLN' | 'EST'; // Actual, Planned, Estimated
  eventCreatedDateTime: string;
  transportEventTypeCode?: 'DEPA' | 'ARRI';
  equipmentEventTypeCode?: 'LOAD' | 'DISC' | 'GTIN' | 'GTOT' | 'STOW';
  facilityTypeCode?: 'POTE' | 'RAMP' | 'INTE' | 'COFS'; // Port Terminal, Ramp, etc.
  UNLocationCode?: string; // e.g. EGALY, CNSHA, DEHAM
  facilityCode?: string;
  equipmentReference?: string; // Container No e.g. MSCU1234567
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

  // Carrier Standard Codes
  private readonly carrierCodeMap: Record<string, string> = {
    MSC: 'MSCU',
    MAERSK: 'MAEU',
    CMA_CGM: 'CMDU',
    COSCO: 'COSU',
    HAPAG_LLOYD: 'HLCU',
    ONE: 'ONEY',
    EVERGREEN: 'EGLV',
  };

  /**
   * Fetch track & trace events conforming to DCSA T&T v2.2 / v3.0 standard
   */
  async getEventsByContainer(carrierCode: string, containerNumber: string): Promise<DcsaEvent[]> {
    this.logger.log(`Fetching DCSA events for container ${containerNumber} on carrier ${carrierCode}`);

    const now = new Date();
    const dMinus = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();

    // Standardized DCSA timeline
    const mockEvents: DcsaEvent[] = [
      {
        eventID: `evt-${Date.now()}-1`,
        eventType: 'EQUIPMENT',
        eventClassifierCode: 'ACT',
        equipmentEventTypeCode: 'GTIN',
        emptyIndicatorCode: 'EMPTY',
        eventDateTime: dMinus(18),
        eventCreatedDateTime: dMinus(18),
        UNLocationCode: 'CNSHA',
        equipmentReference: containerNumber,
        description: 'Gate-in empty container at origin depot (Shanghai)',
      },
      {
        eventID: `evt-${Date.now()}-2`,
        eventType: 'EQUIPMENT',
        eventClassifierCode: 'ACT',
        equipmentEventTypeCode: 'LOAD',
        emptyIndicatorCode: 'LADEN',
        eventDateTime: dMinus(15),
        eventCreatedDateTime: dMinus(15),
        UNLocationCode: 'CNSHA',
        equipmentReference: containerNumber,
        transportCall: {
          transportCallSequenceNumber: 1,
          vessel: {
            vesselIMONumber: '9839284',
            vesselName: 'MSC LORETTO',
            vesselFlag: 'LR',
          },
          carrierVoyageNumber: '2408W',
        },
        description: 'Loaded on vessel MSC LORETTO at Shanghai Port',
      },
      {
        eventID: `evt-${Date.now()}-3`,
        eventType: 'TRANSPORT',
        eventClassifierCode: 'ACT',
        transportEventTypeCode: 'DEPA',
        eventDateTime: dMinus(14),
        eventCreatedDateTime: dMinus(14),
        UNLocationCode: 'CNSHA',
        description: 'Vessel departed Port of Shanghai',
      },
      {
        eventID: `evt-${Date.now()}-4`,
        eventType: 'TRANSPORT',
        eventClassifierCode: 'ACT',
        transportEventTypeCode: 'ARRI',
        eventDateTime: dMinus(3),
        eventCreatedDateTime: dMinus(3),
        UNLocationCode: 'EGALY',
        description: 'Vessel arrived at Alexandria Port (Dekheila Terminal)',
      },
      {
        eventID: `evt-${Date.now()}-5`,
        eventType: 'EQUIPMENT',
        eventClassifierCode: 'ACT',
        equipmentEventTypeCode: 'DISC',
        emptyIndicatorCode: 'LADEN',
        eventDateTime: dMinus(2),
        eventCreatedDateTime: dMinus(2),
        UNLocationCode: 'EGALY',
        equipmentReference: containerNumber,
        description: 'Container discharged from vessel at Alexandria Port Terminal',
      },
    ];

    return mockEvents;
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
