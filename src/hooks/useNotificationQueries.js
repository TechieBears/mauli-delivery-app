import { useEffect } from 'react';
import { AppState } from 'react-native';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import useAppStore from '../store/useAppStore';
import {
  clearNotifications,
  fetchNotifications,
  fetchUnreadCount,
  markNotificationsRead,
} from '../services/notificationService';

const PAGE_SIZE = 20;

// FCM is now the primary signal — a push invalidates these queries the moment
// one arrives (see services/pushNotifications.js). This poll is only the safety
// net for when push is unavailable: permission denied, a stale token, a Play
// Services gap, or delivery throttling.
//
// So it is deliberately slow. 5 minutes = 3 requests per 15-minute window,
// under 1% of the production cap of 500 req/15min — which matters because that
// limiter is per-IP, not per-user, and several vendors can share one office
// connection.
const BADGE_POLL_MS = 5 * 60 * 1000;

// The bell badge, and the only polling query in the app. Gated three ways:
//   1. `enabled` on isAuthenticated, so logout stops it on the same tick.
//   2. refetchIntervalInBackground stays false (the default), which the
//      focusManager binding in services/queryClient.js makes meaningful.
//   3. An explicit AppState listener invalidates on foreground, so coming back
//      to the app shows a current count immediately rather than up to 60s
//      stale.
export const useUnreadNotificationCount = () => {
  const isAuthenticated = useAppStore(s => s.isAuthenticated);
  const queryClient = useQueryClient();

  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active') {
        queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] });
      }
    });
    return () => sub.remove();
  }, [queryClient]);

  return useQuery({
    queryKey: ['notificationsUnreadCount'],
    queryFn: fetchUnreadCount,
    enabled: isAuthenticated,
    refetchInterval: isAuthenticated ? BADGE_POLL_MS : false,
    staleTime: 30 * 1000,
    // A transient badge failure should be invisible — the bell keeps its last
    // known count. Retrying would also mean a dead token produces three 401s a
    // minute instead of one.
    retry: false,
  });
};

// The notification list. Not polled: it is only mounted while the user is
// looking at it, and pull-to-refresh covers the rest.
export const useNotifications = (unreadOnly = false) => {
  const isAuthenticated = useAppStore(s => s.isAuthenticated);

  return useInfiniteQuery({
    queryKey: ['notifications', unreadOnly ? 'unread' : 'all'],
    queryFn: ({ pageParam = 1 }) =>
      fetchNotifications({ page: pageParam, limit: PAGE_SIZE, unreadOnly }),
    initialPageParam: 1,
    // `pagination` is a SIBLING of `data` in this API's envelope, not nested
    // inside it.
    getNextPageParam: lastPage => {
      const p = lastPage?.pagination;
      if (!p) return undefined;
      return p.page < p.totalPages ? p.page + 1 : undefined;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
};

// Optimistic on purpose, and the only optimistic update in this codebase.
// Three things are true here that are not true of orders or pricing: the server
// op is idempotent (its filter is { userId, isRead: false }), the resulting
// state is fully known client-side, and the read/unread pip IS the screen's
// primary content — so a round-trip of latency is directly visible. onSettled
// still invalidates, so the server stays the source of truth.
export const useMarkNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationsRead, // { ids } | { all: true }
    onMutate: async payload => {
      // Cancelling the count query is not optional: a poll already in flight
      // would land after the optimistic write and flicker the badge back to
      // its old value.
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      await queryClient.cancelQueries({ queryKey: ['notificationsUnreadCount'] });

      const prevLists = queryClient.getQueriesData({ queryKey: ['notifications'] });
      const prevCount = queryClient.getQueryData(['notificationsUnreadCount']);

      const idSet = payload?.all ? null : new Set(payload?.ids ?? []);
      let flipped = 0;

      queryClient.setQueriesData({ queryKey: ['notifications'] }, old => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            data: (page.data ?? []).map(n => {
              if (n.isRead) return n;
              if (idSet && !idSet.has(n._id)) return n;
              flipped += 1;
              return { ...n, isRead: true, readAt: new Date().toISOString() };
            }),
          })),
        };
      });

      // `all` zeroes the badge outright. A partial mark only knows about the
      // pages actually loaded, so subtract what was flipped and let onSettled's
      // invalidate correct any unread items sitting on unfetched pages.
      queryClient.setQueryData(['notificationsUnreadCount'], old =>
        payload?.all ? 0 : Math.max(0, (old ?? 0) - flipped),
      );

      return { prevLists, prevCount };
    },
    onError: (_err, _payload, ctx) => {
      ctx?.prevLists?.forEach(([key, value]) => queryClient.setQueryData(key, value));
      if (ctx?.prevCount !== undefined) {
        queryClient.setQueryData(['notificationsUnreadCount'], ctx.prevCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] });
    },
  });
};

export const useClearNotifications = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearNotifications, // { ids } | { all: true }
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] });
    },
  });
};
