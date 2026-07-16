import { create } from 'zustand';
import { VENDOR_ORDERS } from '../constants/vendorOrders';

const useOrderStore = create(set => ({
  orders: [...VENDOR_ORDERS],
  updateOrderStatus: (id, status) =>
    set(state => ({
      orders: state.orders.map(o => (o.id === id ? { ...o, status } : o)),
    })),
}));

export default useOrderStore;
