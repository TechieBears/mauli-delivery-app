import {
  Platform,
  Alert,
  Linking,
  PermissionsAndroid,
} from 'react-native';

const isAndroid = Platform.OS === 'android';
const isAndroid13Plus = isAndroid && Number(Platform.Version) >= 33;

const GRANTED = PermissionsAndroid.RESULTS.GRANTED;

// Gallery access is deliberately absent: picking a document photo goes through the
// Android Photo Picker, which grants access to just the chosen item and needs no
// permission. Asking for READ_MEDIA_IMAGES would request the entire gallery.
const getAndroidPermissions = () => {
  const list = [PermissionsAndroid.PERMISSIONS.CAMERA];

  if (isAndroid13Plus) {
    list.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }

  return list;
};

const promptOpenSettings = feature => {
  Alert.alert(
    `${feature} permission required`,
    `Allow ${feature.toLowerCase()} access in Settings to use this feature.`,
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ],
  );
};

const requestAndroidPermission = async (permission, featureLabel) => {
  const alreadyGranted = await PermissionsAndroid.check(permission);
  if (alreadyGranted) {
    return true;
  }

  const result = await PermissionsAndroid.request(permission, {
    title: `${featureLabel} Permission`,
    message: `Mauli G-Mart Transporter needs ${featureLabel.toLowerCase()} access for document uploads and updates.`,
    buttonPositive: 'Allow',
    buttonNegative: 'Deny',
  });

  if (result === GRANTED) {
    return true;
  }

  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    promptOpenSettings(featureLabel);
    throw new Error(
      `${featureLabel} permission denied. Enable it in Settings and try again.`,
    );
  }

  throw new Error(
    `${featureLabel} permission is required. Please allow access and try again.`,
  );
};

/**
 * Request camera and notifications when the app starts (Android).
 * iOS shows its system prompt when the camera is first used. Neither platform
 * needs a prompt for the gallery — both use a system picker that grants access
 * to only the item the user selects.
 */
export const requestAppPermissionsOnLaunch = async () => {
  if (!isAndroid) {
    return {};
  }

  const permissions = getAndroidPermissions();
  return PermissionsAndroid.requestMultiple(permissions);
};

export const ensureCameraPermission = async () => {
  if (!isAndroid) {
    return true;
  }
  return requestAndroidPermission(
    PermissionsAndroid.PERMISSIONS.CAMERA,
    'Camera',
  );
};
