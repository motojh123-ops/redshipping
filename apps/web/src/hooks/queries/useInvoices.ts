import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { CreateInvoiceInput, InvoiceStatus } from '@banna/shared-types';

export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (params?: { status?: string; clientId?: string }) => [...invoiceKeys.lists(), params] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
};

export function useInvoices(params?: { status?: string; clientId?: string }) {
  return useQuery<any[]>({
    queryKey: invoiceKeys.list(params),
    queryFn: async () => {
      const data: any = await api.get('/invoices', { params });
      return data || [];
    },
  });
}

export function useInvoice(id: string) {
  return useQuery<any>({
    queryKey: invoiceKeys.detail(id),
    queryFn: async () => {
      const data: any = await api.get(`/invoices/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateInvoiceInput) => {
      const data = await api.post('/invoices', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
    },
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InvoiceStatus }) => {
      const data = await api.patch(`/invoices/${id}/status`, { status });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}
