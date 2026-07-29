import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationArrow, Warning } from 'phosphor-react-native';
import { colors } from '../../theme/colors';
import {
  ensureLocationPermission,
  hasBackgroundLocationPermission,
} from '../../services/locationPermissions';

/**
 * Full-screen gate shown when the rider has a delivery in transit but "all the
 * time" location is off/revoked. Nothing else in the app is reachable until
 * background location is granted again.
 *
 * "Enable location" re-requests the permission (on Android 10+ this opens the
 * OS "Allow all the time" screen); if the request can't surface the toggle we
 * fall back to Open Settings. `onResolved` is called once the permission is
 * confirmed granted, so the parent can drop the gate.
 */
const LocationBlockScreen = ({ onResolved }) => {
  const [busy, setBusy] = useState(false);

  const handleEnable = async () => {
    setBusy(true);
    // Re-request; on Android 10+ background is a separate grant that routes to
    // Settings. Afterwards, confirm silently and lift the gate if it stuck.
    await ensureLocationPermission();
    const granted = await hasBackgroundLocationPermission();
    setBusy(false);
    if (granted) {
      onResolved?.();
    } else {
      // The system may require the user to flip it manually — send them there.
      Linking.openSettings();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <NavigationArrow size={40} color={colors.primary} weight="fill" />
        </View>

        <Text style={styles.title}>Location required</Text>
        <Text style={styles.body}>
          You have a delivery in progress. Your location is used as your
          vehicle's location to track this order, so this app needs location
          access set to{' '}
          <Text style={styles.strong}>“Allow all the time.”</Text>
        </Text>

        <View style={styles.notice}>
          <Warning size={18} color="#a16207" weight="fill" />
          <Text style={styles.noticeText}>
            The app stays locked until you enable it. Your active delivery can't
            continue without it.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, busy && styles.btnDisabled]}
          onPress={handleEnable}
          disabled={busy}
          activeOpacity={0.85}>
          {busy ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.primaryBtnText}>Enable location</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => Linking.openSettings()}
          disabled={busy}
          activeOpacity={0.7}>
          <Text style={styles.secondaryBtnText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 23,
    textAlign: 'center',
    marginBottom: 24,
  },
  strong: { fontWeight: '800', color: colors.primary },
  notice: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.warningBg,
    borderRadius: 12,
    padding: 14,
  },
  noticeText: { flex: 1, fontSize: 13, color: '#a16207', lineHeight: 19 },
  footer: { paddingHorizontal: 24, paddingBottom: 12, gap: 4 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: { backgroundColor: colors.border },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: colors.surface },
  secondaryBtn: { paddingVertical: 14, alignItems: 'center' },
  secondaryBtnText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
});

export default LocationBlockScreen;
