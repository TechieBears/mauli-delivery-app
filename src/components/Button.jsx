import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
  StyleSheet,
} from 'react-native';
import { colors } from '../theme/colors';

const VARIANTS = {
  primary: {
    container: { backgroundColor: colors.primary },
    containerDisabled: { backgroundColor: '#86efac' },
    text: { color: '#fff' },
  },
  secondary: {
    container: { backgroundColor: '#22c55e' },
    containerDisabled: { backgroundColor: '#dcfce7' },
    text: { color: '#fff' },
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    containerDisabled: { borderColor: '#bbf7d0' },
    text: { color: colors.primary },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    containerDisabled: { opacity: 0.4 },
    text: { color: colors.primary },
  },
  danger: {
    container: { backgroundColor: colors.error },
    containerDisabled: { backgroundColor: '#fecaca' },
    text: { color: '#fff' },
  },
};

const SIZES = {
  sm: {
    container: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    text: { fontSize: 14, fontWeight: '500' },
  },
  md: {
    container: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
    text: { fontSize: 16, fontWeight: '600' },
  },
  lg: {
    container: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
    text: { fontSize: 18, fontWeight: '600' },
  },
};

const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
}) => {
  const v = VARIANTS[variant] ?? VARIANTS.primary;
  const s = SIZES[size] ?? SIZES.md;
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        s.container,
        isDisabled ? v.containerDisabled : v.container,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? colors.primary : '#fff'}
        />
      ) : (
        <>
          {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}
          <Text style={[s.text, v.text]}>{title}</Text>
          {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

export default Button;
