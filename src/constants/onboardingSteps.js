// Customer onboarding mirrors the vendor KYC flow (Identity → Bank → KYC → Review).
export const CUSTOMER_STEPS = [
  { key: 'identity', label: 'Identity', shortLabel: 'IDENTITY' },
  { key: 'bank', label: 'Bank Details', shortLabel: 'BANK' },
  { key: 'kyc', label: 'KYC Documents', shortLabel: 'BUSINESS' },
  { key: 'review', label: 'Review', shortLabel: 'REVIEW' },
];

export const VENDOR_STEPS = [
  { key: 'identity', label: 'Identity', shortLabel: 'IDENTITY' },
  { key: 'bank', label: 'Bank Details', shortLabel: 'BANK' },
  { key: 'kyc', label: 'KYC Documents', shortLabel: 'BUSINESS' },
  { key: 'review', label: 'Review', shortLabel: 'REVIEW' },
];

// Transporters have no bank or business details to collect — just who they are
// and the licence/vehicle they drive, then a review before submitting.
export const TRANSPORTER_STEPS = [
  { key: 'identity', label: 'Identity', shortLabel: 'IDENTITY' },
  { key: 'review', label: 'Review', shortLabel: 'REVIEW' },
];

export const ACCOUNT_TYPES = ['Savings', 'Current'];

export const CUSTOMER_CATEGORIES = [
  'Fresh Vegetables',
  'Fruits',
  'Dairy & Eggs',
  'Grains & Pulses',
  'Organic Products',
];
