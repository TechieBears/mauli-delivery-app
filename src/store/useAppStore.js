import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage, storage } from '../storage';
import { STORAGE_KEYS } from '../constants';

const useAppStore = create(
  persist(
    set => ({
      accessToken: null,
      refreshToken: null,
      user: null,            // { id, name, phone, role }
      role: null,            // 'vendor' | 'customer' | 'transporter'
      isAuthenticated: false,
      vendorId: null,
      transporterId: null,
      kycStatus: null,       // 'drafted' | 'pending' | 'onReview' | 'approved' | 'rejected'
      isPricingComplete: false,
      // The backend has no field for T&C acceptance yet (the Transporter model
      // doesn't define one and PATCH /transporter/profile drops unknown keys),
      // so acceptance is held here. Move to the server response once it lands.
      termsAccepted: false,
      profile: {},

      setRole: role => set({ role }),

      setTermsAccepted: accepted => set({ termsAccepted: accepted }),

      setProfile: data =>
        set(state => ({ profile: { ...state.profile, ...data } })),

      setKycStatus: status => set({ kycStatus: status }),

      // Update just the access token after a silent refresh (both store + MMKV).
      setAccessToken: accessToken => {
        storage.set(STORAGE_KEYS.AUTH_TOKEN, accessToken);
        set({ accessToken });
      },

      // Called after verify-otp success
      login: ({ accessToken, refreshToken, user, vendorId, transporterId, kycStatus, isPricingComplete }) => {
        // Store tokens directly in MMKV so the axios interceptor can read them
        // synchronously (independent of Zustand persist rehydration timing).
        storage.set(STORAGE_KEYS.AUTH_TOKEN, accessToken);
        if (refreshToken) storage.set(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        set({
          accessToken,
          refreshToken,
          user,
          role: user?.role ?? null,
          isAuthenticated: true,
          vendorId: vendorId ?? null,
          transporterId: transporterId ?? null,
          kycStatus,
          isPricingComplete,
        });
      },

      logout: () => {
        // Stop the delivery location watcher on any logout path. Required lazily
        // to keep the store free of a dependency on the services layer.
        try {
          require('../services/LocationTrackingService').default.stop();
        } catch (_) {}
        storage.remove(STORAGE_KEYS.AUTH_TOKEN);
        storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          role: null,
          isAuthenticated: false,
          vendorId: null,
          transporterId: null,
          kycStatus: null,
          isPricingComplete: false,
          termsAccepted: false,
          profile: {},
        });
      },
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);

export default useAppStore;
