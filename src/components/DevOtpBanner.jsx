import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CONFIG } from '../constants';

/**
 * The dev-mode OTP pill. In non-production environments the backend echoes the
 * OTP back in the send-otp response and tapping the pill fills the OTP boxes,
 * so the code doesn't have to be retyped by hand.
 *
 * Visibility is gated on APP_ENV, NOT on the response payload — the production
 * backend has echoed live OTPs before, so a present `otp` field is not evidence
 * of a dev environment.
 *
 * NOTE: this gate is only as correct as `.env` is at build time. APP_ENV is
 * inlined by react-native-dotenv when the bundle is built, so archiving a build
 * while `.env` points at local/staging will ship this pill. Confirm APP_ENV is
 * `production` in `.env` before cutting a release build.
 *
 * Every OTP screen keeps its code as a fixed-length array of single characters,
 * so `onFill` receives that array — already padded/truncated to `length` — and
 * the caller just drops it into its own state.
 *
 * Props:
 *  otp     string|number  the echoed OTP; falsy renders nothing
 *  length  number         digit count of the caller's input (default 6)
 *  onFill  fn(string[])   receives the split digits when tapped
 *  style   style          optional override (spacing differs per screen)
 */
const DevOtpBanner = ({ otp, length = 6, onFill, style }) => {
  const isProduction =
    String(CONFIG.APP_ENV ?? '').trim().toLowerCase() === 'production';

  if (isProduction || !otp) return null;

  const code = String(otp);

  const handlePress = () => {
    if (!onFill) return;
    const digits = Array.from({ length }, (_, i) => code[i] ?? '');
    onFill(digits);
  };

  return (
    <TouchableOpacity
      style={[styles.pill, style]}
      onPress={handlePress}
      activeOpacity={onFill ? 0.7 : 1}
      disabled={!onFill}>
      <Text style={styles.text}>
        DEV — OTP: {code}
        {onFill ? '  •  Tap to autofill' : ''}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    color: '#d97706',
  },
});

export default DevOtpBanner;
