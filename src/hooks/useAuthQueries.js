import { useMutation } from '@tanstack/react-query';
import { sendOtp, verifyOtp } from '../services/authService';

export const useSendOtp = () =>
  useMutation({ mutationFn: ({ phone, name, role, countryCode }) => sendOtp(phone, name, role, countryCode) });

export const useVerifyOtp = () =>
  useMutation({ mutationFn: ({ phone, otp }) => verifyOtp(phone, otp) });
