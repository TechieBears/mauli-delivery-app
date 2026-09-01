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
  hasBackgroundLocationPermission,
  ALWAYS_ALLOW_LABEL,
} from '../../services/locationPermissions';
import LocationPermissionModal from '../../components/LocationPermissionModal';

/**
 * Full-screen gate shown when the rider has a delivery in transit but "all the
 * time" location is off/revoked. Nothing else in the app is reachable until
 * background location is granted again.
 *
 * This screen is a GATE, not a disclosure — it explains that the app is locked,
 * which is not the same as telling the rider what data is collected. Google Play
 * rejected the 1 Sep 2026 build for exactly that: "Enable location" here used to
 * call `ensureLocationPermission()` directly, so the runtime prompt was not
 * immediately preceded by a disclosure (this screen is the one in the rejection
 * screenshot). It now shows <LocationPermissionModal> first and lets that modal
 * fire the OS prompt. Never call the permission API straight from this screen.
 *
 * `onResolved` is called once the permission is confirmed granted, so the parent
 * can drop the gate; if the grant didn't stick we fall back to Open Settings.
 */
const LocationBlockScreen = ({ onResolved }) => {
  const [busy, setBusy] = useState(false);
  const [disclosureVisible, setDisclosureVisible] = useState(false);

  // Step 1 — always show the disclosure. The rider reads why location is needed
  // before anything else happens, on every platform and in every permission
  // state. The modal itself decides what its button does: fire the OS prompt, or
  // (iOS after a "Don't Allow", where no prompt can ever appear again) open
  // Settings. Don't shortcut to Settings from here — that would skip the reason.
  const handleEnable = () => setDisclosureVisible(true);

  // Step 2 — the modal has fired the OS prompt and the rider has answered.
  // Confirm silently and lift the gate if location actually stuck.
  const handleDisclosureResult = async () => {
    setDisclosureVisible(false);
    setBusy(true);
    const granted = await hasBackgroundLocationPermission();
    setBusy(false);
    if (granted) {
      onResolved?.();
      return;
    }
    // Still denied. Don't call openSettings() here: after a hard denial the
    // permission layer already surfaces its own "open Settings" alert, and
    // jumping to Settings on top of it yanks the rider out of the app mid-alert.
    // The screen's own "Open Settings" button remains the manual route.
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
          {/* Platform-specific: "Always" on iOS, "Allow all the time" on
              Android — naming the wrong one sends riders hunting for a toggle
              that doesn't exist on their phone. */}
          <Text style={styles.strong}>“{ALWAYS_ALLOW_LABEL}.”</Text>
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
          // Opens this app's own settings pane (iOS
          // UIApplicationOpenSettingsURLString / Android app details). Rejects
          // if it can't be opened, so don't leave that promise unhandled.
          onPress={() => Linking.openSettings().catch(() => {})}
          disabled={busy}
          activeOpacity={0.7}>
          <Text style={styles.secondaryBtnText}>Open Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Owns the runtime prompt — see the note at the top of this file. */}
      <LocationPermissionModal
        visible={disclosureVisible}
        onResult={handleDisclosureResult}
      />
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
