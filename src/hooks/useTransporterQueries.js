import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchTransporterProfile,
  fetchTransporterOrders,
  fetchTransporterOrderById,
  fetchTransporterDashboardVendors,
  scanPickupQr,
  confirmPickup,
  sendDeliveryOtp,
  verifyDeliveryOtp,
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

// `status` is part of the key so switching the filter refetches.
export const useTransporterDashboardVendors = (status, enabled = true) =>
  useQuery({
    queryKey: ['transporterDashboardVendors', status ?? 'all'],
    queryFn: () => fetchTransporterDashboardVendors(status),
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

// Preview-only — deliberately a mutation rather than a query, since scanning is
// a user action against a one-shot token and must never be refetched or cached.
export const useScanPickupQr = () =>
  useMutation({ mutationFn: scanPickupQr });

// On success every order in the batch has moved to 'intransit', which changes
// both the vendor dashboard counts and the assigned-orders list.
export const useConfirmPickup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: confirmPickup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transporterDashboardVendors'] });
      queryClient.invalidateQueries({ queryKey: ['transporterOrders'] });
    },
  });
};

export const useSendDeliveryOtp = () =>
  useMutation({ mutationFn: sendDeliveryOtp });

// On success the order is 'delivered', so it leaves the active/accepted lists
// and enters delivery history.
export const useVerifyDeliveryOtp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: verifyDeliveryOtp,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transporterOrders'] });
      queryClient.invalidateQueries({ queryKey: ['transporterDashboardVendors'] });
      queryClient.invalidateQueries({ queryKey: ['transporterOrder', variables?.id] });
    },
  });
};

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
