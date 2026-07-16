import api from './api';

export const DEFAULT_COUNTRY_CODE = '+91';

// Step 1 — POST /api/auth/send-otp
// name/role are required by the backend when the phone number is unknown (new registration).
// countryCode defaults to +91 (the backend also defaults to +91 if omitted).
export const sendOtp = (phone, name, role, countryCode) =>
  api.post('/auth/send-otp', {
    phone,
    countryCode: countryCode || DEFAULT_COUNTRY_CODE,
    ...(name && { name }),
    ...(role && { role }),
  });

// Step 2 — POST /api/auth/verify-otp
export const verifyOtp = (phone, otp) =>
  api.post('/auth/verify-otp', { phone, otp });
