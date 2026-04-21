'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { api } from '@/lib/api';

export const pofKeys = {
  all: ['pof'] as const,
  lists: () => [...pofKeys.all, 'list'] as const,
  list: (filters: PofFilters) => [...pofKeys.all, 'list', filters] as const,
  detail: (id: number) => [...pofKeys.all, 'detail', id] as const,
  byPlazaNumber: (plaza: string) =>
    [...pofKeys.all, 'plaza', plaza] as const,
  history: (id: number) => [...pofKeys.all, 'history', id] as const,
};

export type PofPosition = {
  id: number;
  plaza_number: string;
  subject_name?: string | null;
  hours_count?: number | null;
  course?: string | null;
  division?: string | null;
  shift?: string | null;
  revista_status?: string | null;
  legal_norm?: string | null;
  vacancy_status?: string | null;
  modality?: string | null;
  notes?: string | null;
  is_active: boolean;
};

export type PofFilters = {
  plaza?: string;
  docente?: string;
  materia?: string;
  curso?: string;
};

export function usePofList(filters: PofFilters = {}) {
  return useQuery({
    queryKey: pofKeys.list(filters),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.plaza?.trim()) params.plaza = filters.plaza.trim();
      if (filters.docente?.trim()) params.docente = filters.docente.trim();
      if (filters.materia?.trim()) params.materia = filters.materia.trim();
      if (filters.curso?.trim()) params.curso = filters.curso.trim();

      const { data } = await api.get('/pof', { params });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function usePofByPlazaNumber(plazaNumber: string | null) {
  return useQuery({
    queryKey: plazaNumber
      ? pofKeys.byPlazaNumber(plazaNumber)
      : pofKeys.all,
    queryFn: async () => {
      const { data } = await api.get(`/pof/plaza/${plazaNumber}`);
      return data;
    },
    enabled: Boolean(plazaNumber),
  });
}

export function usePofHistory(id: number | null) {
  return useQuery({
    queryKey: id ? pofKeys.history(id) : pofKeys.all,
    queryFn: async () => {
      const { data } = await api.get(`/pof/${id}/history`);
      return data;
    },
    enabled: id != null,
  });
}

export function useCreatePof() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<PofPosition>) => {
      const { data } = await api.post<PofPosition>('/pof', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pofKeys.all });
    },
  });
}

export function useUpdatePof(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<PofPosition>) => {
      const { data } = await api.patch<PofPosition>(`/pof/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pofKeys.all });
    },
  });
}

export function useDeletePof() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/pof/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pofKeys.all });
    },
  });
}
