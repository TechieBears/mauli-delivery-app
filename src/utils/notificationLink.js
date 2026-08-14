// Resolves the API's { redirect, redirectId } pair to a route in this app.
// Returns null for an unrecognised redirect so the caller falls through to the
// type switch rather than navigating somewhere arbitrary.
//
// This is the transporter app: it has exactly one deep-linkable destination,
// the order detail screen. The API's `complaint` and `invoice` redirects belong
// to the vendor/customer app and have no screen here, so they resolve to null —
// the notification is still marked read and listed, it just does not navigate.
const targetForRedirect = (redirect, redirectId) => {
  if (!redirect || !redirectId) return null;

  if (redirect === 'order') {
    // NOTE: this screen reads `route.params.id`, not `orderId` as the
    // vendor/customer app's equivalent does.
    return { name: 'TransporterOrderDetail', params: { id: String(redirectId) } };
  }

  return null;
};

// Maps a notification to a navigation target.
//
// Deliberately pure — no React, no navigation import, no store import. That is
// what lets the FCM background handler call it, where there is no component
// tree and, on a cold start, possibly no hydrated Zustand store yet.
//
// Returns null when a type has nowhere sensible to land. Callers must treat
// null as "mark it read, but don't navigate" — it is a normal outcome, not an
// error.
//
// Shape: { name, params } for a root stack route.
export const resolveNotificationTarget = notification => {
  const data = notification?.data ?? {};

  // The API sends an explicit target on every event it raises:
  //   redirect: 'order' | 'complaint' | 'invoice', redirectId: <record _id>
  // Prefer it over the type switch below — it is the server's own statement of
  // where this notification points, and it keeps working when a new type ships
  // that this app has never heard of. Push payloads carry the same two fields
  // (as strings), so both paths resolve identically.
  const redirectTarget = targetForRedirect(
    notification?.redirect,
    notification?.redirectId,
  );
  if (redirectTarget) return redirectTarget;

  switch (notification?.type) {
    case 'ORDER_PLACED':
    case 'ORDER_ACCEPTED':
    case 'ORDER_REJECTED':
    case 'ORDER_REASSIGNED':
    case 'ORDER_STATUS_CHANGED':
    case 'ORDER_DELIVERED':
    case 'TRANSPORTER_ASSIGNED': {
      if (!data.orderId) return null;
      return {
        name: 'TransporterOrderDetail',
        params: { id: String(data.orderId) },
      };
    }

    // COMPLAINT_*, VENDOR_PAYOUT_PAID, INVOICE_REMINDER and ADMIN_CUSTOM have
    // no transporter-facing screen, so they list but do not navigate.
    default:
      return null;
  }
};

export default resolveNotificationTarget;
