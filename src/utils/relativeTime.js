// Relative timestamp for the notification list. The server TTL-deletes after
// 3 days, so "2d ago" is effectively the ceiling — but the absolute-date
// fallback is kept for the gap between expiresAt passing and Mongo's TTL
// monitor actually sweeping (it runs on a ~60s cycle, not instantly).
export const relativeTime = iso => {
  if (!iso) return '';

  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';

  const secs = Math.floor((Date.now() - then.getTime()) / 1000);
  // Clock skew between device and server can make a fresh notification look
  // slightly in the future; show it as new rather than as a negative age.
  if (secs < 60) return 'Just now';

  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return then.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

export default relativeTime;
