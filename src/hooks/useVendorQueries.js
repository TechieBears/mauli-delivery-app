import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  saveBankAndKycSteps,
  fetchVendorProfile,
  fetchKycStatus,
  updateUserProfile,
  fetchVendorPricing,
  fetchVendorPricingStatus,
  bulkUpdateVendorPricing,
  updateSingleVendorPrice,
  fetchVendorOrders,
  fetchVendorOrderById,
  updateVendorOrderStatus,
  lookupTransporter,
  sendDeliveryOtp,
  verifyDeliveryOtp,
} from '../services/vendorService';

export const useSaveBankAndKycSteps = () =>
  useMutation({ mutationFn: ({ data, kycStatus }) => saveBankAndKycSteps(data, kycStatus) });

export const useUpdateUserProfile = () =>
  useMutation({ mutationFn: updateUserProfile });

export const useKycStatus = (enabled = true) =>
  useQuery({
    queryKey: ['kycStatus'],
    queryFn: fetchKycStatus,
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
  });

// Always refetches on mount — onboarding relies on this being up to date
// (e.g. right after Name/Email are saved) rather than the 5-minute global
// staleTime cache used elsewhere in the app.
export const useVendorProfile = (enabled = true) =>
  useQuery({
    queryKey: ['vendorProfile'],
    queryFn: fetchVendorProfile,
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
  });

// ─── Pricing ────────────────────────────────────────────────────────────────

export const useVendorPricing = (enabled = true) =>
  useQuery({
    queryKey: ['vendorPricing'],
    queryFn: fetchVendorPricing,
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
  });

export const useVendorPricingStatus = (enabled = true) =>
  useQuery({
    queryKey: ['vendorPricingStatus'],
    queryFn: fetchVendorPricingStatus,
    enabled,
  });

export const useBulkUpdatePricing = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkUpdateVendorPricing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorPricing'] });
      queryClient.invalidateQueries({ queryKey: ['vendorPricingStatus'] });
    },
  });
};

export const useUpdateSinglePrice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productVariantId, price }) => updateSingleVendorPrice(productVariantId, price),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorPricing'] });
      queryClient.invalidateQueries({ queryKey: ['vendorPricingStatus'] });
    },
  });
};

// ─── Orders ───────────────────────────────────────────────────────────────────

// `status` filters server-side; it's part of the query key so switching the
// filter capsule triggers a fresh fetch.
export const useVendorOrders = (status, enabled = true) =>
  useQuery({
    queryKey: ['vendorOrders', status ?? 'all'],
    queryFn: () => fetchVendorOrders(status),
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
  });

export const useVendorOrder = (id, enabled = true) =>
  useQuery({
    queryKey: ['vendorOrder', id],
    queryFn: () => fetchVendorOrderById(id),
    enabled: enabled && !!id,
    staleTime: 0,
    refetchOnMount: 'always',
  });

// GET /vendor/transporters/lookup?phone=… — on-demand lookup (button press),
// so a mutation fits better than a query. Resolves to the lookup payload.
export const useLookupTransporter = () =>
  useMutation({ mutationFn: phone => lookupTransporter(phone) });

// Delivery-OTP handshake (send → verify) used before the in-transit transition.
export const useSendDeliveryOtp = () =>
  useMutation({ mutationFn: ({ orderId, ...body }) => sendDeliveryOtp(orderId, body) });

export const useVerifyDeliveryOtp = () =>
  useMutation({ mutationFn: ({ orderId, ...body }) => verifyDeliveryOtp(orderId, body) });

// PATCH /vendor/orders/:id/status — accept / reject / intransit / delivered.
// Invalidates both the list and the affected order's detail on success.
export const useUpdateVendorOrderStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, ...extra }) => updateVendorOrderStatus(id, status, extra),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['vendorOrders'] });
      queryClient.invalidateQueries({ queryKey: ['vendorOrder', id] });
    },
  });
};
