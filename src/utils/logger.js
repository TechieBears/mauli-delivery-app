import { ENABLE_LOGS } from '@env';

/**
 * logger — a console wrapper whose output is toggled by the `ENABLE_LOGS` env var.
 *
 * Every `console.*` call in the app goes through here so a single flag in `.env`
 * controls whether the build is chatty (dev/staging debugging) or silent
 * (production releases, where request/response bodies must not reach device logs).
 *
 * .env:
 *   ENABLE_LOGS=true    → logs printed
 *   ENABLE_LOGS=false   → logs suppressed
 *
 * `react-native-dotenv` inlines env values as strings at build time, so the flag
 * is compared as a string. Because it is a build-time constant, `LOGS_ENABLED`
 * folds to a literal and the dead branch is dropped by the minifier in release
 * builds — the log arguments are never even evaluated.
 *
 * Unset falls back to `__DEV__`: a debug build still logs, a release build stays
 * quiet, so a missing var can never accidentally ship a chatty production app.
 */
export const LOGS_ENABLED =
  ENABLE_LOGS == null || ENABLE_LOGS === ''
    ? __DEV__
    : String(ENABLE_LOGS).toLowerCase() === 'true';

const noop = () => {};

const logger = {
  log: LOGS_ENABLED ? console.log : noop,
  warn: LOGS_ENABLED ? console.warn : noop,
  info: LOGS_ENABLED ? console.info : noop,
  debug: LOGS_ENABLED ? console.debug : noop,
  // Errors follow the same switch: in a silenced production build we don't want
  // payloads leaking to device logs via console.error either. Report real
  // failures to the user through `toast`, or to a crash reporter, not console.
  error: LOGS_ENABLED ? console.error : noop,
};

export default logger;
