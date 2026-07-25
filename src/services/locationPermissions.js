import { Platform, Alert, Linking, PermissionsAndroid } from 'react-native';

// Guarded require: the library builds a NativeEventEmitter at module load, which
// throws if the native module is missing (e.g. iOS pods not rebuilt into the
// binary). Importing it behind a try means a missing module degrades gracefully
// instead of crashing every screen that touches location.
let Geolocation = null;
try {
  Geolocation = require('react-native-geolocation-service').default;
} catch (e) {
  console.warn(
    '[locationPermissions] geolocation native module unavailable — ' +
      String(e?.message ?? e),
  );
}

// Location tracking needs both a foreground grant and — so it keeps running while
// the rider is switched to another app mid-delivery — a background grant. The two
// must be requested as separate steps: Android 10+ rejects a combined request, and
// iOS only escalates to "Always" after "When in Use" is already held.
//
// Mirrors the conventions in ./permissions.js (PermissionsAndroid, the
// Open-Settings alert on a permanent denial) rather than pulling in
// react-native-permissions.

const isAndroid = Platform.OS === 'android';
const GRANTED = PermissionsAndroid.RESULTS.GRANTED;
// ACCESS_BACKGROUND_LOCATION is a distinct runtime permission from API 29 (Android 10).
const needsSeparateBackground = isAndroid && Number(Platform.Version) >= 29;

const promptOpenSettings = () => {
  Alert.alert(
    'Location permission required',
    'Allow location access — including "Allow all the time" — in Settings so we can share your delivery location.',
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ],
  );
};

const requestAndroidLocation = async () => {
  // Step 1 — foreground (fine) location. Without this there is nothing to track.
  const fine = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  let fineGranted = fine;
  if (!fineGranted) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message:
          'Mauli Mart shares your vehicle location with the customer while a delivery is in progress.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      promptOpenSettings();
    }
    fineGranted = result === GRANTED;
  }

  if (!fineGranted) {
    return { granted: false, background: false };
  }

  // Step 2 — background location (Android 10+). Foreground-only still lets us
  // track while the app is open, so a background denial is not fatal.
  if (!needsSeparateBackground) {
    return { granted: true, background: true };
  }

  const bg = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
  );
  if (bg) {
    return { granted: true, background: true };
  }

  const bgResult = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
    {
      title: 'Allow location all the time',
      message:
        'To keep sharing your location when the app is in the background, choose "Allow all the time".',
      buttonPositive: 'Allow',
      buttonNegative: 'Not now',
    },
  );
  if (bgResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    promptOpenSettings();
  }
  return { granted: true, background: bgResult === GRANTED };
};

const requestIosLocation = async () => {
  if (!Geolocation) {
    return { granted: false, background: false };
  }
  // 'always' asks for the background-capable grant directly; iOS shows the
  // "When in Use" prompt first and escalates to "Always" on its own schedule.
  const status = await Geolocation.requestAuthorization('always');
  if (status === 'granted') {
    return { granted: true, background: true };
  }
  if (status === 'whenInUse') {
    // Works while the app is foregrounded; background updates may pause.
    return { granted: true, background: false };
  }
  if (status === 'denied' || status === 'disabled' || status === 'restricted') {
    promptOpenSettings();
  }
  return { granted: false, background: false };
};

/**
 * Request the permissions needed for delivery location tracking.
 *
 * Resolves to `{ granted, background }`:
 *   - granted    — tracking can run at least while the app is foregrounded
 *   - background — tracking will continue when the app is minimised
 *
 * Never throws — callers decide what to do with a partial/denied result.
 */
export const ensureLocationPermission = async () => {
  try {
    return isAndroid ? await requestAndroidLocation() : await requestIosLocation();
  } catch {
    return { granted: false, background: false };
  }
};

/**
 * SILENTLY check whether "all the time" (background) location is currently
 * granted — no OS prompt. Used by the in-transit gate to detect a revocation
 * without pestering the rider.
 *
 * Android: reads ACCESS_BACKGROUND_LOCATION (or FINE on pre-Android-10, where
 * a foreground grant already covers background). iOS: this library exposes no
 * silent status query, so we don't block iOS here (returns true) — iOS keeps
 * delivering background updates under the "Always" grant on its own terms.
 *
 * Never throws — returns a plain boolean.
 */
export const hasBackgroundLocationPermission = async () => {
  if (!isAndroid) {
    return true;
  }
  try {
    if (!needsSeparateBackground) {
      return PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
    }
    return PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
    );
  } catch {
    return false;
  }
};
