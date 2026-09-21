import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { CreateClientInput } from '@banna/shared-types';

export const clientKeys = {
  all: ['clients'] as const,
  lists: () => [...clientKeys.all, 'list'] as const,
  list: (params?: { search?: string; status?: string }) => [...clientKeys.lists(), params] as const,
  details: () => [...clientKeys.all, 'detail'] as const,
  detail: (id: string) => [...clientKeys.details(), id] as const,
};

export function useClients(params?: { search?: string; status?: string }) {
  return useQuery<any[]>({
    queryKey: clientKeys.list(params),
    queryFn: async () => {
      const data: any = await api.get('/clients', { params });
      return data || [];
    },
  });
}

export function useClient(id: string) {
  return useQuery<any>({
    queryKey: clientKeys.detail(id),
    queryFn: async () => {
      const data: any = await api.get(`/clients/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateClientInput) => {
      const data = await api.post('/clients', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
    },
  });
}
