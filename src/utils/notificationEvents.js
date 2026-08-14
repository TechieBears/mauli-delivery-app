import queryClient from '../services/queryClient';
import { markNotificationsRead } from '../services/notificationService';
import { navigate } from '../navigation/navigationRef';
import { resolveNotificationTarget } from './notificationLink';

// THE seam for "a notification arrived". Called after a mark-read, and by the
// FCM foreground/tap handlers in services/pushNotifications.js. Anything that
// should refresh when a notification lands belongs here and nowhere else.
export const onNotificationArrived = () => {
  queryClient.invalidateQueries({ queryKey: ['notifications'] });
  queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] });
};

// Opening a notification: mark it read, then go wherever it points.
//
// Lives here rather than in the screen because the push-tap handler will need
// exactly the same sequence — keeping one implementation is what stops the
// in-app path and the push path from drifting apart.
// Single-role app, so unlike the vendor/customer app the resolver needs no
// `role` argument — every target here is a transporter screen.
export const openNotification = notification => {
  if (notification?._id && !notification?.isRead) {
    // Fire-and-forget. The badge is reconciled by onNotificationArrived, and a
    // failed mark-read must never block navigation — the user tapped to go
    // somewhere, not to update a flag.
    markNotificationsRead({ ids: [notification._id] })
      .then(onNotificationArrived)
      .catch(() => {});
  }

  const target = resolveNotificationTarget(notification);
  if (target) navigate(target.name, target.params);
};
