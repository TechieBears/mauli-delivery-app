import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Bell } from 'phosphor-react-native';
import { colors } from '../theme/colors';
import { useUnreadNotificationCount } from '../hooks/useNotificationQueries';

// The header bell with its unread badge. Self-contained — it owns both the
// count query and the navigation — so every call site is a bare
// <NotificationBell />. React Query dedupes the shared
// ['notificationsUnreadCount'] key, so mounting it on several screens still
// costs one request, not one per screen.
const NotificationBell = ({ color = colors.text, size = 22 }) => {
  const navigation = useNavigation();
  const { data: count = 0 } = useUnreadNotificationCount();

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Notifications')}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={
        count > 0 ? `Notifications, ${count} unread` : 'Notifications'
      }
      // Grows the tap target without growing the layout box — padding would
      // push the badge past AppHeader's narrow fixed-width slot.
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={styles.wrap}>
      <Bell size={size} color={color} weight="regular" />
      {count > 0 ? (
        <View style={styles.badge}>
          {/* Capped at 9+ so the badge keeps a fixed width and cannot grow
              wide enough to clip against the edge of the header slot. */}
          <Text style={styles.badgeText} numberOfLines={1}>
            {count > 9 ? '9+' : String(count)}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    // Load-bearing on Android: the badge is positioned outside this box and
    // would otherwise be clipped.
    overflow: 'visible',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    // Separates the badge from the bell glyph beneath it.
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
});

export default NotificationBell;
