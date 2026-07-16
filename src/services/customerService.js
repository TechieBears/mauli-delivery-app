import api from './api';

// Customer onboarding mirrors the vendor flow. Registration itself
// (name/phone/role) is handled by /auth/send-otp + /auth/verify-otp — the
// backend auto-creates the customer profile shell on send-otp — so these
// endpoints only save the KYC/bank details afterwards.

// Uploads a single KYC/bank document as multipart form-data. field must be
// one of the backend's kycFields: pan, gst, addressProof, identityProof,
// cancelledCheck, fssai (see mauli-api upload.middleware.js). Requires the
// customer to already be authenticated (this is a /customer/* route).
// Returns the public URL the backend generated for the uploaded file.
export const uploadCustomerDocument = (field, file) => {
  const form = new FormData();
  form.append(field, {
    uri: file.uri,
    name: file.fileName ?? `${field}.jpg`,
    type: file.type ?? 'image/jpeg',
  });

  return api
    .post('/customer/profile/documents', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then(res => {
      const customer = res?.data ?? {};
      const urlByField = {
        pan: customer.panFile,
        gst: customer.gstFile,
        addressProof: customer.addressProof,
        identityProof: customer.identityProof,
        cancelledCheck: customer.bankDetails?.cancelledCheck,
        fssai: customer.fssaiFile,
      };
      return urlByField[field] ?? '';
    });
};

// Called at Review — Bank, Address, and KYC fields are saved together in one
// PATCH /customer/profile call. The backend accepts kycStatus but only for
// self-service transitions ('drafted' | 'onReview') — a customer can never set
// 'approved'/'rejected' (an admin does that). Submitting sends 'onReview'.
// No businessName is collected in the app.
export const saveCustomerKycSteps = (data, kycStatus) =>
  api.patch('/customer/profile', {
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

export const fetchCustomerProfile = () => api.get('/customer/profile');

// GET /customer/profile/kyc-status — mirrors the vendor endpoint: the backend
// returns the status string directly in `data`, e.g. { success: true,
// data: 'approved' }. Values: drafted | pending | onReview | approved | rejected.
export const fetchCustomerKycStatus = () => api.get('/customer/profile/kyc-status');

// ─── Agreement (Stamp Paper) ─────────────────────────────────────────────────

// POST /customer/profile/agreement/send-otp — generates a 6-digit OTP hashed
// onto agreementOtp/agreementOtpExpiry (10 min expiry). In development the
// backend returns the OTP in `data` ({ otp }); in production `data` is {} and
// the OTP is sent via SMS. Same dev convention as the login OTP flow.
export const sendCustomerAgreementOtp = () =>
  api.post('/customer/profile/agreement/send-otp');

// POST /customer/profile/agreement/verify-otp { otp } — verifies the OTP, then
// sets agreementAccepted = true and agreementAcceptedTime = now. Returns
// { agreementAccepted, agreementAcceptedTime } in `data`.
export const verifyCustomerAgreementOtp = otp =>
  api.post('/customer/profile/agreement/verify-otp', { otp });

// ─── Frequent Items ──────────────────────────────────────────────────────────

// GET /customer/frequent-items/products — every product from the customer's
// default vendor, ranked so manually-marked frequent items and previously
// purchased items float to the top. Optional `categoryId` filters by category.
// Each item: { vendorProductId, productVariantId, variantName, product,
// vendorPrice, customerPrice, isFrequent, purchaseCount }.
export const fetchFrequentItemProducts = categoryId =>
  api.get('/customer/frequent-items/products', {
    params: categoryId ? { categoryId } : undefined,
  });

// GET /customer/frequent-items — the customer's saved frequent variants
// (populated), returned as an array in `data`.
export const fetchFrequentItems = () => api.get('/customer/frequent-items');

// GET /customer/frequent-items/status — lightweight gate check for post-login
// routing. Returns { hasFrequentItems, count } in `data`. An approved customer
// who has accepted the agreement must still have added at least one frequent
// item before reaching the dashboard.
export const fetchFrequentItemStatus = () =>
  api.get('/customer/frequent-items/status');

// POST /customer/frequent-items { variantId } — add a variant to the list.
export const addFrequentItem = variantId =>
  api.post('/customer/frequent-items', { variantId });

// POST /customer/frequent-items/bulk { variantIds } — add several variants in
// one call. Append-only ($addToSet on the backend); requires a non-empty array.
export const addFrequentItems = variantIds =>
  api.post('/customer/frequent-items/bulk', { variantIds });

// DELETE /customer/frequent-items/:variantId — remove a variant from the list.
export const removeFrequentItem = variantId =>
  api.delete(`/customer/frequent-items/${variantId}`);

// ─── Orders ──────────────────────────────────────────────────────────────────

// GET /customer/orders/products — the product catalog for a new order from the
// customer's default vendor. When `isEmergency` is true the emergency catalog
// is requested via the `isEmergency=true` query param; otherwise the standard
// catalog is returned (no param sent).
export const fetchOrderProducts = (isEmergency = false) =>
  api.get('/customer/orders/products', {
    params: isEmergency ? { isEmergency: true } : undefined,
  });

// GET /customer/orders/slots — available delivery slots. Returns an array in
// `data`; each slot: { _id, startTime, endTime, isEmergency, isActive }.
// Emergency slots are only returned during the 11AM–6PM window.
export const fetchDeliverySlots = () => api.get('/customer/orders/slots');

// ─── Cart ────────────────────────────────────────────────────────────────────

// POST /customer/cart/items { vendorId, items: [{ productVariantId, quantity }] }
// — adds one or more variants to the cart in a single call. The backend rejects
// (409) mixing items from different vendors, so every item must share a
// vendorId, and rejects (404) any variant not sold by that vendor. quantity
// must be >= 1; a variant already in the cart is *incremented* by the given
// quantity (not replaced). Returns the rebuilt cart in `data`.
export const addCartItems = ({ vendorId, items }) =>
  api.post('/customer/cart/items', { vendorId, items });

// GET /customer/cart — the live cart: { items, subtotal }. Each item carries
// { productVariantId, variant, quantity, vendorPrice, customerPrice,
// isAvailable } with the variant re-priced against the vendor's current price.
export const fetchCart = () => api.get('/customer/cart');

// GET /customer/cart/price — order-accurate totals for the cart:
// { vendorId, items, unavailableItems, vendorTotal, customerTotal,
// commissionTotal, canCheckout }.
export const fetchCartPrice = () => api.get('/customer/cart/price');

// DELETE /customer/cart/items/:productVariantId — remove a single variant.
export const removeCartItem = productVariantId =>
  api.delete(`/customer/cart/items/${productVariantId}`);

// DELETE /customer/cart — clear the whole cart.
export const clearCart = () => api.delete('/customer/cart');

// GET /customer/cart/compare-vendors — prices the current cart against every
// other vendor serving the customer's pincode. Returns { cartVendor,
// comparisons, isSavingMoney, cheapestVendor, potentialSavings }. Errors (400)
// if the cart is empty or the customer's service pincode isn't set.
export const compareCartVendors = () => api.get('/customer/cart/compare-vendors');

// ─── Orders (place) ──────────────────────────────────────────────────────────

// POST /customer/orders { vendorId, orderType, deliveryDate, deliverySlotId }
// — places the order from the server-side cart (the backend reads items and the
// vendor from the cart; vendorId in the body is accepted but not required).
// orderType is 'normal' | 'emergency', deliveryDate is an ISO date (YYYY-MM-DD),
// deliverySlotId is a slot _id. Errors (400) if the cart is empty. On success
// returns { order, outstanding, pendingFeedbackOrderId } with status 201; the
// backend clears the cart as part of placing the order.
export const placeOrder = ({ vendorId, orderType, deliveryDate, deliverySlotId }) =>
  api.post('/customer/orders', { vendorId, orderType, deliveryDate, deliverySlotId });

// GET /customer/orders — the customer's orders, newest first. Paginated: the
// orders array is under `data`, with a sibling `pagination` object. Each order
// has vendorId & deliverySlotId (populated) plus totals/status/deliveryDate.
export const fetchOrders = (params) => api.get('/customer/orders', { params });

// GET /customer/orders/:id — a single order with its items and status logs:
// { order, items, logs }. Each item has productVariantId populated with its
// product (name, unit, imageUrl), quantity, priceAtTime, totalPrice.
export const fetchOrder = id => api.get(`/customer/orders/${id}`);
