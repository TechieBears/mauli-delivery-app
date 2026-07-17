import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchTransporterProfile,
  fetchTransporterOrders,
  fetchTransporterOrderById,
  updateTransporterProfile,
  updateUserProfile,
} from '../services/transporterService';

// Always refetches on mount — the pending screen relies on this being current
// (e.g. right after the KYC form is submitted) rather than the global staleTime.
export const useTransporterProfile = (enabled = true) =>
  useQuery({
    queryKey: ['transporterProfile'],
    queryFn: fetchTransporterProfile,
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
  });

// `status` is part of the key so switching the filter refetches.
export const useTransporterOrders = (status, enabled = true) =>
  useQuery({
    queryKey: ['transporterOrders', status ?? 'active'],
    queryFn: () => fetchTransporterOrders(status),
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
  });

export const useTransporterOrder = (id, enabled = true) =>
  useQuery({
    queryKey: ['transporterOrder', id],
    queryFn: () => fetchTransporterOrderById(id),
    enabled: enabled && !!id,
    staleTime: 0,
    refetchOnMount: 'always',
  });

export const useUpdateTransporterProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTransporterProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transporterProfile'] });
    },
  });
};

export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateUserProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transporterProfile'] });
    },
  });
};
