export const MOCK_CART_ITEMS = [
  {
    id: 'ci1',
    name: 'Premium Baby Spinach',
    image: 'https://images.unsplash.com/photo-1574316071802-0d684efa7bf5?w=120&q=80',
    bg: '#14532d',
    qty: 12,
    packaging: '10kg Crates',
    total: 450,
  },
  {
    id: 'ci2',
    name: 'Heirloom Organic Carrots',
    image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=120&q=80',
    bg: '#431407',
    qty: 5,
    packaging: '25kg Bulk Sack',
    total: 820,
  },
  {
    id: 'ci3',
    name: 'Vine-Ripened Roma Tomatoes',
    image: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=120&q=80',
    bg: '#7f1d1d',
    qty: 8,
    packaging: '15kg Wooden Crate',
    total: 340,
  },
];

export const PRICING = {
  subtotal: 11600,
  logisticsFee: 0,
  tax: 580,
  platformService: 60,
  grandTotal: 12240,
};

export const VENDORS = [
  {
    id: 'v1',
    name: 'Green Valley Organics',
    rating: 4.9,
    distance: '1.2km away',
    total: 4250,
    savings: 180,
    deliveryTime: '45-60 min',
    featured: true,
  },
  {
    id: 'v2',
    name: 'Earthly Harvest Co.',
    rating: 4.2,
    distance: '3.8km away',
    total: 4430,
    difference: 180,
    featured: false,
  },
  {
    id: 'v3',
    name: 'Local Mandi',
    rating: 4.5,
    distance: '0.8km away',
    total: 4510,
    difference: 260,
    featured: false,
  },
  {
    id: 'v4',
    name: 'City Fresh Hub',
    rating: 4.0,
    distance: '5.2km away',
    total: 4680,
    difference: 430,
    featured: false,
  },
];

export const MANIFEST_ITEMS = [
  { id: 'm1', name: 'Baby Spinach', variant: '500g Pack × 2', price: 140, emoji: '🥬' },
  { id: 'm2', name: 'Hass Avocado', variant: 'Loose × 4', price: 480, emoji: '🥑' },
];

export const DELIVERY_SLOTS = [
  { id: 's1',  slot: '08:00 - 09:00' },
  { id: 's2',  slot: '09:00 - 10:00' },
  { id: 's3',  slot: '10:00 - 11:00' },
  { id: 's4',  slot: '11:00 - 12:00' },
  { id: 's5',  slot: '12:00 - 13:00' },
  { id: 's6',  slot: '13:00 - 14:00' },
  { id: 's7',  slot: '14:00 - 15:00' },
  { id: 's8',  slot: '15:00 - 16:00' },
  { id: 's9',  slot: '16:00 - 17:00' },
  { id: 's10', slot: '17:00 - 18:00' },
];
