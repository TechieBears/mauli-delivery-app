import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera } from 'react-native-camera-kit';
import { useIsFocused } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { ensureCameraPermission } from '../../services/permissions';

// QR scanning uses react-native-camera-kit's built-in barcode scanner
// (scanBarcode + onReadCode). vision-camera v5's useObjectOutput API is
// iOS-only — its Android factory throws "CameraObjectOutput is not available
// on Android!", which crashed the app the moment this screen opened.
//
// The camera is torn down whenever the screen loses focus so it doesn't keep
// running behind the confirm modal or after navigating away.
const PickupScannerScreen = ({ navigation, route }) => {
  const vendorName = route?.params?.vendorName;
  const onScanned = route?.params?.onScanned;

  const isFocused = useIsFocused();

  // Permission gate. On iOS the <Camera> triggers the system prompt on first
  // use; on Android we request explicitly via the shared helper. `granted` is
  // undefined until we know, so we can show a spinner instead of flashing the
  // "access needed" screen.
  const [granted, setGranted] = useState(undefined);
  const [error, setError] = useState('');

  const requestPermission = useCallback(async () => {
    try {
      const ok = await ensureCameraPermission();
      setGranted(ok);
    } catch {
      setGranted(false);
    }
  }, []);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  // A single QR fills several frames, so without this latch the same token
  // fires onScanned dozens of times before the screen unmounts.
  const handled = useRef(false);

  const handleCode = useCallback(
    value => {
      if (handled.current || !value) return;
      handled.current = true;
      navigation.goBack();
      onScanned?.(value);
    },
    [navigation, onScanned],
  );

  const onReadCode = useCallback(
    event => {
      const value = event?.nativeEvent?.codeStringValue;
      if (value) handleCode(value);
    },
    [handleCode],
  );

  if (granted === undefined) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.surface} />
        <Text style={styles.msgBody}>Starting camera…</Text>
      </SafeAreaView>
    );
  }

  if (!granted) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.msgTitle}>Camera access needed</Text>
        <Text style={styles.msgBody}>
          Allow camera access to scan the vendor's pickup QR code.
        </Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => Linking.openSettings()}>
          <Text style={styles.btnText}>Open Settings</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused ? (
        <Camera
          style={StyleSheet.absoluteFill}
          cameraType="back"
          scanBarcode
          onReadCode={onReadCode}
          showFrame={false}
          onError={e =>
            setError(e?.nativeEvent?.errorMessage ?? 'Camera error')
          }
        />
      ) : null}

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
