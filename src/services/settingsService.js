import api from './api';

// GET /settings/support → { appsupportNumber, appsupportEmail }
// Authenticated, any role (see mauli-api modules/index.js — mounted behind
// verifyToken with no role guard), so transporters can read it too. Values are
// admin-editable, so both fields can come back as empty strings.
export const fetchSupportContact = () =>
  api.get('/settings/support').then(res => {
    const data = res?.data ?? {};
    return {
      phone: data.appsupportNumber ?? '',
      email: data.appsupportEmail ?? '',
    };
  });
