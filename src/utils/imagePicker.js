import { Alert } from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
} from 'react-native-image-picker';
import {
  ensureCameraPermission,
  ensureMediaPermission,
} from '../services/permissions';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const PICKER_OPTIONS = {
  mediaType: 'photo',
  quality: 0.85,
  maxWidth: 2048,
  maxHeight: 2048,
  selectionLimit: 1,
  includeExtra: true,
  presentationStyle: 'fullScreen',
};

const formatFileSize = bytes => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const assetToFile = asset => {
  const fileName =
    asset.fileName ??
    `photo_${Date.now()}.${asset.type?.includes('png') ? 'png' : 'jpg'}`;

  return {
    uri: asset.uri,
    fileName,
    type: asset.type ?? 'image/jpeg',
    size: asset.fileSize ?? 0,
    sizeLabel: formatFileSize(asset.fileSize),
  };
};

const pickImage = async source => {
  if (source === 'camera') {
    await ensureCameraPermission();
  } else {
    await ensureMediaPermission();
  }

  const launcher =
    source === 'camera' ? launchCamera : launchImageLibrary;

  const result = await launcher(PICKER_OPTIONS);

  if (result.didCancel) {
    return null;
  }

  if (result.errorCode) {
    const message =
      result.errorMessage ??
      (result.errorCode === 'permission'
        ? 'Camera or photo library permission was denied. Enable it in Settings.'
        : 'Could not pick image. Please try again.');
    throw new Error(message);
  }

  const asset = result.assets?.[0];
  if (!asset?.uri) {
    throw new Error('No image was selected.');
  }

  if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
    throw new Error('Image must be 5MB or smaller. Please choose another photo.');
  }

  return assetToFile(asset);
};

const runPickerChoice = async (source, resolve, reject) => {
  try {
    resolve(await pickImage(source));
  } catch (err) {
    reject(err);
  }
};

/**
 * Shows gallery / camera chooser and returns a file object or null if cancelled.
 */
export const pickImageWithChooser = () =>
  new Promise((resolve, reject) => {
    Alert.alert(
      'Upload Photo',
      'Choose how you want to add your photo',
      [
        {
          text: 'Take Photo',
          onPress: () => runPickerChoice('camera', resolve, reject),
        },
        {
          text: 'Choose from Gallery',
          onPress: () => runPickerChoice('gallery', resolve, reject),
        },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true },
    );
  });

export const getUploadedFileLabel = file => {
  if (!file) return '';
  if (typeof file === 'string') return file;
  const name = file.fileName ?? 'Uploaded';
  const size = file.sizeLabel ? ` • ${file.sizeLabel}` : '';
  return `${name}${size}`;
};

export { formatFileSize };
