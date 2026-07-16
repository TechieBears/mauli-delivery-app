import React from 'react';
import {
  HambergerMenu,
  Home2,
  ShoppingBag,
  DollarSquare,
  Profile,
  ShoppingCart,
  Truck,
  Moneys,
  SearchNormal1,
  Refresh,
  DocumentDownload,
  Box,
  ArrowRight2,
} from 'iconsax-react-native';

export const MenuIcon = ({ color = '#2e7d32', size = 22 }) => (
  <HambergerMenu size={size} color={color} variant="Linear" />
);

export const HomeTabIcon = ({ color = '#6b7280', size = 22 }) => (
  <Home2 size={size} color={color} variant="Linear" />
);

export const OrdersTabIcon = ({ color = '#6b7280', size = 22 }) => (
  <ShoppingBag size={size} color={color} variant="Linear" />
);

export const PricesTabIcon = ({ color = '#6b7280', size = 22 }) => (
  <DollarSquare size={size} color={color} variant="Linear" />
);

export const ProfileTabIcon = ({ color = '#6b7280', size = 22 }) => (
  <Profile size={size} color={color} variant="Linear" />
);

export const CartIcon = ({ color = '#111', size = 22 }) => (
  <ShoppingCart size={size} color={color} variant="Linear" />
);

export const TruckIcon = ({ color = '#fff', size = 22 }) => (
  <Truck size={size} color={color} variant="Linear" />
);

export const BanknoteIcon = ({ color = '#fff', size = 20 }) => (
  <Moneys size={size} color={color} variant="Linear" />
);

export const SearchIcon = ({ color = '#9ca3af', size = 18 }) => (
  <SearchNormal1 size={size} color={color} variant="Linear" />
);

export const RefreshIcon = ({ color = '#2e7d32', size = 22 }) => (
  <Refresh size={size} color={color} variant="Linear" />
);

export const SaveIcon = ({ color = '#fff', size = 18 }) => (
  <DocumentDownload size={size} color={color} variant="Linear" />
);

export const InventoryBoxIcon = ({ color = '#2e7d32', size = 18 }) => (
  <Box size={size} color={color} variant="Linear" />
);

export const ArrowRightIcon = ({ color = '#4ade80', size = 16 }) => (
  <ArrowRight2 size={size} color={color} variant="Linear" />
);
