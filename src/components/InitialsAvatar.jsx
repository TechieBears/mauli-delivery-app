import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

// First-name + last-name initials ("Sai Krupa Traders" → "ST", "Sai" → "S"),
// the same default the admin panel shows in place of a profile photo.
export const getInitials = name => {
  const words = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return `${first}${last}`.toUpperCase();
};

// Round initials badge used as the default profile image. `style` is merged
// over the circle, so callers keep their own border/margins.
const InitialsAvatar = ({ name, size = 40, style }) => (
  <View
    style={[
      styles.circle,
      { width: size, height: size, borderRadius: size / 2 },
      style,
    ]}>
    <Text style={[styles.text, { fontSize: Math.round(size * 0.38) }]}>
      {getInitials(name)}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  circle: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: '#fff', fontWeight: '700' },
});

export default InitialsAvatar;
