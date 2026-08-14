import { AppState, Platform } from 'react-native';
import { QueryClient, focusManager } from '@tanstack/react-query';

// Module-level singleton, deliberately NOT created inside App.jsx: callers
// outside the component tree need to invalidate the cache. Today that is the
// push message handler, which can run with no React tree mounted at all.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Never retry 429 (rate limited) or 4xx client errors — retrying a 429
      // just spends more of the budget and deepens the limit. The API allows
      // 500 requests / 15 min in production, so a failed call must not become
      // three.
      retry: (failureCount, error) => {
        const status = error?.status;
        if (status === 429 || (status >= 400 && status < 500)) return false;
        return failureCount < 2;
      },
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000),
      staleTime: 5 * 60 * 1000,
    },
  },
});

// TanStack Query's focus tracking is DOM-based by default; in React Native the
// AppState binding has to be wired by hand. Without it `refetchInterval` has no
// notion of "backgrounded" and keeps firing all night, quietly burning the
// rate-limit budget. The unread-count badge is the only interval in the app and
// it must stop when the app is not in the foreground.
AppState.addEventListener('change', status => {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
});

export default queryClient;
