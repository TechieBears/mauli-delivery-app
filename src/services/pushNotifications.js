import { Platform } from 'react-native';
import { updateFcmToken } from './notificationService';
import { onNotificationArrived, openNotification } from '../utils/notificationEvents';
import useAppStore from '../store/useAppStore';
import logger from '../utils/logger';

// Must match the default_notification_channel_id meta-data in
// AndroidManifest.xml. On API 26+ Android silently drops any notification whose
// channel does not exist.
const CHANNEL_ID = 'mauli_default';

// Loaded lazily and defensively. These are native modules: on a binary built
// before `pod install` (or a Gradle sync) linked them, importing at module
// scope throws and takes the whole bundle down before React mounts. Push is a
// non-essential enhancement — the in-app notification list still works by
// polling — so a missing module must degrade to "no push", never to a crash.
// This is also the lazy-require pattern already used for Notifee in
// LocationTrackingService.js.
const loadNativeModules = () => {
  try {
    // @react-native-firebase v26 dropped the namespaced default export
    // (`messaging().getToken()`) in favour of the modular API — standalone
    // functions taking a messaging instance, mirroring the Firebase JS v9 SDK.
    // There is no `.default` on this module any more, so importing one yields
    // undefined and every call fails with "messaging is not a function".
    const fb = require('@react-native-firebase/messaging');
    const notifeeModule = require('@notifee/react-native');

    const messaging = fb.getMessaging();
    if (!messaging) return null;

    return {
      messaging,
      fb,
      notifee: notifeeModule.default,
      AndroidImportance: notifeeModule.AndroidImportance,
      EventType: notifeeModule.EventType,
    };
  } catch (err) {
    logger.log('[push] native modules unavailable —', err?.message);
    return null;
  }
};

// A push carries the notification's fields as strings in remoteMessage.data
// (FCM data payloads are string-only). Rebuild the shape the in-app list uses
// so openNotification and the deep-link resolver work on either path.
const notificationFromPush = remoteMessage => {
  const data = remoteMessage?.data ?? {};
  return {
    _id: data.notificationId || data._id || null,
    type: data.type || '',
    title: remoteMessage?.notification?.title ?? data.title ?? '',
    body: remoteMessage?.notification?.body ?? data.body ?? '',
    redirect: data.redirect || '',
    redirectId: data.redirectId || '',
    data,
    // A tapped push is by definition being read now; this also stops
    // openNotification from firing a redundant mark-read when the id is absent.
    isRead: false,
  };
};

const ensureChannel = async ({ notifee, AndroidImportance }) => {
  if (Platform.OS !== 'android') return;
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Order updates',
    importance: AndroidImportance.HIGH,
  });
};

// Asks for notification permission and makes sure the device is registered for
// remote messages. Returns whether permission was granted — but registration
// happens either way, and the caller still fetches a token when it is false.
//
// iOS needs an explicit prompt. Android 13+ POST_NOTIFICATIONS is already
// requested on launch by services/permissions.js, and requesting twice is
// harmless but pointless.
//
// Permission and token are independent on both platforms: a device can hold a
// perfectly valid FCM token while notifications are muted. Storing it anyway
// means a user who declines at first run (or mutes and later unmutes in
// Settings) starts receiving pushes immediately, instead of staying invisible
// to the backend until their next login.
const requestPermission = async ({ messaging, fb }) => {
  if (Platform.OS !== 'ios') return true;

  const status = await fb.requestPermission(messaging);
  const granted =
    status === fb.AuthorizationStatus.AUTHORIZED ||
    status === fb.AuthorizationStatus.PROVISIONAL;

  // iOS will not issue an FCM token until the device has an APNs token, and
  // registration is not automatic in every setup. Without this getToken()
  // rejects with "You must be registered for remote messages before calling
  // getToken". Done regardless of `granted` so a declined prompt still yields a
  // usable token.
  if (!fb.isDeviceRegisteredForRemoteMessages(messaging)) {
    await fb.registerDeviceForRemoteMessages(messaging);
  }

  return granted;
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Polls until iOS has an APNs token, or the timeout expires.
//
// Apple issues this asynchronously after registerDeviceForRemoteMessages(), so
// immediately after the permission prompt there is a window of a second or two
// where the device is registered but has no token yet. Firebase needs it before
// it can mint an FCM token.
const waitForApnsToken = async ({ fb, messaging }, timeoutMs = 10000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const apns = await fb.getAPNSToken(messaging);
      if (apns) return apns;
    } catch (_) {
      // Not ready yet — fall through to the retry.
    }
    await sleep(400);
  }
  return null;
};

