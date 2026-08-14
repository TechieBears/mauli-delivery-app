import {
  ArrowRight,
  ArrowsClockwise,
  Bell,
  CheckCircle,
  CurrencyInr,
  Megaphone,
  Package,
  Receipt,
  SealCheck,
  Truck,
  Warning,
  Wrench,
  XCircle,
} from 'phosphor-react-native';
import { colors } from '../theme/colors';

// Per-type presentation for a notification row. `tint` is the glyph colour,
// `bg` the circle behind it — chosen to read like the order status badges
// elsewhere in the app (green = good, red = bad, amber = needs attention).
export const NOTIFICATION_META = {
  ORDER_PLACED: { Icon: Package, tint: '#1d4ed8', bg: '#eff6ff' },
  ORDER_ACCEPTED: { Icon: CheckCircle, tint: '#16a34a', bg: '#dcfce7' },
  ORDER_REJECTED: { Icon: XCircle, tint: '#dc2626', bg: '#fef2f2' },
  ORDER_REASSIGNED: { Icon: ArrowsClockwise, tint: '#d97706', bg: '#fef3c7' },
  ORDER_STATUS_CHANGED: { Icon: ArrowRight, tint: '#4f46e5', bg: '#eef2ff' },
  TRANSPORTER_ASSIGNED: { Icon: Truck, tint: '#4f46e5', bg: '#eef2ff' },
  ORDER_DELIVERED: { Icon: SealCheck, tint: '#16a34a', bg: '#dcfce7' },
  COMPLAINT_RAISED: { Icon: Warning, tint: '#dc2626', bg: '#fef2f2' },
  COMPLAINT_RESOLVED: { Icon: Wrench, tint: '#16a34a', bg: '#dcfce7' },
  COMPLAINT_REJECTED: { Icon: XCircle, tint: '#6b7280', bg: '#f3f4f6' },
  VENDOR_PAYOUT_PAID: { Icon: CurrencyInr, tint: '#16a34a', bg: '#dcfce7' },
  INVOICE_REMINDER: { Icon: Receipt, tint: '#d97706', bg: '#fef3c7' },
  ADMIN_CUSTOM: { Icon: Megaphone, tint: colors.primary, bg: colors.primaryLight },
};

// Notification.type has no enum on the server — the backend can ship a new type
// at any time and this app still has to render it. Always go through here;
// never index NOTIFICATION_META directly.
export const metaForType = type =>
  NOTIFICATION_META[type] ?? {
    Icon: Bell,
    tint: colors.textSecondary,
    bg: colors.background,
  };
