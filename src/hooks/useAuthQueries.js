import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendOtp, verifyOtp, deleteAccount } from '../services/authService';

export const useSendOtp = () =>
  useMutation({ mutationFn: ({ phone, name, role, countryCode }) => sendOtp(phone, name, role, countryCode) });

export const useVerifyOtp = () =>
  useMutation({ mutationFn: ({ phone, otp }) => verifyOtp(phone, otp) });

// Deletes the signed-in account. The cache is cleared on success so no screen
// can render the deleted account's orders/profile on the way back to Login.
export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => queryClient.clear(),
  });
};
