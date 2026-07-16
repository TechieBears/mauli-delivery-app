/** Dummy vendor inventory for price management */
export const PRICE_INVENTORY = [
  {
    id: 'tomato',
    name: 'Tomato',
    description: 'Fresh Vine-Ripened',
    image:
      'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&q=80',
    variants: [
      { id: 'kg', label: 'Per Kg', price: '2.50' },
      { id: 'dozen', label: 'Per Dozen', price: '28.00' },
      { id: 'crate', label: 'Per Crate', price: '45.00' },
    ],
  },
  {
    id: 'red-onion',
    name: 'Red Onion',
    description: 'Dry-Cured Premium',
    image:
      'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=200&q=80',
    variants: [
      { id: 'kg', label: 'Per Kg', price: '1.80' },
      { id: 'crate', label: 'Per Crate', price: '32.00' },
    ],
  },
  {
    id: 'potato',
    name: 'Potato',
    description: 'Russet Gold',
    image:
      'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=200&q=80',
    variants: [
      { id: 'kg', label: 'Per Kg', price: '0.95' },
      { id: 'crate', label: 'Per Crate', price: '18.50' },
    ],
  },
  {
    id: 'carrot',
    name: 'Carrot',
    description: 'Organic Baby',
    image:
      'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=200&q=80',
    variants: [
      { id: 'kg', label: 'Per Kg', price: '1.20' },
      { id: 'dozen', label: 'Per Dozen', price: '12.00' },
    ],
  },
  {
    id: 'cabbage',
    name: 'Cabbage',
    description: 'Green Globe',
    image:
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&q=80',
    variants: [
      { id: 'kg', label: 'Per Kg', price: '0.85' },
      { id: 'piece', label: 'Per Piece', price: '2.40' },
    ],
  },
  {
    id: 'spinach',
    name: 'Spinach',
    description: 'Tender Leaf',
    image:
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&q=80',
    variants: [
      { id: 'kg', label: 'Per Kg', price: '3.10' },
      { id: 'bunch', label: 'Per Bunch', price: '1.50' },
    ],
  },
  {
    id: 'cucumber',
    name: 'Cucumber',
    description: 'Hydroponic',
    image:
      'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=200&q=80',
    variants: [
      { id: 'kg', label: 'Per Kg', price: '1.40' },
      { id: 'dozen', label: 'Per Dozen', price: '8.00' },
    ],
  },
  {
    id: 'bell-pepper',
    name: 'Bell Pepper',
    description: 'Mixed Color',
    image:
      'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&q=80',
    variants: [
      { id: 'kg', label: 'Per Kg', price: '2.80' },
      { id: 'crate', label: 'Per Crate', price: '38.00' },
    ],
  },
];

export const buildInitialPrices = items => {
  const prices = {};
  items.forEach(item => {
    item.variants.forEach(v => {
      prices[`${item.id}_${v.id}`] = '';
    });
  });
  return prices;
};
