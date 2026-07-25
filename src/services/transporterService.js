import api from './api';

// Registration itself (name/phone/role) is handled entirely by
// /auth/send-otp + /auth/verify-otp — no separate account-save call needed.

// GET /transporter/profile — returns the Transporter doc with `userId`
// populated (name, countryCode, phone, status, isActive), e.g.
//   { _id, userId: { name, phone, … }, vehicles: [{ vehicleNo }],
//     drivingLicenseNo, drivingLicenseFile, kycStatus, isActive }
export const fetchTransporterProfile = () => api.get('/transporter/profile');

// PATCH /transporter/profile — multipart, because the licence is a file upload.
// The backend reads `drivingLicenseNo`, `vehicles` and `drivingLicenseFile`;
// `vehicles` must be a JSON-encoded array of plate strings.
//
// `isTermAccepted` and `kycStatus` are both accepted here but neither is
// persisted by the backend today: the Transporter model defines no
// isTermAccepted field, and updateProfile only reads drivingLicenseNo,
// vehicles and drivingLicenseFile — unknown keys are dropped silently, so the
// PATCH returns 200 having ignored them. kycStatus in particular is the admin's
// approval decision (PATCH /admin/transporters/:id); a transporter cannot
// approve themselves. Both are sent so the app is correct once the backend
// catches up; until then acceptance lives in useAppStore.termsAccepted.
export const updateTransporterProfile = ({
  drivingLicenseNo,
  vehicles,
  drivingLicenseFile,
  isTermAccepted,
  kycStatus,
}) => {
  const form = new FormData();

  if (drivingLicenseNo != null) {
    form.append('drivingLicenseNo', drivingLicenseNo);
  }

  if (vehicles != null) {
    // Accept either ['MH12AB1234'] or [{ vehicleNo: 'MH12AB1234' }].
    const plates = vehicles
      .map(v => (typeof v === 'string' ? v : v?.vehicleNo))
      .filter(Boolean);
    form.append('vehicles', JSON.stringify(plates));
  }

  if (drivingLicenseFile) {
    // Shape produced by utils/imagePicker (`fileName`, not `name`).
    form.append('drivingLicenseFile', {
      uri: drivingLicenseFile.uri,
      type: drivingLicenseFile.type ?? 'image/jpeg',
      name: drivingLicenseFile.fileName ?? drivingLicenseFile.name ?? 'driving-license.jpg',
    });
  }

  if (isTermAccepted != null) {
    form.append('isTermAccepted', String(isTermAccepted));
  }

  if (kycStatus != null) {
    form.append('kycStatus', kycStatus);
  }

  // Mirrors the equivalent curl, so what the app sends can be compared against
  // a hand-run request field for field.
  console.log(
    '[transporterService] PATCH /transporter/profile — sending:',
    JSON.stringify(
      {
        drivingLicenseNo,
        vehicles,
        drivingLicenseFile: drivingLicenseFile
          ? { name: drivingLicenseFile.fileName ?? drivingLicenseFile.name, type: drivingLicenseFile.type, uri: drivingLicenseFile.uri }
          : undefined,
        // Sent, but the backend ignores both — see the note above.
        isTermAccepted,
        kycStatus,
      },
      null,
      2,
    ),
  );

  return api.patch('/transporter/profile', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// ─── Orders ───────────────────────────────────────────────────────────────────

// GET /transporter/orders — assigned deliveries, paginated. Without `status` the
// backend returns the active set (ready_for_pickup + intransit).
export const fetchTransporterOrders = status =>
  api.get('/transporter/orders', { params: status ? { status } : undefined });

// GET /transporter/orders/:id — resolves to { order, items }.
export const fetchTransporterOrderById = id => api.get(`/transporter/orders/${id}`);

// GET /transporter/dashboard/vendors — the vendors this transporter has orders
// for, one row per vendor, e.g.
//   { orderCount, vendorId, vendorName, vendorPhone, address: { line, state } }
// `address` is whatever subset of line/city/state/pincode the vendor filled in.
//
// Without `status` the backend counts EVERY order ever assigned — including
// delivered and cancelled ones — so callers showing a "pending pickup" count
// must pass status=transporter_assigned, or a vendor whose orders are already
// picked up would still show a non-zero count.
export const fetchTransporterDashboardVendors = status =>
  api.get('/transporter/dashboard/vendors', {
    params: status ? { status } : undefined,
  });

// ─── QR pickup ────────────────────────────────────────────────────────────────

// POST /transporter/orders/scan-pickup — previews what a vendor's pickup QR
// contains without committing to it. Resolves to
//   { token, orders: [{ order, items: [...] }], skipped: [{ orderId, reason }] }
// where each `order` has customerId and deliverySlotId populated, and each item
// has productVariantId.productId populated with name/unit.
export const scanPickupQr = token =>
  api.post('/transporter/orders/scan-pickup', { token });

// POST /transporter/orders/confirm-pickup — commits the handoff, moving every
// eligible order in the batch to 'intransit'. Resolves to { assigned, skipped }.
//
// The backend takes only the token and picks up the WHOLE batch — there is no
// partial-pickup support, so the app must not send a subset. The per-order
// checkboxes in the confirm modal are a physical checklist for the transporter,
// not a filter.
//
// `vehicleNo` may be omitted only when the transporter has exactly one vehicle
// on file; otherwise the backend 400s asking which vehicle is being used. A
// plate that isn't on file yet is appended to their vehicle list.
export const confirmPickup = ({ token, vehicleNo }) =>
  api.post('/transporter/orders/confirm-pickup', {
    token,
    ...(vehicleNo && { vehicleNo }),
  });

// ─── Delivery handover ────────────────────────────────────────────────────────

// POST /transporter/orders/:id/send-delivery-otp — texts a 10-minute OTP to
// `receiverPhone`. Both fields are REQUIRED by the validator even though the
// receiver is only persisted at verify time; a bare {} responds 400.
//
// The order must be 'intransit'. In development the backend echoes the OTP back
// as { otp } so it can be read without an SMS gateway; in production data is {}.
export const sendDeliveryOtp = ({ id, receiverName, receiverPhone }) =>
  api.post(`/transporter/orders/${id}/send-delivery-otp`, {
    receiverName,
    receiverPhone,
  });

// POST /transporter/orders/:id/verify-delivery-otp — on success the order flips
// to 'delivered', `receiver` is stamped with these details, and the complaint
// window opens. receiverName/receiverPhone are required here too.
export const verifyDeliveryOtp = ({ id, otp, receiverName, receiverPhone }) =>
  api.post(`/transporter/orders/${id}/verify-delivery-otp`, {
    otp,
    receiverName,
    receiverPhone,
  });

// ─── Live location ──────────────────────────────────────────────────────────

// POST /transporter/location — pushes the vehicle's current position. The backend
// keys the last-known location by the vehicle and fans it out to that vehicle's
// active orders, so the client only sends the vehicle + coordinates.
//
// Called on every native watcher callback (~every 50 m moved or ~10 s). Fire it
// and forget: LocationTrackingService drops failures rather than queueing, so a
// dropped write is simply corrected by the next callback. The backend rejects
// writes for a vehicle with no active order (409); that rejection is ignored here.
export const postVehicleLocation = ({ lat, lng, vehicleNo }) =>
  api.post('/transporter/location', { lat, lng, vehicleNo });

// PUT /user/profile — the shared self endpoint (any authenticated role).
// Transporters can only self-update name and email here; `phone` is the OTP
// identity and has no self-service route, so it stays read-only in the UI.
export const updateUserProfile = ({ name, email }) =>
  api.put('/user/profile', {
    ...(name != null && { name }),
    ...(email != null && { email }),
  });
