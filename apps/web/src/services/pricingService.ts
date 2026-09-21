import { api } from './api';

export interface PricingTariffRecord {
  id: string;
  category: 'ocean' | 'inland' | 'air' | 'customs';
  carrierCode: string;
  carrierName: string;
  originPortCode: string;
  originPortName: string;
  destinationPortCode: string;
  destinationPortName: string;
  containerType: '20GP' | '40GP' | '40HQ' | '40RF' | 'LCL' | 'TRUCK';
  currency: 'USD' | 'EUR' | 'EGP';
  buyRate: number;
  sellRate: number;
  profitMarginPercent: number;
  transitDaysEstimated: number;
  freeDaysAllowed: number;
  validFrom: string;
  validTo: string;
  remarks?: string;
  isActive: boolean;
}

export interface QuoteEstimateParams {
  originPortCode: string;
  destinationPortCode: string;
  containerType: string;
  quantity: number;
  includeClearance?: boolean;
  includeInland?: boolean;
}

export interface QuoteEstimateResult {
  oceanCost: number;
  oceanSell: number;
  clearanceCost: number;
  clearanceSell: number;
  inlandCost: number;
  inlandSell: number;
  totalCostUsd: number;
  totalSellUsd: number;
  totalProfitUsd: number;
  estimatedTransitDays: number;
}

export const pricingService = {
  async fetchTariffs(filter?: {
    category?: string;
    carrierCode?: string;
    origin?: string;
    destination?: string;
    containerType?: string;
  }): Promise<PricingTariffRecord[]> {
    return await api.get('/pricing/tariffs', { params: filter });
  },

  async fetchTariffById(id: string): Promise<PricingTariffRecord> {
    return await api.get(`/pricing/tariffs/${id}`);
  },

  async createTariff(data: Partial<PricingTariffRecord>): Promise<PricingTariffRecord> {
    return await api.post('/pricing/tariffs', data);
  },

  async calculateEstimate(params: QuoteEstimateParams): Promise<QuoteEstimateResult> {
    return await api.post('/pricing/estimate', params);
  },
};
