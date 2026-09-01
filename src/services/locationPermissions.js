import { Platform, Alert, Linking, PermissionsAndroid } from 'react-native';
import logger from '../utils/logger';

// Guarded require: the library builds a NativeEventEmitter at module load, which
// throws if the native module is missing (e.g. iOS pods not rebuilt into the
// binary). Importing it behind a try means a missing module degrades gracefully
// instead of crashing every screen that touches location.
let Geolocation = null;
try {
  Geolocation = require('react-native-geolocation-service').default;
} catch (e) {
  logger.warn(
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
    'Allow location access — including "Allow all the time" — in Settings so we can track the order using your vehicle location.',
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
          'Mauli G-Mart Transporter uses your location as your vehicle location to track the order while a delivery is in progress.',
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
      title: 'Background location',
      message:
        'Tracking continues while the app is in the background so the order keeps updating during a delivery.',
      buttonPositive: 'Continue',
      buttonNegative: 'Cancel',
    },
  );
  if (bgResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    promptOpenSettings();
  }
  return { granted: true, background: bgResult === GRANTED };
};

/**
 * iOS status probe that NEVER shows a dialog once the choice has been made.
 *
 * The library exposes no dedicated status query, but its native
 * `requestAuthorization` (RNFusedLocation.swift) resolves immediately with the
 * current status whenever it is anything other than `notDetermined` — it only
 * presents a dialog on the genuinely-undetermined first run. So this is safe to
 * call for a silent check, and is the only way to detect a denial on iOS.
 *
 * Note the native `toPermissionStatus` collapses BOTH `authorizedAlways` and
 * `authorizedWhenInUse` into 'granted', so a 'granted' result here does not prove
 * we hold "Always" — don't infer background capability from it.
 */
const getIosStatus = async () => {
  if (!Geolocation) return 'disabled';
  try {
    return await Geolocation.requestAuthorization('always');
  } catch {
    return 'denied';
  }
};

const requestIosLocation = async () => {
  if (!Geolocation) {
    return { granted: false, background: false };
  }
  // 'always' asks for the background-capable grant directly; iOS shows the
  // "When in Use" prompt first and escalates to "Always" on its own schedule.
  const status = await getIosStatus();
  if (status === 'granted') {
    // 'granted' covers both Always and When-in-Use (see getIosStatus) and we
    // can't tell them apart, so don't claim background here — the iOS branch of
    // hasBackgroundLocationPermission deliberately doesn't gate on it either.
    return { granted: true, background: false };
  }
  // Denied/disabled/restricted. iOS will NEVER show the prompt again after a
  // "Don't Allow" — requestAuthorization returns 'denied' silently from then on.
  // No alert from here: LocationPermissionModal already detects this state via
  // canPromptForLocation() and offers "Open Settings" on the disclosure itself,
  // so raising one would stack a second Settings prompt on top of it.
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
 * SILENTLY check whether we hold at least FOREGROUND location — no OS prompt.
 *
 * This is the check LocationTrackingService.start() uses: it must never trigger a
 * runtime prompt of its own, because it runs from places with no disclosure on
 * screen (Home focus, right after a pickup). Google Play requires every prompt to
 * be immediately preceded by the disclosure in <LocationPermissionModal>, which
 * is the only place allowed to call `ensureLocationPermission()`.
 *
 * Foreground is the right threshold: a rider who granted "While using the app"
 * should still have their location pushed while the app is open.
 *
 * iOS uses getIosStatus, which doesn't show a dialog once the choice is made. It
 * can only prompt on a first run that never went through the disclosure, and
 * start() is not such a path — the disclosure always settles the grant first.
 *
 * Never throws — returns a plain boolean.
 */
/**
 * Can the OS still show a location prompt, or is Settings the only route left?
 *
 * Drives whether the disclosure modal is worth showing: the disclosure exists to
 * immediately precede a runtime prompt, so when no prompt can appear it would
 * promise a choice the OS won't offer. (Nothing is collected in that state
 * either, so skipping it raises no Play-policy concern.)
 *
 * iOS: after a "Don't Allow" the prompt is suppressed permanently —
 * requestAuthorization returns 'denied' silently forever.
 * Android: equivalent state is "never ask again", which isn't readable up front;
 * PermissionsAndroid.request() reports NEVER_ASK_AGAIN only after the fact, and
 * that path already routes to promptOpenSettings(). So Android always gets the
 * disclosure, which is what the Play requirement is about.
 *
 * Never throws.
 */
export const canPromptForLocation = async () => {
  if (isAndroid) return true;
  const status = await getIosStatus();
  // 'granted' still returns true: re-running the flow is harmless and the
  // caller re-checks the grant afterwards anyway.
  return status !== 'denied' && status !== 'restricted';
};

export const hasLocationPermission = async () => {
  if (!isAndroid) {
    return (await getIosStatus()) === 'granted';
  }
  try {
    return await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
  } catch {
    return false;
  }
};

/**
 * SILENTLY check whether "all the time" (background) location is currently
 * granted — no OS prompt. Used by the in-transit gate to detect a revocation
 * without pestering the rider.
 *
 * Android: reads ACCESS_BACKGROUND_LOCATION (or FINE on pre-Android-10, where
 * a foreground grant already covers background).
 *
 * iOS: gate on ANY grant, not on "Always". The native layer reports both
 * authorizedAlways and authorizedWhenInUse as 'granted' with no way to tell them
 * apart, so requiring "Always" would trap a When-in-Use rider behind a block
 * screen that can never lift. A denial IS detected now, which is the case that
 * matters — previously this returned true unconditionally, so an iOS rider who
 * tapped "Don't Allow" was never gated and simply never tracked, silently.
 *
 * Never throws — returns a plain boolean.
 */
export const hasBackgroundLocationPermission = async () => {
  if (!isAndroid) {
    return (await getIosStatus()) === 'granted';
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
