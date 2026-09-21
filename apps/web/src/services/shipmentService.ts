import { api } from './api';

export interface ShipmentContainer {
  id?: string;
  containerNumber: string;
  containerType: string;
  sealNumber?: string;
  status: string;
  tareWeightKg?: number;
  cargoWeightKg?: number;
  vgmWeightKg?: number;
  vgmStatus?: string;
  dischargedAt?: string;
  emptyReturnedAt?: string;
}

export interface ShipmentRecord {
  id: string;
  jobFileNumber: string;
  shipmentType: string;
  incoterm: string;
  currentStage: string;
  blNumber: string;
  vesselName: string;
  voyageNumber: string;
  etd?: string;
  eta?: string;
  ata?: string;
  freeDaysAllowed: number;
  cargoDescription: string;
  grossWeightKg?: number;
  volumeCbm?: number;
  deliveryOrderNumber?: string;
  deliveryOrderExpiryDate?: string;
  deliveryOrderStatus?: string;
  createdAt: string;
  client?: { id: string; name: string };
  originPort?: { id: string; code: string; nameEn: string };
  destinationPort?: { id: string; code: string; nameEn: string };
  shippingLine?: { id: string; name: string };
  containers?: ShipmentContainer[];
  events?: any[];
  costs?: any[];
  customsDossier?: any;
  financialSummary?: {
    invoicedUsd: number;
    invoicedEgp: number;
    actualCostUsd: number;
    actualCostEgp: number;
    netProfitUsd: number;
    netProfitEgp: number;
    consolidatedRevUsd: number;
    profitMarginPercent: number;
  };
}

export const shipmentService = {
  async fetchShipments(query?: { stage?: string; search?: string; clientId?: string }): Promise<ShipmentRecord[]> {
    return await api.get('/shipments', { params: query });
  },

  async fetchShipmentById(id: string): Promise<ShipmentRecord> {
    return await api.get(`/shipments/${id}`);
  },

  async createShipment(data: Partial<ShipmentRecord>): Promise<ShipmentRecord> {
    return await api.post('/shipments', data);
  },

  async updateStage(id: string, stage: string, notes?: string): Promise<ShipmentRecord> {
    return await api.patch(`/shipments/${id}/stage`, { stage, notes });
  },

  async fetchTimeline(id: string): Promise<any[]> {
    return await api.get(`/shipments/${id}/timeline`);
  },

  async addContainer(shipmentId: string, container: Partial<ShipmentContainer>): Promise<any> {
    return await api.post(`/shipments/${shipmentId}/containers`, container);
  },

  async updateContainerStatus(shipmentId: string, containerId: string, status: string): Promise<any> {
    return await api.patch(`/shipments/${shipmentId}/containers/${containerId}/status`, { status });
  },
};
