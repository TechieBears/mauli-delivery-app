import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { NavigationArrow, MapPin } from 'phosphor-react-native';
import { colors } from '../theme/colors';
import { ensureLocationPermission } from '../services/locationPermissions';

/**
 * Rationale shown before the OS location prompt, so the rider understands why
 * background location is being requested. Mirrors the inline camera-rationale
 * pattern in PickupScannerScreen.
 *
 * App Store guideline 5.1.1(iv) constrains this screen: a pre-permission message
 * may explain, but must not steer the choice. So —
 *   - the button is neutral ("Continue"), never "Allow location";
 *   - there is NO dismiss/"Not now" path. Once this is shown the rider always
 *     continues to the OS prompt, which is where the actual decision is made.
 * Both rules were cited in the 12 Aug 2026 rejection; don't reintroduce either.
 *
 * Calls `onResult({ granted, background })` once the OS prompt resolves. The
 * parent decides what to do with a partial/denied grant (tracking still runs
 * foreground-only, and the pickup itself is never blocked).
 */
const LocationPermissionModal = ({ visible, onResult }) => {
  const [requesting, setRequesting] = useState(false);

  const handleContinue = async () => {
    setRequesting(true);
    const result = await ensureLocationPermission();
    setRequesting(false);
    onResult?.(result);
  };

  return (
    // No onRequestClose handler that dismisses: an Android back press must not
    // become a way to skip the permission request.
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleContinue}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <NavigationArrow size={30} color={colors.primary} weight="fill" />
          </View>

          <Text style={styles.title}>Location for delivery tracking</Text>
          <Text style={styles.body}>
            While a delivery is in progress we use your location as your
            vehicle's location, so the vendor and customer can track the order.
          </Text>

          <View style={styles.point}>
            <MapPin size={18} color={colors.primary} weight="fill" />
            <Text style={styles.pointText}>
              Tracking runs only while you have an active delivery, and stops as
              soon as it is completed.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, requesting && styles.btnDisabled]}
            onPress={handleContinue}
            disabled={requesting}
            activeOpacity={0.85}>
            {requesting ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.primaryBtnText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 18,
  },
  point: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 22,
  },
  pointText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 19 },
  primaryBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnDisabled: { backgroundColor: colors.border },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: colors.surface },
});

export default LocationPermissionModal;
