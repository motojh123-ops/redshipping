import { api } from './api';

export interface ClientContact {
  id?: string;
  name: string;
  title?: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
}

export interface ClientRecord {
  id: string;
  name: string;
  tradeName?: string;
  taxNumber?: string;
  commercialReg?: string;
  status: 'active' | 'prospect' | 'inactive';
  type?: 'actual' | 'lead';
  category: string;
  address?: string;
  city?: string;
  country?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  commodityInterest?: string;
  totalShipments?: number;
  totalRevenue?: number;
  createdAt: string;
  contacts?: ClientContact[];
  salesRep?: { id: string; name: string; email?: string };
}

export const clientService = {
  async fetchClients(query?: { status?: string; search?: string }): Promise<ClientRecord[]> {
    return await api.get('/clients', { params: query });
  },

  async fetchClientById(id: string): Promise<ClientRecord> {
    return await api.get(`/clients/${id}`);
  },

  async createClient(data: Partial<ClientRecord>): Promise<ClientRecord> {
    return await api.post('/clients', data);
  },

  async addActivity(clientId: string, activity: { activityType: string; notes: string }): Promise<any> {
    return await api.post(`/clients/${clientId}/activities`, activity);
  },
};