// Reads the device's FCM token without touching the API.
//
// Used at login, where the token is sent inside the verify-OTP body so it is
// persisted in the same write that creates the session. Returns null whenever
// the token cannot be read (no native module, no permission, no Play Services)
// — callers must treat it as optional and never block login on it.
//
// Note this deliberately does NOT require an existing session, unlike
// syncFcmToken: at login time there is no token yet.
export const getDeviceFcmToken = async () => {
  const mods = loadNativeModules();
  if (!mods) {
    logger.log('[push] no token: native modules unavailable');
    return null;
  }
  try {
    // Prompts on iOS and registers for remote messages. We carry on even when
    // permission is refused: the token is still valid and worth storing, so
    // that enabling notifications later in Settings starts working right away
    // without needing another login.
    const allowed = await requestPermission(mods);
    if (!allowed) {
      logger.log('[push] permission not granted — fetching token anyway');
    }

    // On iOS, FCM cannot mint a token until Apple has issued an APNs token, and
    // that round trip is still in flight for a few seconds right after the user
    // taps "Allow" on a fresh install. Calling getToken() too early returns null
    // or throws, which registers no token at login. Wait for the APNs token
    // before asking for the FCM one.
    if (Platform.OS === 'ios') {
      const apns = await waitForApnsToken(mods);
      if (!apns) {
        logger.log('[push] no token: APNs registration did not complete in time');
        return null;
      }
    }

    const token = await mods.fb.getToken(mods.messaging);
    logger.log(
      token
        ? `[push] got token ${String(token).slice(0, 12)}…`
        : '[push] no token: getToken() returned empty',
    );
    return token || null;
  } catch (err) {
    logger.log('[push] no token:', err?.message);
    return null;
  }
};

// Whether the OS will currently display notifications for this app.
//
// Distinct from "do we have a token": the token can be perfectly valid while
// the user has notifications muted, in which case pushes are delivered but
// silently suppressed. Returns true on Android, where display permission is
// requested at launch by services/permissions.js.
export const hasNotificationPermission = async () => {
  if (Platform.OS !== 'ios') return true;
  const mods = loadNativeModules();
  if (!mods) return false;
  try {
    const status = await mods.fb.hasPermission(mods.messaging);
    return (
      status === mods.fb.AuthorizationStatus.AUTHORIZED ||
      status === mods.fb.AuthorizationStatus.PROVISIONAL
    );
  } catch (_) {
    return false;
  }
};

// Prompts for notification permission and, if the user agrees, re-registers the
// device token with the API.
//
// Called when opening the notifications screen: someone who declined at first
// run (or never saw the prompt) is clearly interested in notifications if they
// are looking at this screen, and their stored token may predate the approval.
// Re-syncing here means they start receiving pushes without another login.
//
// Returns true when permission is granted after the prompt.
export const ensurePushPermission = async () => {
  const mods = loadNativeModules();
  if (!mods) return false;

  try {
    const granted = await requestPermission(mods);
    if (!granted) return false;
    // syncFcmToken swallows its own errors and re-checks auth internally.
    await syncFcmToken({ attempts: 2, delayMs: 2000 });
    return true;
  } catch (err) {
    logger.log('[push] permission re-request failed', err?.message);
    return false;
  }
};

