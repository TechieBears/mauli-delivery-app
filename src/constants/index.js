import { API_BASE_URL, APP_NAME, APP_ENV } from '@env';
import { LOGS_ENABLED } from '../utils/logger';

export const CONFIG = {
  API_BASE_URL,
  APP_NAME,
  APP_ENV,
  // Resolved log toggle (ENABLE_LOGS in .env, falling back to __DEV__).
  ENABLE_LOGS: LOGS_ENABLED,
};

export const QUERY_KEYS = {
  USERS: 'users',
  USER: 'user',
  POSTS: 'posts',
  POST: 'post',
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  THEME: 'theme',
  PUSH_ENABLED: 'push_enabled',
};
