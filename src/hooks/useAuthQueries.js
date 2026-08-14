import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendOtp, verifyOtp, deleteAccount } from '../services/authService';
import { getDeviceFcmToken } from '../services/pushNotifications';

export const useSendOtp = () =>
  useMutation({ mutationFn: ({ phone, name, role, countryCode }) => sendOtp(phone, name, role, countryCode) });

// Attaches the device's FCM token to the verify call so push registration
// happens in the same request that establishes the session. Resolved here
// rather than at the call site so no screen has to remember to do it.
//
// getDeviceFcmToken never throws and returns null when push is unavailable —
// login must not fail because a device cannot receive notifications.
//
// Capped at 3s: on a fresh iOS install this call is waiting on the permission
// prompt and Apple's APNs round trip, which can take longer than anyone wants
// to sit on a spinner after entering an OTP. If it misses, the token is not
// lost — usePushNotifications re-syncs it straight after login.
const TOKEN_WAIT_MS = 3000;

const fcmTokenOrNull = async () => {
  try {
    return await Promise.race([
      getDeviceFcmToken(),
      new Promise(resolve => setTimeout(() => resolve(null), TOKEN_WAIT_MS)),
    ]);
  } catch (_) {
    return null;
  }
};

export const useVerifyOtp = () =>
  useMutation({
    mutationFn: async ({ phone, otp }) => {
      const fcmToken = await fcmTokenOrNull();
      return verifyOtp(phone, otp, fcmToken);
    },
  });

// Deletes the signed-in account. The cache is cleared on success so no screen
// can render the deleted account's orders/profile on the way back to Login.
export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => queryClient.clear(),
  });
};