// Push the current device token to the API. Safe to call repeatedly — the
// backend just overwrites the field.
export const syncFcmToken = async ({ attempts = 3, delayMs = 3000 } = {}) => {
  // Retries because this is the backstop for the login path: on a fresh install
  // the token often is not mintable yet at the moment of verify-OTP (permission
  // prompt + APNs round trip), so the first attempt here can also miss. Without
  // a retry the device stays unregistered until the user happens to log in
  // again.
  for (let i = 0; i < attempts; i += 1) {
    try {
      // Re-checked each pass: a logout mid-retry must abandon the loop rather
      // than register a token against a session that no longer exists.
      if (!useAppStore.getState().isAuthenticated) return;

      const token = await getDeviceFcmToken();
      if (token) {
        await updateFcmToken(token);
        logger.log('[push] token registered with API');
        return;
      }
    } catch (err) {
      // Never fatal: a device that cannot register still works, it just misses
      // pushes until the next attempt.
      logger.log('[push] token registration failed', err?.message);
    }

    if (i < attempts - 1) await sleep(delayMs);
  }

  logger.log('[push] gave up registering token after retries');
};

// Foreground pushes are NOT displayed by the OS, so show one ourselves —
// otherwise a rider with the app open sees nothing until they open the bell.
const displayForeground = async ({ notifee }, remoteMessage) => {
  const { title, body } = remoteMessage?.notification ?? {};
  if (!title && !body) return;
  await notifee.displayNotification({
    title,
    body,
    data: remoteMessage?.data ?? {},
    android: { channelId: CHANNEL_ID, pressAction: { id: 'default' } },
  });
};

const handleTap = remoteMessage => {
  if (!remoteMessage) return;
  openNotification(notificationFromPush(remoteMessage));
};

// Wires every push path. Called once from App.jsx via usePushNotifications.
// Returns an unsubscribe that tears down all listeners.
export const initPushNotifications = async () => {
  const unsubscribers = [];

  // No native modules (binary predates the pod/gradle link) — skip silently.
  // The in-app list keeps working off its poll.
  const mods = loadNativeModules();
  if (!mods) return () => {};
  const { messaging, fb, notifee, EventType } = mods;

  try {
    await ensureChannel(mods);
    // Not gated on the result: even without permission the token is registered
    // and the listeners are wired, so the moment the user enables notifications
    // in Settings everything already works. Bailing out here would leave the
    // device unreachable until the next login.
    await requestPermission(mods);

    await syncFcmToken();

    // FCM rotates tokens; a stale token on the server means silent delivery
    // failure, so re-register whenever it changes.
    unsubscribers.push(
      fb.onTokenRefresh(messaging, async token => {
        try {
          if (!useAppStore.getState().isAuthenticated) return;
          await updateFcmToken(token);
        } catch (_) {}
      }),
    );

    // App open: refresh the badge/list, and surface a heads-up notification.
    unsubscribers.push(
      fb.onMessage(messaging, async remoteMessage => {
        onNotificationArrived();
        await displayForeground(mods, remoteMessage);
      }),
    );

    // Tapping a notifee notification we displayed ourselves (foreground case).
    unsubscribers.push(
      notifee.onForegroundEvent(({ type, detail }) => {
        if (type === EventType.PRESS) {
          handleTap({ data: detail?.notification?.data ?? {} });
        }
      }),
    );

    // Tapped while the app was backgrounded but alive.
    unsubscribers.push(
      fb.onNotificationOpenedApp(messaging, remoteMessage => {
        onNotificationArrived();
        handleTap(remoteMessage);
      }),
    );

    // Tapped while the app was killed. navigate() polls for the navigation
    // container, so this is safe to fire before the tree has mounted.
    const initial = await fb.getInitialNotification(messaging);
    if (initial) {
      onNotificationArrived();
      handleTap(initial);
    }
  } catch (err) {
    logger.log('[push] init failed', err?.message);
  }

  return () => unsubscribers.forEach(fn => fn?.());
};
