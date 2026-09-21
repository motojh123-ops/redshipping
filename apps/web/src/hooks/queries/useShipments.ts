import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { CreateShipmentInput, UpdateShipmentStageInput } from '@banna/shared-types';

export const shipmentKeys = {
  all: ['shipments'] as const,
  lists: () => [...shipmentKeys.all, 'list'] as const,
  list: (params?: { search?: string; stage?: string; port?: string; clientId?: string }) =>
    [...shipmentKeys.lists(), params] as const,
  details: () => [...shipmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...shipmentKeys.details(), id] as const,
};

export function useShipments(params?: { search?: string; stage?: string; port?: string; clientId?: string }) {
  return useQuery<any[]>({
    queryKey: shipmentKeys.list(params),
    queryFn: async () => {
      const data: any = await api.get('/shipments', { params });
      return data || [];
    },
  });
}

export function useShipment(id: string) {
  return useQuery<any>({
    queryKey: shipmentKeys.detail(id),
    queryFn: async () => {
      const data: any = await api.get(`/shipments/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateShipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateShipmentInput) => {
      const data = await api.post('/shipments', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shipmentKeys.all });
    },
  });
}

export function useUpdateShipmentStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, stage, notes }: { id: string } & UpdateShipmentStageInput) => {
      const data = await api.patch(`/shipments/${id}/stage`, { stage, notes });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: shipmentKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: shipmentKeys.lists() });
    },
  });
}
