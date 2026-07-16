export const ORDER_HISTORY = [
  {
    id: 'MM-ORD-8821',
    date: 'Oct 24, 2023',
    time: '09:15 AM',
    amount: 42500,
    skuCount: 3,
    company: 'Green Valley Organics',
    customer: {
      name: 'Arthur Sterling',
      business: 'Le Bernardin Bistro',
      address: '42 Market Square, Seattle, WA 98101',
      phone: '(206) 555-0128',
      avatar: 'https://api.dicebear.com/9.x/avataaars/png?seed=Arthur&backgroundColor=c0aede',
    },
    items: [
      {
        id: 'i1', name: 'Organic Baby Bok Choy', detail: '12kg • Bulk Grade A',
        price: 14400, organic: true,
        image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=120&q=80',
      },
      {
        id: 'i2', name: 'Cherry Tomatoes', detail: '5 Case • Heirloom',
        price: 6250, organic: false,
        image: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=120&q=80',
      },
      {
        id: 'i3', name: 'Heritage Carrots', detail: '20kg • Field Grown',
        price: 8000, organic: false,
        image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=120&q=80',
      },
    ],
    delivery: {
      type: 'Temp Controlled Fleet',
      deliveredAt: 'Today, 07:45 AM',
    },
    summary: {
      subtotal: 28650,
      deliveryFee: 0,
      taxRate: 13.2,
      tax: 3792,
      total: 32442,
      paymentLast4: '21',
    },
  },
  {
    id: 'MM-ORD-8794',
    date: 'Oct 21, 2023',
    time: '02:30 PM',
    amount: 18200,
    skuCount: 4,
    company: 'Sunrise Farms Co.',
    customer: {
      name: 'Priya Mehta',
      business: 'Sunrise Farms Co.',
      address: '12 Agro Park, Pune, MH 411028',
      phone: '+91 98100 22345',
      avatar: 'https://api.dicebear.com/9.x/avataaars/png?seed=Priya&backgroundColor=b6e3f4',
    },
    items: [
      {
        id: 'i1', name: 'Alphonso Mangoes', detail: '10kg • Export Grade',
        price: 8500, organic: true,
        image: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=120&q=80',
      },
      {
        id: 'i2', name: 'Fresh Spinach', detail: '5kg • Baby Leaf',
        price: 2200, organic: false,
        image: 'https://images.unsplash.com/photo-1574316071802-0d684efa7bf5?w=120&q=80',
      },
      {
        id: 'i3', name: 'Sweet Corn', detail: '8 Dozen • Yellow',
        price: 4800, organic: false,
        image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=120&q=80',
      },
      {
        id: 'i4', name: 'Red Onion', detail: '20kg • Premium',
        price: 2700, organic: false,
        image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=120&q=80',
      },
    ],
    delivery: {
      type: 'Standard Fleet',
      deliveredAt: 'Oct 21, 02:30 PM',
    },
    summary: {
      subtotal: 18200,
      deliveryFee: 350,
      taxRate: 5,
      tax: 910,
      total: 19460,
      paymentLast4: '88',
    },
  },
  {
    id: 'MM-ORD-8650',
    date: 'Oct 15, 2023',
    time: '11:00 AM',
    amount: 64750,
    skuCount: 5,
    company: 'Nature Fresh Ltd.',
    customer: {
      name: 'Kiran Desai',
      business: 'Nature Fresh Ltd.',
      address: 'Plot 7, APMC Yard, Nashik, MH 422001',
      phone: '+91 99870 55123',
      avatar: 'https://api.dicebear.com/9.x/avataaars/png?seed=Kiran&backgroundColor=d1d4f9',
    },
    items: [
      {
        id: 'i1', name: 'Green Capsicum', detail: '15kg • Grade A',
        price: 12000, organic: false,
        image: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=120&q=80',
      },
      {
        id: 'i2', name: 'Organic Turmeric', detail: '8kg • Raw Root',
        price: 22000, organic: true,
        image: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=120&q=80',
      },
    ],
    delivery: {
      type: 'Temp Controlled Fleet',
      deliveredAt: 'Oct 15, 11:00 AM',
    },
    summary: {
      subtotal: 34000,
      deliveryFee: 0,
      taxRate: 13.2,
      tax: 4488,
      total: 38488,
      paymentLast4: '45',
    },
  },
];
