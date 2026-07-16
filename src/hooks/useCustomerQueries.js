import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  saveCustomerKycSteps,
  fetchCustomerProfile,
  fetchCustomerKycStatus,
  sendCustomerAgreementOtp,
  verifyCustomerAgreementOtp,
  fetchFrequentItemProducts,
  fetchFrequentItems,
  addFrequentItem,
  addFrequentItems,
  removeFrequentItem,
  fetchOrderProducts,
  fetchDeliverySlots,
  addCartItems,
  fetchCart,
  fetchCartPrice,
  removeCartItem,
  clearCart,
  compareCartVendors,
  placeOrder,
  fetchOrders,
  fetchOrder,
} from '../services/customerService';

export const useSaveCustomerKycSteps = () =>
  useMutation({ mutationFn: ({ data, kycStatus }) => saveCustomerKycSteps(data, kycStatus) });

// Always refetches on mount — onboarding relies on this being up to date
// (e.g. right after Name/Email are saved) rather than the global staleTime
// cache used elsewhere. Mirrors useVendorProfile.
export const useCustomerProfile = (enabled = true) =>
  useQuery({
    queryKey: ['customerProfile'],
    queryFn: fetchCustomerProfile,
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
  });

export const useCustomerKycStatus = (enabled = true) =>
  useQuery({
    queryKey: ['customerKycStatus'],
    queryFn: fetchCustomerKycStatus,
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
  });

// Requests the agreement OTP. In dev the backend returns { otp } in `data`.
export const useSendCustomerAgreementOtp = () =>
  useMutation({ mutationFn: sendCustomerAgreementOtp });

// Verifies the agreement OTP; on success the customer's agreementAccepted flips
// to true, so we invalidate the profile so any gate re-reads the fresh value.
export const useVerifyCustomerAgreementOtp = () =>
  useMutation({ mutationFn: ({ otp }) => verifyCustomerAgreementOtp(otp) });

// ─── Frequent Items ──────────────────────────────────────────────────────────

// Ranked product list from the customer's default vendor. Pass a categoryId to
// filter. Each item carries an `isFrequent` flag reflecting the saved list.
export const useFrequentItemProducts = (categoryId, enabled = true) =>
  useQuery({
    queryKey: ['frequentItemProducts', categoryId ?? null],
    queryFn: () => fetchFrequentItemProducts(categoryId),
    enabled,
  });

// The customer's saved frequent items (populated variants).
export const useFrequentItems = (enabled = true) =>
  useQuery({
    queryKey: ['frequentItems'],
    queryFn: fetchFrequentItems,
    enabled,
  });

// Adds a variant, then refreshes both the saved list and the ranked products
// so their `isFrequent` flags stay in sync.
export const useAddFrequentItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: variantId => addFrequentItem(variantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['frequentItems'] });
      qc.invalidateQueries({ queryKey: ['frequentItemProducts'] });
    },
  });
};

export const useRemoveFrequentItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: variantId => removeFrequentItem(variantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['frequentItems'] });
      qc.invalidateQueries({ queryKey: ['frequentItemProducts'] });
    },
  });
};

// Adds several variants in one request (used by the selection screen's Continue
// button). Append-only on the backend; caller passes a non-empty array.
export const useAddFrequentItems = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: variantIds => addFrequentItems(variantIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['frequentItems'] });
      qc.invalidateQueries({ queryKey: ['frequentItemProducts'] });
    },
  });
};

// ─── Orders ──────────────────────────────────────────────────────────────────

// New-order product catalog from the customer's default vendor. Pass
// `isEmergency` to request the emergency catalog (adds isEmergency=true to the
// query); the standard catalog is fetched otherwise.
export const useOrderProducts = (isEmergency = false, enabled = true) =>
  useQuery({
    queryKey: ['orderProducts', isEmergency],
    queryFn: () => fetchOrderProducts(isEmergency),
    enabled,
  });

// Available delivery slots for the confirm-order screen.
export const useDeliverySlots = (enabled = true) =>
  useQuery({
    queryKey: ['deliverySlots'],
    queryFn: fetchDeliverySlots,
    enabled,
  });

// ─── Cart ──────────────────────────────────────────────────────────────────

// The live cart ({ items, subtotal }). Kept fresh — always refetches on mount
// so the review screen reflects the latest adds/removes.
export const useCart = (enabled = true) =>
  useQuery({
    queryKey: ['cart'],
    queryFn: fetchCart,
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
  });

// Order-accurate cart totals ({ vendorTotal, customerTotal, canCheckout, … }).
export const useCartPrice = (enabled = true) =>
  useQuery({
    queryKey: ['cartPrice'],
    queryFn: fetchCartPrice,
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
  });

// Adds one or more variants to the cart in a single request, then refreshes
// the cart + price queries.
export const useAddCartItems = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addCartItems,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['cartPrice'] });
    },
  });
};

// Removes one variant from the cart.
export const useRemoveCartItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: productVariantId => removeCartItem(productVariantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['cartPrice'] });
    },
  });
};

// Clears the whole cart.
export const useClearCart = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: clearCart,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['cartPrice'] });
    },
  });
};

// Compares the current cart's total across other vendors in the customer's
// pincode. The backend errors if the cart is empty, so gate with `enabled`.
export const useCompareCartVendors = (enabled = true) =>
  useQuery({
    queryKey: ['compareCartVendors'],
    queryFn: compareCartVendors,
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
  });

// Places the order from the server-side cart. On success the backend clears
// the cart, so refresh the cart + price queries (and the orders list).
export const usePlaceOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: placeOrder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['cartPrice'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

// The customer's orders list (newest first). Always refetches on mount so a
// freshly-placed order shows up.
export const useOrders = (params, enabled = true) =>
  useQuery({
    queryKey: ['orders', params ?? null],
    queryFn: () => fetchOrders(params),
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
  });

// A single order's full detail ({ order, items, logs }).
export const useOrder = (id, enabled = true) =>
  useQuery({
    queryKey: ['order', id],
    queryFn: () => fetchOrder(id),
    enabled: enabled && !!id,
  });
