import { api } from './api';

/** Official Nafeza ACID inquiry page (free manual verification service) */
export const NAFEZA_VALIDATE_URL = 'https://www.nafeza.gov.eg/ar/aci/validate';

/**
 * Deep link to the official Nafeza ACI validate page.
 * Nafeza is a manual inquiry form (no query params), so the ACID is passed
 * via clipboard so staff can simply paste it into the official form.
 */
export const buildNafezaValidateUrl = (acidNumber?: string | null): string =>
  NAFEZA_VALIDATE_URL;

export interface CustomsDossierRecord {
  id: string;
  acidNumber: string;
  daysLeft: number;
  certNumber: string;
  shipmentFile: string;
  blNumber: string;
  client: string;
  status: 'acid_issued' | 'inspected' | 'release_issued';
  duties: string;
  vat: string;
  inspectionDate: string;
  port: string;
  createdAt: string;
  shipment?: {
    id: string;
    jobFileNumber: string;
    blNumber: string;
    client?: { id: string; name: string };
    containers?: any[];
  };
}

export const customsService = {
  async fetchCustoms(status?: string): Promise<CustomsDossierRecord[]> {
    return await api.get('/customs', { params: { status } });
  },

  async fetchCustomsById(id: string): Promise<CustomsDossierRecord> {
    return await api.get(`/customs/${id}`);
  },

  async saveCustomsDossier(shipmentId: string, data: Partial<CustomsDossierRecord>): Promise<CustomsDossierRecord> {
    return await api.post(`/customs/${shipmentId}`, data);
  },
};
