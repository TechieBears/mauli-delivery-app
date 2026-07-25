import api from './api';
import logger from '../utils/logger';

// Registration itself (name/phone/role) is handled entirely by
// /auth/send-otp + /auth/verify-otp — no separate account-save call needed.

// Uploads a single KYC/bank document as multipart form-data. field must be
// one of the backend's kycFields: pan, gst, addressProof, identityProof,
// cancelledCheck, fssai (see mauli-api upload.middleware.js). Requires the
// vendor to already be authenticated (this is a /vendor/* route).
// Returns the public URL the backend generated for the uploaded file.
export const uploadVendorDocument = (field, file) => {
  const form = new FormData();
  form.append(field, {
    uri: file.uri,
    name: file.fileName ?? `${field}.jpg`,
    type: file.type ?? 'image/jpeg',
  });

  return api
    .post('/vendor/profile/documents', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then(res => {
      const vendor = res?.data ?? {};
      const urlByField = {
        pan: vendor.panFile,
        gst: vendor.gstFile,
        addressProof: vendor.addressProof,
        identityProof: vendor.identityProof,
        cancelledCheck: vendor.bankDetails?.cancelledCheck,
        fssai: vendor.fssaiFile,
      };
      return urlByField[field] ?? '';
    });
};

// Called at Review — Bank, Address, and KYC fields are saved together with the
// KYC status in one PATCH /vendor/profile call. The status is sent as the
// `kycStatus` field (the backend whitelist accepts kycStatus, not status).
// The backend stores the value verbatim (no server-side flip):
//   kycStatus = 'drafted'  → saved as a draft (resume later)
//   kycStatus = 'onReview' → submitted for admin review
//
// NOT sent here:
//   - name / email — saved separately via PUT /user/profile (User record)
//   - businessName — not collected in the app; handled from the admin side
//   - address.pincode / city / state — the form only collects one combined
//     "Office Address" text field (→ address.line)
export const saveBankAndKycSteps = (data, kycStatus) =>
  api.patch('/vendor/profile', {
    ...(kycStatus && { kycStatus }),
    bankDetails: {
      bankName: data.bankName?.trim() ?? '',
      branchName: data.branchName?.trim() ?? '',
      accountNumber: data.accountNumber?.trim() ?? '',
      accountType: (data.accountType ?? '').toLowerCase(),
      ifscCode: data.ifsc?.trim() ?? '',
      cancelledCheck: data.chequePhoto ?? '',
    },
    address: { line: data.officeAddress?.trim() ?? '' },
    panCardNo: data.pan?.trim() ?? '',
    panFile: data.panDoc ?? '',
    addressProof: data.addressProof ?? '',
    identityProof: data.identityProofDoc ?? '',
    gstNo: data.gst?.trim() ?? '',
    gstFile: data.gstProof ?? '',
    fssaiNo: data.fssai?.trim() ?? '',
    fssaiFile: data.fssaiCert ?? '',
  });

export const fetchVendorProfile = () => api.get('/vendor/profile');

// PUT /user/profile — updates the authenticated user's account fields.
// Email/name live on the User record (not Vendor), so they're saved here,
// not via PATCH /vendor/profile.
export const updateUserProfile = ({ name, email }) =>
  api.put('/user/profile', {
    ...(name != null && { name }),
    ...(email != null && { email }),
  });

// GET /vendor/profile/kyc-status — backend returns the status string in `data`
// e.g. { success: true, data: 'approved' }. Possible values:
//   drafted  → saved as draft (form not finished)
//   pending  → form not completed yet (default after registration)
//   onReview → submitted, under admin review
//   approved → approved
//   rejected → rejected
export const fetchKycStatus = () => api.get('/vendor/profile/kyc-status');

// Note: the KYC status is set via the `status` field in PATCH /vendor/profile
// (see saveBankAndKycSteps), not a separate endpoint.

// ─── Pricing ────────────────────────────────────────────────────────────────

// GET /vendor/pricing → array of
//   { productVariantId, variantName, productName, unit, currentPrice, isSet, vendorProductId }
export const fetchVendorPricing = () => api.get('/vendor/pricing');

// GET /vendor/pricing/status → { vendorId, isPricingCompleted }
export const fetchVendorPricingStatus = () => api.get('/vendor/pricing/status');

// POST /vendor/pricing/bulk — body is a RAW ARRAY: [{ productVariantId, price }]
export const bulkUpdateVendorPricing = items =>
  api.post('/vendor/pricing/bulk', items);

// PATCH /vendor/pricing/:productVariantId — body { price }
export const updateSingleVendorPrice = (productVariantId, price) =>
  api.patch(`/vendor/pricing/${productVariantId}`, { price });

// ─── Orders ───────────────────────────────────────────────────────────────────

// GET /vendor/orders — list of orders for the authenticated vendor.
// Optional `status` filters server-side (pending|confirmed|intransit|delivered|
// rejected|cancelled). Response is { data: [...], statuses: [...], pagination }
// where `statuses` drives the filter capsules and is always returned.
export const fetchVendorOrders = (status) =>
  api
    .get('/vendor/orders', { params: status ? { status } : undefined })
    .then(res => {
      logger.log('[vendorService] fetchVendorOrders response:', JSON.stringify(res, null, 2));
      return res;
    });

// GET /vendor/orders/:id — full detail for a single order.
// Returns { order, items } — see mapDetailOrder in VendorOrderDetailScreen.
export const fetchVendorOrderById = id =>
  api.get(`/vendor/orders/${id}`).then(res => {
    logger.log(`[vendorService] fetchVendorOrderById(${id}) response:`, JSON.stringify(res, null, 2));
    return res;
  });

// GET /vendor/transporters/lookup?phone=… — before assigning a transporter at
// the ready-for-pickup step, look them up by phone. Returns { exists: false }
// or { exists: true, transporterId, name, countryCode, phone, isActive,
// kycStatus, vehicles: [{ vehicleNo, addedAt }] }. 409 if the phone belongs to
// a non-transporter user.
export const lookupTransporter = phone =>
  api.get('/vendor/transporters/lookup', { params: { phone } });

// Delivery-OTP confirmation. The vendor dashboard can now drive this via its
// own /vendor/* routes (backend reuses the transporter controller under the
// hood). The vendor enters the receiver's name/phone, an OTP is sent, and once
// verified the backend marks the order delivered.
// NOTE: the backend requires order.status === 'intransit' for both calls, and
// verify sets the order to 'delivered'.
export const sendDeliveryOtp = (orderId, { receiverName, receiverPhone }) =>
  api.post(`/vendor/orders/${orderId}/send-delivery-otp`, { receiverName, receiverPhone });

export const verifyDeliveryOtp = (orderId, { otp, receiverName, receiverPhone }) =>
  api.post(`/vendor/orders/${orderId}/verify-delivery-otp`, { otp, receiverName, receiverPhone });

// PATCH /vendor/orders/:id/status — moves an order through its lifecycle.
// Backend enum + allowed transitions (order.vendor.controller.js):
//   pending   → confirmed | rejected
//   confirmed → intransit
//   intransit → delivered
// `intransit` additionally REQUIRES deliveryBoy { name, phone, vehicleNo }
// (and optionally `transport`); the backend 400s without them.
// extra = { note?, deliveryBoy?, transport? }
export const updateVendorOrderStatus = (id, status, extra = {}) =>
  api.patch(`/vendor/orders/${id}/status`, { status, ...extra });
