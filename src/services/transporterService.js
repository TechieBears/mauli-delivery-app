import api from './api';

// Registration itself (name/phone/role) is handled entirely by
// /auth/send-otp + /auth/verify-otp — no separate account-save call needed.

// ⚠️ UNVERIFIED ROUTE — extrapolated from the /vendor/* namespace, which the
// vendor app proves exists. Confirm with the backend team before relying on
// this; the transporter controller is known to exist (the vendor's delivery-OTP
// flow reuses it) but its public route prefix has not been checked.
export const fetchTransporterProfile = () => api.get('/transporter/profile');
