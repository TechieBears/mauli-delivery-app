import axios from 'axios';
import { CONFIG } from '../constants';
import { storage } from '../storage';
import { STORAGE_KEYS } from '../constants';
import useAppStore from '../store/useAppStore';
import { resetToLogin } from '../navigation/navigationRef';
import toast from '../utils/toast';

const api = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// DEBUG: serialize a request body for logging. FormData can't be
// JSON-stringified, so unpack it into a plain object of field → value. File
// parts are summarised (name/type/uri) rather than dumped whole.
const describeBody = data => {
  if (data == null) return undefined;
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    const parts = data.getParts?.() ?? [];
    const fields = {};
    parts.forEach(p => {
      const key = p.fieldName ?? p.name ?? 'field';
      // A file part carries `uri`; a plain text field carries `string`.
      fields[key] = p.uri
        ? { _file: p.name ?? '(unnamed)', type: p.type, uri: p.uri }
        : p.string;
    });
    return { _formData: fields };
  }
  return data;
};

api.interceptors.request.use(
  config => {
    const token = storage.getString(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Log the full request (method, URL, payload) — for sharing with backend.
    const fullUrl = `${config.baseURL ?? ''}${config.url ?? ''}`;
    console.log(
      `[api] → ${config.method?.toUpperCase()} ${fullUrl}`,
      JSON.stringify(
        {
          params: config.params,
          body: describeBody(config.data),
          hasAuth: !!token,
        },
        null,
        2,
      ),
    );
    return config;
  },
  error => Promise.reject(error),
);

// ─── Silent token refresh on 401 ──────────────────────────────────────────────
// A single in-flight refresh is shared across all concurrent 401s so we don't
// fire N refresh calls (or N logouts) when several requests fail at once.
let refreshPromise = null;

const forceLogout = () => {
  // Stop any active location watcher so a logged-out device stops streaming.
  // Required lazily to avoid an import cycle (LocationTrackingService →
  // transporterService → api).
  try {
    require('./LocationTrackingService').default.stop();
  } catch (_) {}
  useAppStore.getState().logout();
  toast.info('Session expired', 'Please verify your number again to continue.');
  resetToLogin();
};

// Uses a bare axios call (not the `api` instance) so it never re-enters this
// interceptor. Resolves to a fresh access token, or null if refresh failed.
const refreshAccessToken = async () => {
  // Prefer the raw MMKV key; fall back to the persisted store so users who were
  // already logged in before this key existed still get seamless refresh.
  const refreshToken =
    storage.getString(STORAGE_KEYS.REFRESH_TOKEN) ||
    useAppStore.getState().refreshToken;
  if (!refreshToken) return null;
  try {
    const res = await axios.post(
      `${CONFIG.API_BASE_URL}/auth/refresh-token`,
      { refreshToken },
      { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } },
    );
    const newToken = res?.data?.data?.accessToken;
    if (!newToken) return null;
    useAppStore.getState().setAccessToken(newToken);
    return newToken;
  } catch (_) {
    return null;
  }
};

api.interceptors.response.use(
  response => {
    // Log the response for the matching request — for sharing with backend.
    console.log(
      `[api] ← ${response.config?.method?.toUpperCase()} ${response.config?.url} (${response.status})`,
      JSON.stringify(response.data, null, 2),
    );
    return response.data;
  },
  async error => {
    // Log the failed response (status + backend body) — for sharing with backend.
    console.log(
      `[api] ✗ ${error?.config?.method?.toUpperCase()} ${error?.config?.url} (${error?.response?.status ?? 'no response'})`,
      JSON.stringify(error?.response?.data ?? error?.message, null, 2),
    );
    const status = error?.response?.status;
    const originalRequest = error?.config;
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Something went wrong';

    // Access token expired/invalid — try a silent refresh once, then retry the
    // original request. Only log the user out if the refresh itself fails.
    // The `_retried` flag prevents an infinite loop if the retry also 401s.
    const isRefreshCall = originalRequest?.url?.includes('/auth/refresh-token');
    if (status === 401 && originalRequest && !originalRequest._retried && !isRefreshCall) {
      originalRequest._retried = true;

      console.log('[api] 401 on', originalRequest?.method?.toUpperCase(), originalRequest?.url, {
        backendMessage: error?.response?.data?.message,
      });

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
      }
      const newToken = await refreshPromise;

      if (newToken) {
        // Replay the original request with the new token.
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }

      // Refresh failed (no/expired refresh token) — genuinely log out.
      forceLogout();
    } else if (status === 401) {
      // A 401 on the refresh call itself, or an already-retried request.
      forceLogout();
    }

    const enhancedError = new Error(message);
    enhancedError.status = status;
    enhancedError.data = error?.response?.data;
    return Promise.reject(enhancedError);
  },
);

export default api;
