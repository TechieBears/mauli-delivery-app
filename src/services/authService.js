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

// DELETE /api/user/delete-account — permanently deletes the signed-in account.
// Authenticated: the server deletes whoever holds the bearer token, so nothing
// identifying the account is sent in the body. Required by App Store guideline
// 5.1.1(v). Irreversible — the caller must confirm with the user first.
export const deleteAccount = () => api.delete('/user/delete-account');
