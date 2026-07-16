// Shared display helpers for customer order screens. The API returns lowercase
// status values (pending | confirmed | intransit | delivered | rejected |
// cancelled); this maps each to a label + badge colors.

export const STATUS_META = {
  pending: { label: 'Pending', bg: '#fef3c7', text: '#d97706', dot: '#f59e0b' },
  confirmed: { label: 'Confirmed', bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  intransit: { label: 'In Transit', bg: '#eef2ff', text: '#4f46e5', dot: '#6366f1' },
  delivered: { label: 'Delivered', bg: '#dcfce7', text: '#16a34a', dot: '#22c55e' },
  rejected: { label: 'Rejected', bg: '#fef2f2', text: '#dc2626', dot: '#ef4444' },
  cancelled: { label: 'Cancelled', bg: '#f3f4f6', text: '#6b7280', dot: '#9ca3af' },
};

// Short, human-friendly reference from the Mongo _id (last 6 chars, upper-cased).
export const shortOrderRef = id => (id ? `#${String(id).slice(-6).toUpperCase()}` : '');

// e.g. "13 Jul 2026" from an ISO date string.
export const formatOrderDate = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// A delivery slot may be populated ({ startTime, endTime }) or absent.
export const slotLabel = slot => {
  if (slot && slot.startTime && slot.endTime) return `${slot.startTime} - ${slot.endTime}`;
  return '—';
};
