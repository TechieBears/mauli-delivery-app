import { Platform, AppState } from 'react-native';
import { ensureLocationPermission } from './locationPermissions';
import { postVehicleLocation } from './transporterService';
import logger from '../utils/logger';

// These two wrap native modules. If a native module is missing (e.g. the iOS
// pods weren't rebuilt into the binary), the libraries throw at construction
// time — `new NativeEventEmitter()` with a null module. Loading them behind a
// guarded require means that failure disables tracking gracefully instead of
// crashing the whole app at import (which previously took down any screen that
// imported this service).
let Geolocation = null;
let notifee = null;
let AndroidImportance = { LOW: 2 };
try {
  Geolocation = require('react-native-geolocation-service').default;
  const notifeeModule = require('@notifee/react-native');
  notifee = notifeeModule.default;
  AndroidImportance = notifeeModule.AndroidImportance ?? AndroidImportance;
} catch (e) {
  logger.warn(
    '[LocationTracking] native module unavailable — location tracking disabled. ' +
      'Rebuild the app (iOS: pod install + rebuild in Xcode). ' +
      String(e?.message ?? e),
  );
}

/**
 * LocationTrackingService — the single owner of the vehicle location watcher.
 *
 * Tracking is per-VEHICLE, not per-order: one pickup QR moves a batch of orders
 * to 'intransit' for one vehicle, and the backend fans the vehicle's position out
 * to each of those orders. So this module streams a single GPS position for the
 * vehicle and does not know or care about individual orders.
 *
 * Lifecycle:
 *   start(vehicleNo)  — called when a pickup is confirmed (orders → 'intransit')
 *   stop()            — called when the vehicle's last 'intransit' order is
 *                       delivered, and on logout
 *
 * Update cadence (only ever runs while there IS an active delivery — when there
 * are no in-transit orders, start() is never called, so nothing is pushed):
 * push the location every UPDATE_MS (~14 min) in ALL states — app open, phone
 * locked, or another app in front.
 *
 * On Android the interval runs behind a Notifee foreground service + persistent
 * notification so it keeps firing when minimised. On iOS a JS interval is
 * suspended in the background, so a native watchPosition (coarse distanceFilter)
 * is kept alive as the background heartbeat instead — the "location"
 * UIBackgroundMode + "Always" grant lets it deliver while locked.
 */

const isAndroid = Platform.OS === 'android';
const CHANNEL_ID = 'delivery-tracking';

// How often to push the location while a delivery is active — same in every
// state (app open, locked, backgrounded).
const UPDATE_MS = 14 * 60 * 1000; // 14 min

// Module-level singleton state — one tracker per app process.
let currentVehicleNo = null;
let running = false;
let channelReady = false;
let pushTimer = null; // JS interval driving the timed pushes
let appStateSub = null; // AppState listener, to flip cadence
let iosWatchId = null; // native background heartbeat (iOS only)

// One-shot position read used for each timed push.
const POSITION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 10000,
  forceRequestLocation: true,
  showLocationDialog: true,
};

// Coarse native watcher used ONLY on iOS as a background heartbeat, since JS
// timers don't fire while iOS is backgrounded.
const IOS_BG_WATCH_OPTIONS = {
  enableHighAccuracy: false,
  distanceFilter: 100,
  showsBackgroundLocationIndicator: true,
  pausesLocationUpdatesAutomatically: false,
};

const ensureChannel = async () => {
  if (channelReady) return;
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Delivery tracking',
    // Low importance — the notification must stay up (foreground-service
    // requirement) but shouldn't buzz or interrupt on every update.
    importance: AndroidImportance.LOW,
  });
  channelReady = true;
};

const startForegroundNotification = async () => {
  if (!notifee) return;
  await ensureChannel();
  // A no-op long-lived task: its presence is what keeps the service alive; the
  // watcher, not this callback, does the real work.
  notifee.registerForegroundService(() => new Promise(() => {}));
  await notifee.displayNotification({
    title: 'Delivery in progress',
    body: 'Sharing your location with the customer.',
    android: {
      channelId: CHANNEL_ID,
      asForegroundService: true,
      ongoing: true,
      // Keeps a single persistent notification rather than stacking new ones.
      onlyAlertOnce: true,
      pressAction: { id: 'default' },
    },
  });
};

