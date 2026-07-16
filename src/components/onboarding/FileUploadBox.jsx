import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { pickImageWithChooser } from '../../utils/imagePicker';
import { toHttpsUrl } from '../../utils/imageUrl';
import useImageUpload from '../../hooks/useImageUpload';

const CameraIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Path
      d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
      stroke={colors.primary}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx={12} cy={13} r={4} stroke={colors.primary} strokeWidth={1.8} />
  </Svg>
);

const CheckIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 6L9 17l-5-5"
      stroke={colors.primary}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * FileUploadBox — picks an image, uploads it to the backend immediately
 * (POST /vendor/profile/documents), and calls onChange(url) once done.
 *
 * Props:
 *   label    - field label shown above the box
 *   hint     - small hint text inside the box
 *   value    - uploaded URL string (controlled, comes from parent form state)
 *   onChange - called with the uploaded URL string after upload
 *   error    - validation error string
 *   field    - backend multipart field name: pan, gst, addressProof,
 *              identityProof, cancelledCheck, fssai (see upload.middleware.js)
 *   role     - 'vendor' | 'customer'; selects the upload endpoint (default vendor)
 */
const FileUploadBox = ({ label, hint, value, onChange, error, field, role = 'vendor' }) => {
  // localUri holds the local file:// path for instant preview while upload is in progress
  const [localUri, setLocalUri] = useState(null);
  const { upload, uploading } = useImageUpload(role);

  // If already uploaded, show it (upgraded to https for iOS); while uploading
  // show the local preview.
  const previewUri = localUri || (value?.startsWith('http') ? toHttpsUrl(value) : null);
  const isUploaded = value?.startsWith('http');
  const hasFile = !!(previewUri);

  const handlePress = async () => {
    if (uploading) return;
    try {
      const file = await pickImageWithChooser();
      if (!file) return;

      // Show local preview instantly — no waiting for the upload
      setLocalUri(file.uri);

      const url = await upload(file, field);

      // Give parent the final uploaded URL
      onChange(url);
    } catch (err) {
      setLocalUri(null);
      // A 401 already triggers a global logout + redirect + toast (see api.js) —
      // avoid stacking a second alert on top of that.
      if (err?.status !== 401) {
        Alert.alert(
          'Upload failed',
          err?.message ?? 'Could not upload photo. Please try again.',
        );
      }
    }
  };

  return (
    <View style={styles.group}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TouchableOpacity
        style={[
          styles.box,
          hasFile && styles.boxFilled,
          error && styles.boxError,
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
        disabled={uploading}>

        {uploading ? (
          <>
            {/* Show preview while uploading */}
            {localUri ? (
              <Image source={{ uri: localUri }} style={styles.preview} resizeMode="cover" />
            ) : null}
            <ActivityIndicator color={colors.primary} size="small" style={{ marginTop: 8 }} />
            <Text style={styles.uploadingText}>Uploading…</Text>
          </>
        ) : hasFile ? (
          <>
            <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="cover" />
            <View style={styles.uploadedRow}>
              {isUploaded && <CheckIcon />}
              <Text style={styles.uploadedText}>
                {isUploaded ? 'Uploaded successfully' : 'Ready to upload'}
              </Text>
            </View>
            <Text style={styles.tapChange}>Tap to change photo</Text>
          </>
        ) : (
          <>
            <CameraIcon />
            <Text style={styles.title}>
              {hint?.toLowerCase().includes('cheque') ? 'Upload Cheque Image' : 'Upload Photo'}
            </Text>
            {hint ? <Text style={styles.hint}>{hint}</Text> : null}
            <Text style={styles.sourceHint}>Gallery or Camera</Text>
          </>
        )}
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  group: { marginBottom: 16 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  box: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    gap: 6,
    minHeight: 120,
    justifyContent: 'center',
  },
  boxFilled: {
    borderStyle: 'solid',
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  boxError: { borderColor: colors.error },
  preview: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  sourceHint: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  uploadedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  uploadedText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  uploadingText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  tapChange: {
    fontSize: 12,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 6,
  },
});

export default FileUploadBox;
