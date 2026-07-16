import { create } from 'zustand';

const initialData = { categories: [], countryCode: '+91' };

const useVendorOnboardingStore = create(set => ({
  data: initialData,
  setField: (key, value) =>
    set(state => ({ data: { ...state.data, [key]: value } })),
  setData: patch =>
    set(state => ({ data: { ...state.data, ...patch } })),
  reset: () => set({ data: initialData }),
}));

export default useVendorOnboardingStore;
