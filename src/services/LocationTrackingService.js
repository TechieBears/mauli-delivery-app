import { Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { ensureLocationPermission } from './locationPermissions';
import { postVehicleLocation } from './transporterService';

/**
 * LocationTrackingService — the single owner of the vehicle location watcher.
 *
 * Tracking is per-VEHICLE, not per-order: one pickup QR moves a batch of orders
 * to 'intransit' for one vehicle, and the backend fans the vehicle's position out
 * to each of those orders. So this module streams a single GPS position for the
 * vehicle and does not know or care about individual orders.
 *
 * Lifecycle is driven entirely by order-status transitions, not timers:
 *   start(vehicleNo)  — called when a pickup is confirmed (orders → 'intransit')
 *   stop()            — called when the vehicle's last 'intransit' order is
 *                       delivered, and on logout
 *
 * On Android the watcher runs behind a Notifee foreground service + persistent
 * notification so it survives the app being minimised. On iOS the "location"
 * UIBackgroundMode plus an "Always" grant keeps updates flowing in the background.
 */

const isAndroid = Platform.OS === 'android';
const CHANNEL_ID = 'delivery-tracking';

// Module-level singleton state — one watcher per app process.
let watchId = null;
let currentVehicleNo = null;
let running = false;
let channelReady = false;

// react-native-geolocation-service watch options.
//   distanceFilter — emit after ~50 m of movement (requirement)
//   interval / fastestInterval — Android fallback cadence when stationary
const WATCH_OPTIONS = {
  enableHighAccuracy: true,
  distanceFilter: 50,
  interval: 10000,
  fastestInterval: 5000,
  showsBackgroundLocationIndicator: true, // iOS status-bar indicator while tracking
  forceRequestLocation: true,
  showLocationDialog: true,
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
  console.log(
    `[LocationTracking] → POST /transporter/location`,
    JSON.stringify({ vehicleNo, lat, lng }),
  );
  postVehicleLocation({ lat, lng, vehicleNo })
    .then(res => {
      console.log(
        `[LocationTracking] ✓ location saved`,
        JSON.stringify(res?.data ?? res ?? {}),
      );
    })
    .catch(err => {
      // Still dropped (no retry) — logged only so failures are visible.
      console.log(
        `[LocationTracking] ✗ location NOT saved (status ${err?.status ?? 'n/a'}): ${err?.message ?? err}`,
      );
    });
};

const start = async vehicleNo => {
  if (!vehicleNo) return;

  // Idempotent per vehicle: batched pickups and re-entry must not spawn a second
  // watcher. A different vehicle replaces the current stream.
  if (running && currentVehicleNo === vehicleNo) return;
  if (running) {
    await stop();
  }

  const { granted, background } = await ensureLocationPermission();
  if (!granted) {
    console.log(
      `[LocationTracking] permission denied — not tracking ${vehicleNo}`,
    );
    // The caller shows the rationale/OS prompt; a denied grant shouldn't block
    // the pickup itself, so just bail quietly.
    return;
  }
  console.log(
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
  }

  watchId = Geolocation.watchPosition(
    position => {
      const { latitude, longitude, accuracy } = position.coords;
      console.log(
        `[LocationTracking] fix received: ${latitude}, ${longitude} (±${accuracy}m)`,
      );
      pushLocation(vehicleNo, latitude, longitude);
    },
    error => {
      console.warn('[LocationTracking] watch error', error?.code, error?.message);
    },
    WATCH_OPTIONS,
  );
};

const stop = async () => {
  if (running) {
    console.log(`[LocationTracking] stopping (was tracking ${currentVehicleNo})`);
  }
  if (watchId != null) {
    Geolocation.clearWatch(watchId);
    watchId = null;
  }
  Geolocation.stopObserving();

  if (isAndroid) {
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
