import api from './api';

// The notification endpoints are NOT role-prefixed — the API scopes every one
// of them to the caller's userId from the JWT, so the same four calls serve
// vendor, customer and transporter alike.
//
// Note the server TTL-deletes notifications 3 days after creation, so this is a
// short-lived inbox by design, not an archive.

// GET /notifications?page&limit&unreadOnly
// Resolves to { success, message, data: [...], pagination: {...} }.
// `pagination` is a SIBLING of `data`, not nested inside it — deliberately left
// unwrapped because the infinite query needs both halves.
export const fetchNotifications = ({
  page = 1,
  limit = 20,
  unreadOnly = false,
} = {}) =>
  api.get('/notifications', {
    // The server only checks for the literal string 'true'; sending false would
    // read as truthy and filter the list down to unread.
    params: { page, limit, ...(unreadOnly ? { unreadOnly: 'true' } : {}) },
  });

// GET /notifications/unread-count → { success, message, data: { count } }
// Unwrapped to a plain number so every badge consumer reads `data` directly.
export const fetchUnreadCount = () =>
  api.get('/notifications/unread-count').then(res => Number(res?.data?.count ?? 0));

// PATCH /notifications/mark-read — body { ids: [...] } | { all: true }
// The server filter includes isRead:false, so re-marking an already-read id is
// a harmless no-op. That idempotence is what makes the optimistic update in
// useMarkNotificationsRead safe.
export const markNotificationsRead = payload =>
  api.patch('/notifications/mark-read', payload);

// PUT /user/fcm-token — body { fcmToken }
// Stored on the User doc and read by the API when it dispatches the `push`
// channel. The API has no unregister endpoint; it clears a token itself when
// FCM reports it dead.
export const updateFcmToken = fcmToken =>
  api.put('/user/fcm-token', { fcmToken });

// DELETE /notifications — body { ids: [...] } | { all: true }
// Axios only sends a body on DELETE via the `data` config key; passing the
// payload as the second positional arg would be read as config and the server
// would 400 on the missing body.
export const clearNotifications = payload =>
  api.delete('/notifications', { data: payload });
