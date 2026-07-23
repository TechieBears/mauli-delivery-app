import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useObjectOutput,
  isScannedCode,
} from 'react-native-vision-camera';
import { useIsFocused } from '@react-navigation/native';
import { colors } from '../../theme/colors';

// vision-camera v5 is outputs-based: scanning is a CameraObjectOutput created by
// useObjectOutput and handed to <Camera outputs={[...]} />. (The v3/v4
// useCodeScanner API no longer exists.)
const SCAN_TYPES = ['qr'];

// The camera is torn down whenever the screen loses focus so it doesn't keep
// running behind the confirm modal or after navigating away.
const PickupScannerScreen = ({ navigation, route }) => {
  const vendorName = route?.params?.vendorName;
  const onScanned = route?.params?.onScanned;

  const isFocused = useIsFocused();
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission, canRequestPermission } =
    useCameraPermission();

  // A single QR fills several frames, so without this latch the same token
  // fires onScanned dozens of times before the screen unmounts.
  const handled = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hasPermission && canRequestPermission) {
      requestPermission();
    }
  }, [hasPermission, canRequestPermission, requestPermission]);

  const handleCode = useCallback(
    value => {
      if (handled.current || !value) return;
      handled.current = true;
      navigation.goBack();
      onScanned?.(value);
    },
    [navigation, onScanned],
  );

  const onObjectsScanned = useCallback(
    objects => {
      // Scanned objects are typed — only machine-readable codes carry `value`.
      const code = objects?.find(o => isScannedCode(o) && o.value);
      if (code) handleCode(code.value);
    },
    [handleCode],
  );

  // `types` is a useMemo dep inside useObjectOutput, so it must be a stable
  // reference or the output would be recreated on every render.
  const types = useMemo(() => SCAN_TYPES, []);
  const objectOutput = useObjectOutput({ types, onObjectsScanned });
  const outputs = useMemo(() => [objectOutput], [objectOutput]);

  if (!hasPermission) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.msgTitle}>Camera access needed</Text>
        <Text style={styles.msgBody}>
          Allow camera access to scan the vendor's pickup QR code.
        </Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() =>
            canRequestPermission ? requestPermission() : Linking.openSettings()
          }>
          <Text style={styles.btnText}>
            {canRequestPermission ? 'Allow camera' : 'Open Settings'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.surface} />
        <Text style={styles.msgBody}>Starting camera…</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        outputs={outputs}
        isActive={isFocused}
        onError={e => setError(e?.message ?? 'Camera error')}
      />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.frame} />
        <Text style={styles.hint}>
          {error ||
            `Point at the pickup QR${vendorName ? ` from ${vendorName}` : ''}`}
        </Text>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: colors.surface,
    borderRadius: 24,
    backgroundColor: 'transparent',
  },
  hint: {
    marginTop: 24,
    fontSize: 15,
    fontWeight: '600',
    color: colors.surface,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  msgTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.surface,
    marginBottom: 8,
    textAlign: 'center',
  },
  msgBody: {
    fontSize: 14,
    color: colors.border,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 12,
  },
  btn: {
    marginTop: 24,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnText: { color: colors.surface, fontWeight: '800', fontSize: 15 },
});

export default PickupScannerScreen;
