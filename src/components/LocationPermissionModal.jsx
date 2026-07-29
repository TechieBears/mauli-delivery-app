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
 * Rationale shown before the OS "Allow all the time" location prompt, so the
 * rider understands why background location is being requested. Mirrors the
 * inline camera-rationale pattern in PickupScannerScreen.
 *
 * On "Allow" it requests the permission and calls `onResult({ granted, background })`;
 * on dismiss it calls `onResult` with a denied result. The parent decides what to
 * do with a partial/denied grant (tracking still runs foreground-only).
 */
const LocationPermissionModal = ({ visible, onResult, onClose }) => {
  const [requesting, setRequesting] = useState(false);

  const handleAllow = async () => {
    setRequesting(true);
    const result = await ensureLocationPermission();
    setRequesting(false);
    onResult?.(result);
  };

  const handleSkip = () => {
    onResult?.({ granted: false, background: false });
    onClose?.();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleSkip}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <NavigationArrow size={30} color={colors.primary} weight="fill" />
          </View>

          <Text style={styles.title}>Allow your delivery location</Text>
          <Text style={styles.body}>
            While a delivery is in progress we use your location as your
            vehicle's location to track the order.
          </Text>

          <View style={styles.point}>
            <MapPin size={18} color={colors.primary} weight="fill" />
            <Text style={styles.pointText}>
              Please choose <Text style={styles.strong}>Allow all the time</Text> so
              tracking keeps working when the app is in the background.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, requesting && styles.btnDisabled]}
            onPress={handleAllow}
            disabled={requesting}
            activeOpacity={0.85}>
            {requesting ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.primaryBtnText}>Allow location</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={handleSkip}
            disabled={requesting}
            activeOpacity={0.7}>
            <Text style={styles.skipText}>Not now</Text>
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
  strong: { fontWeight: '800', color: colors.primary },
  primaryBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnDisabled: { backgroundColor: colors.border },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: colors.surface },
  skipBtn: { paddingVertical: 14, alignItems: 'center' },
  skipText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
});

export default LocationPermissionModal;
