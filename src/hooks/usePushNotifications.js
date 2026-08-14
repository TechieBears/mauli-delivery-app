import { useEffect } from 'react';
import useAppStore from '../store/useAppStore';
import { initPushNotifications } from '../services/pushNotifications';

/**
 * Sets up FCM once the user is authenticated, and tears the listeners down on
 * logout.
 *
 * Gated on auth because registering the token requires a Bearer token — firing
 * on a cold launch at the login screen would just 401. Re-running on login also
 * means the new user's device is registered against *their* account, which
 * matters on a shared device.
 */
const usePushNotifications = () => {
  const isAuthenticated = useAppStore(s => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let teardown;
    let cancelled = false;

    initPushNotifications().then(fn => {
      // Logging out before init resolved: run the teardown immediately rather
      // than leaking listeners into the next session.
      if (cancelled) fn?.();
      else teardown = fn;
    });

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, [isAuthenticated]);
};

export default usePushNotifications;
