import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * The dev-mode OTP pill. In development the backend echoes the OTP back in the
 * send-otp response (in production `data` is empty and nothing renders here).
 * Tapping it fills the OTP boxes so the code doesn't have to be retyped by hand.
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
  if (!otp) return null;

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
