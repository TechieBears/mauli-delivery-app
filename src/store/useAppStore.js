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
      role: null,            // 'vendor' | 'customer'
      isAuthenticated: false,
      vendorId: null,
      kycStatus: null,       // 'pending' | 'under_review' | 'approved' | 'rejected'
      isPricingComplete: false,
      profile: {},

      setRole: role => set({ role }),

      setProfile: data =>
        set(state => ({ profile: { ...state.profile, ...data } })),

      setKycStatus: status => set({ kycStatus: status }),

      // Update just the access token after a silent refresh (both store + MMKV).
      setAccessToken: accessToken => {
        storage.set(STORAGE_KEYS.AUTH_TOKEN, accessToken);
        set({ accessToken });
      },

      // Called after verify-otp success
      login: ({ accessToken, refreshToken, user, vendorId, kycStatus, isPricingComplete }) => {
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
          kycStatus,
          isPricingComplete,
        });
      },

      logout: () => {
        storage.remove(STORAGE_KEYS.AUTH_TOKEN);
        storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          role: null,
          isAuthenticated: false,
          vendorId: null,
          kycStatus: null,
          isPricingComplete: false,
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
