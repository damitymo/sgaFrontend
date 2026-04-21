'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * Query keys centralizadas. Usar siempre estas factories para que la
 * invalidación de cache sea consistente entre los hooks.
 */
export const agentKeys = {
  all: ['agents'] as const,
  lists: () => [...agentKeys.all, 'list'] as const,
  search: (filters: AgentSearchFilters) =>
    [...agentKeys.all, 'search', filters] as const,
  detail: (id: number) => [...agentKeys.all, 'detail', id] as const,
  fullProfile: (id: number) =>
    [...agentKeys.all, 'full-profile', id] as const,
  birthdaysThisMonth: () =>
    [...agentKeys.all, 'birthdays', 'current-month'] as const,
};

export type Agent = {
  id: number;
  full_name: string;
  dni: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  address?: string | null;
  birth_date?: string | null;
  is_active?: boolean;
};

export type AgentSearchFilters = {
  dni?: string;
  apellido?: string;
  nombre?: string;
  materia?: string;
};

export function useAgentsList() {
  return useQuery({
    queryKey: agentKeys.lists(),
    queryFn: async () => {
      const { data } = await api.get<Agent[]>('/agents');
      return data;
    },
  });
}

/**
 * Search con filtros. Se dispara solo cuando hay al menos un filtro con valor,
 * para no traer todo el listado al entrar a la página.
 */
export function useAgentsSearch(filters: AgentSearchFilters) {
  const hasAnyFilter = Object.values(filters).some(
    (value) => value && value.trim().length > 0,
  );

  return useQuery({
    queryKey: agentKeys.search(filters),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.dni?.trim()) params.dni = filters.dni.trim();
      if (filters.apellido?.trim()) params.apellido = filters.apellido.trim();
      if (filters.nombre?.trim()) params.nombre = filters.nombre.trim();
      if (filters.materia?.trim()) params.materia = filters.materia.trim();

      const { data } = await api.get<Agent[]>('/agents/search', { params });
      return data;
    },
    enabled: hasAnyFilter,
    placeholderData: keepPreviousData,
  });
}

export function useAgentDetail(id: number | null) {
  return useQuery({
    queryKey: id ? agentKeys.detail(id) : agentKeys.all,
    queryFn: async () => {
      const { data } = await api.get<Agent>(`/agents/${id}`);
      return data;
    },
    enabled: id != null,
  });
}

export function useAgentFullProfile(id: number | null) {
  return useQuery({
    queryKey: id ? agentKeys.fullProfile(id) : agentKeys.all,
    queryFn: async () => {
      const { data } = await api.get(`/agents/${id}/full-profile`);
      return data;
    },
    enabled: id != null,
  });
}

export function useBirthdaysThisMonth() {
  return useQuery({
    queryKey: agentKeys.birthdaysThisMonth(),
    queryFn: async () => {
      const { data } = await api.get<Agent[]>('/agents/birthdays/month');
      return data;
    },
  });
}

/**
 * Mutations. Después de escribir, invalidamos las queries que muestran
 * listados/detalles del recurso para que se refetcheen automáticamente.
 */
export function useCreateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<Agent>) => {
      const { data } = await api.post<Agent>('/agents', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.all });
    },
  });
}

export function useUpdateAgent(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<Agent>) => {
      const { data } = await api.patch<Agent>(`/agents/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.all });
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/agents/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.all });
    },
  });
}
