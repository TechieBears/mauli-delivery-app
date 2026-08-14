import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

// If a 401 arrives before the NavigationContainer has finished mounting
// (e.g. Splash's very first render triggers a profile fetch), isReady() is
// still false and the reset would silently no-op, leaving the session
// cleared but the user stuck on the current screen. Poll briefly instead of
// giving up immediately.
export const resetToLogin = () => {
  const tryReset = () => {
    if (!navigationRef.isReady()) {
      setTimeout(tryReset, 100);
      return;
    }
    navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
  };
  tryReset();
};

// Same mount-race guard as resetToLogin, for navigating from outside React —
// the notification list's deep links, and an FCM tap that cold starts the app
// before the container exists.
//
// Unlike the logout reset this one gives up after ~5s. A session reset must
// land eventually no matter how late; a deep link that fires half a minute
// after the tap, once the user has started doing something else, is worse than
// no deep link at all.
const MAX_NAV_ATTEMPTS = 50; // 50 × 100ms

export const navigate = (name, params) => {
  let attempts = 0;
  const tryNavigate = () => {
    if (!navigationRef.isReady()) {
      if (++attempts > MAX_NAV_ATTEMPTS) return;
      setTimeout(tryNavigate, 100);
      return;
    }
    navigationRef.navigate(name, params);
  };
  tryNavigate();
};
