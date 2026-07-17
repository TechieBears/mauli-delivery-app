import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useTransporterProfile,
  useUpdateTransporterProfile,
  useUpdateUserProfile,
} from '../../hooks/useTransporterQueries';
import { pickImageWithChooser } from '../../utils/imagePicker';
import { colors } from '../../theme/colors';
import toast from '../../utils/toast';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Field = ({ label, error, children }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    {children}
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

// Edit form behind Profile → "Profile Details" / "Vehicle & Licence".
// Saves across two endpoints: name/email live on the User doc, licence and
// vehicle on the Transporter doc.
const TransporterProfileDetailsScreen = ({ navigation }) => {
  const { data: profileRes, isLoading } = useTransporterProfile();
  const { mutateAsync: saveIdentity, isPending: savingIdentity } = useUpdateUserProfile();
  const { mutateAsync: saveKyc, isPending: savingKyc } = useUpdateTransporterProfile();

  const profile = profileRes?.data;
  const saving = savingIdentity || savingKyc;

  const [form, setForm] = useState({ name: '', email: '', licenseNo: '', vehicleNo: '' });
  const [licenseFile, setLicenseFile] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile?.userId?.name ?? '',
      email: profile?.userId?.email ?? '',
      licenseNo: profile?.drivingLicenseNo ?? '',
      vehicleNo: profile?.vehicles?.[0]?.vehicleNo ?? '',
    });
  }, [profile]);

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const handlePickFile = async () => {
    try {
      const file = await pickImageWithChooser();
      if (file) setLicenseFile(file);
    } catch (err) {
      toast.error('Could not add photo', err?.message ?? 'Please try again.');
    }
  };

  const handleSave = async () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Name is required';
    if (!form.email.trim()) next.email = 'Email is required';
    else if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email';
    if (!form.licenseNo.trim()) next.licenseNo = 'Licence number is required';
    if (!form.vehicleNo.trim()) next.vehicleNo = 'Vehicle number is required';
    setErrors(next);
    if (Object.keys(next).length) return;

    try {
      await saveIdentity({ name: form.name.trim(), email: form.email.trim() });
      await saveKyc({
        drivingLicenseNo: form.licenseNo.trim(),
        vehicles: [form.vehicleNo.trim()],
        ...(licenseFile && { drivingLicenseFile: licenseFile }),
      });
      toast.success('Profile updated');
      navigation.goBack();
    } catch (err) {
      toast.error('Could not save profile', err?.message ?? 'Please try again.');
    }
  };

  const licensePreviewUri = licenseFile?.uri ?? profile?.drivingLicenseFile;
  const phoneLabel = profile?.userId?.phone
    ? `${profile.userId.countryCode ?? '+91'} ${profile.userId.phone}`
    : '';

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]} edges={['bottom']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          <Field label="Mobile number">
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyText}>{phoneLabel}</Text>
              <Text style={styles.readonlyBadge}>VERIFIED</Text>
            </View>
            <Text style={styles.hint}>Your mobile number can't be changed.</Text>
          </Field>

          <Field label="Full name" error={errors.name}>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={form.name}
              onChangeText={t => setField('name', t)}
              placeholder="Enter your full name"
              placeholderTextColor={colors.textMuted}
              editable={!saving}
            />
          </Field>

          <Field label="Email address" error={errors.email}>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={form.email}
              onChangeText={t => setField('email', t)}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!saving}
            />
          </Field>

          <Field label="Vehicle number" error={errors.vehicleNo}>
            <TextInput
              style={[styles.input, errors.vehicleNo && styles.inputError]}
              value={form.vehicleNo}
              onChangeText={t => setField('vehicleNo', t)}
              placeholder="MH12AB1234"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              editable={!saving}
            />
          </Field>

          <Field label="Driving licence number" error={errors.licenseNo}>
            <TextInput
              style={[styles.input, errors.licenseNo && styles.inputError]}
              value={form.licenseNo}
              onChangeText={t => setField('licenseNo', t)}
              placeholder="DL1420110012345"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              editable={!saving}
            />
          </Field>

          <Field label="Driving licence document">
            {licensePreviewUri ? (
              <View style={styles.previewCard}>
                <Image
                  source={{ uri: licensePreviewUri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                <TouchableOpacity onPress={handlePickFile} disabled={saving} activeOpacity={0.7}>
                  <Text style={styles.replaceLink}>Replace photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.fileBtn}
                onPress={handlePickFile}
                disabled={saving}
                activeOpacity={0.8}>
                <Text style={styles.fileBtnText}>Upload a photo of your driving licence</Text>
              </TouchableOpacity>
            )}
          </Field>

          <TouchableOpacity
            style={[styles.btn, saving && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}>
            <Text style={styles.btnText}>{saving ? 'Saving…' : 'Save changes'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.surface },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },

  field: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.inputBg,
  },
  inputError: { borderColor: colors.error },
  errorText: { fontSize: 12, color: colors.error, marginTop: 6 },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 6 },

  readonlyField: {
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readonlyText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  readonlyBadge: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: colors.success },

  fileBtn: {
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: colors.inputBg,
  },
  fileBtnText: { fontSize: 14, color: colors.textMuted },

  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 10,
    backgroundColor: colors.inputBg,
    gap: 14,
  },
  previewImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  replaceLink: { fontSize: 13, fontWeight: '700', color: colors.primary },

  btn: {
    marginTop: 12,
    height: 54,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
});

export default TransporterProfileDetailsScreen;
