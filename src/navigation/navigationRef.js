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