// Fire-and-forget push. Failures are dropped (no queue, no retry) so a flaky
// network can't build backpressure or drain the battery — the next callback
// (~50 m or ~10 s away) is the retry.
//
// Logs each attempt and its outcome so you can confirm in the console (Metro /
// `adb logcat -s ReactNativeJS`) that location is reaching the server.
const pushLocation = (vehicleNo, lat, lng) => {
  logger.log(
    `[LocationTracking] → POST /transporter/location`,
    JSON.stringify({ vehicleNo, lat, lng }),
  );
  postVehicleLocation({ lat, lng, vehicleNo })
    .then(res => {
      logger.log(
        `[LocationTracking] ✓ location saved`,
        JSON.stringify(res?.data ?? res ?? {}),
      );
    })
    .catch(err => {
      // Still dropped (no retry) — logged only so failures are visible.
      logger.log(
        `[LocationTracking] ✗ location NOT saved (status ${err?.status ?? 'n/a'}): ${err?.message ?? err}`,
      );
    });
};

// Read one fresh position and push it. Used for every timed tick.
const captureAndPush = () => {
  if (!Geolocation || !currentVehicleNo) return;
  const vehicleNo = currentVehicleNo;
  Geolocation.getCurrentPosition(
    position => {
      const { latitude, longitude, accuracy } = position.coords;
      logger.log(
        `[LocationTracking] fix: ${latitude}, ${longitude} (±${accuracy}m)`,
      );
      pushLocation(vehicleNo, latitude, longitude);
    },
    error => {
      logger.warn('[LocationTracking] position error', error?.code, error?.message);
    },
    POSITION_OPTIONS,
  );
};

// (Re)start the JS interval at the given cadence, pushing once immediately so a
// cadence change (e.g. returning to the foreground) refreshes the location now.
const runInterval = ms => {
  if (pushTimer) clearInterval(pushTimer);
  captureAndPush();
  pushTimer = setInterval(captureAndPush, ms);
};

// Single 14-min cadence in every state. Re-armed on AppState changes so a
// foreground return refreshes the location immediately (runInterval pushes once
// up front) and the interval is re-created after iOS resumes the JS thread.
const applyCadence = () => {
  if (!running) return;
  logger.log('[LocationTracking] cadence → every 14min');
  runInterval(UPDATE_MS);
};

const start = async vehicleNo => {
  if (!vehicleNo) return;
  if (!Geolocation) {
    logger.warn('[LocationTracking] cannot start — native module unavailable');
    return;
  }

  // Idempotent per vehicle: batched pickups and re-entry must not spawn a second
  // tracker. A different vehicle replaces the current one.
  if (running && currentVehicleNo === vehicleNo) return;
  if (running) {
    await stop();
  }

  const { granted, background } = await ensureLocationPermission();
  if (!granted) {
    logger.log(
      `[LocationTracking] permission denied — not tracking ${vehicleNo}`,
    );
    // The caller shows the rationale/OS prompt; a denied grant shouldn't block
    // the pickup itself, so just bail quietly.
    return;
  }
  logger.log(
    `[LocationTracking] starting for ${vehicleNo} (background=${background})`,
  );

  currentVehicleNo = vehicleNo;
  running = true;

  if (isAndroid) {
    try {
      await startForegroundNotification();
    } catch {
      // If the notification can't be shown we still track while foregrounded.
    }
  } else {
    // iOS: JS timers are suspended in the background, so keep a coarse native
    // watcher alive as the background heartbeat. It fires sparingly (100m filter)
    // and each fix is pushed the same way.
    iosWatchId = Geolocation.watchPosition(
      position => {
        if (AppState.currentState === 'active') return; // foreground uses the interval
        const { latitude, longitude } = position.coords;
        logger.log('[LocationTracking] iOS bg fix');
        pushLocation(currentVehicleNo, latitude, longitude);
      },
      error =>
        logger.warn('[LocationTracking] iOS bg watch error', error?.code, error?.message),
      IOS_BG_WATCH_OPTIONS,
    );
  }

  // Drive the timed pushes, and switch cadence whenever the app moves between
  // foreground and background.
  appStateSub = AppState.addEventListener('change', applyCadence);
  applyCadence(AppState.currentState);
};

const stop = async () => {
  if (running) {
    logger.log(`[LocationTracking] stopping (was tracking ${currentVehicleNo})`);
  }

  if (pushTimer) {
    clearInterval(pushTimer);
    pushTimer = null;
  }
  if (appStateSub) {
    appStateSub.remove();
    appStateSub = null;
  }
  if (Geolocation && iosWatchId != null) {
    Geolocation.clearWatch(iosWatchId);
    iosWatchId = null;
  }
  if (Geolocation) {
    Geolocation.stopObserving();
  }

  if (isAndroid && notifee) {
    try {
      await notifee.stopForegroundService();
    } catch {
      // Nothing to stop / already gone.
    }
  }

  running = false;
  currentVehicleNo = null;
};

const isTracking = () => running;
const getVehicleNo = () => currentVehicleNo;

export default { start, stop, isTracking, getVehicleNo };
