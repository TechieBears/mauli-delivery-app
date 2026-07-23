import { colors } from '../../theme/colors';

// Backend order enum (order.model): pending | confirmed | transporter_assigned |
// intransit | delivered | rejected | cancelled.
//
// A transporter only ever sees three of these:
//   transporter_assigned — assigned to them, not yet picked up ("Assigned")
//   intransit            — pickup confirmed via QR, carrying it ("Accepted")
//   delivered            — handed over, OTP verified
export const STATUS_ASSIGNED = 'transporter_assigned';
export const STATUS_ACCEPTED = 'intransit';

export const STATUS_CONFIG = {
  [STATUS_ASSIGNED]: { label: 'ASSIGNED', bg: '#fef9c3', text: '#a16207' },
  [STATUS_ACCEPTED]: { label: 'IN TRANSIT', bg: '#dbeafe', text: '#1d4ed8' },
  delivered: { label: 'DELIVERED', bg: '#dcfce7', text: '#15803d' },
};

export const statusConfig = status =>
  STATUS_CONFIG[status] ?? {
    label: String(status ?? '').replace(/_/g, ' ').toUpperCase(),
    bg: colors.background,
    text: colors.textSecondary,
  };

export const formatAddress = address => {
  if (!address) return '';
  if (typeof address === 'string') return address;
  return [address.line, address.city, address.state, address.pincode]
    .filter(Boolean)
    .join(', ');
};

// `orderNumber` is not set on these orders today, so the label falls back to the
// tail of the Mongo _id — uppercased, since hex ids read better in caps.
export const orderLabel = order =>
  `#${String(order?.orderNumber ?? String(order?._id ?? '').slice(-6)).toUpperCase()}`;

// The Customer doc holds no name/phone of its own — both live on the populated
// `customerId.userId` (User). `businessName`/`name` directly on the customer are
// kept as fallbacks in case a caller populates it differently.
export const customerName = customer =>
  customer?.userId?.name ??
  customer?.businessName ??
  customer?.name ??
  '';

export const customerPhone = customer => {
  const user = customer?.userId;
  const phone = user?.phone ?? customer?.phone;
  if (!phone) return '';
  const code = user?.countryCode ?? customer?.countryCode;
  return code ? `${code} ${phone}` : String(phone);
};

// Strip spaces so `tel:` gets a dialable string ("+91 8798789877" → "+918798789877").
export const telHref = phone => `tel:${String(phone).replace(/\s+/g, '')}`;
