import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAppStore from '../../store/useAppStore';
import {
  useTransporterProfile,
  useUpdateTransporterProfile,
  useUpdateUserProfile,
} from '../../hooks/useTransporterQueries';
import { colors } from '../../theme/colors';
import { pickImageWithChooser, getUploadedFileLabel } from '../../utils/imagePicker';
import { TRANSPORTER_STEPS } from '../../constants/onboardingSteps';
import { HorizontalStepper } from '../../components/onboarding';
import toast from '../../utils/toast';
import logger from '../../utils/logger';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEP_IDENTITY = 0;
const STEP_REVIEW = 1;

const ReviewRow = ({ label, value, last }) => (
  <View style={[styles.reviewRow, !last && styles.reviewRowDivider]}>
    <Text style={styles.reviewLabel}>{label}</Text>
    <Text style={styles.reviewValue} numberOfLines={2}>
      {value || '—'}
    </Text>
  </View>
);

// Two steps only — transporters have no bank or business details:
//   0 Identity → name/email + licence/vehicle, saved on Continue
//   1 Review   → confirm, accept the T&C, then wait for admin approval
//
// The submit leaves kycStatus at 'pending': the backend's updateProfile only
// reads drivingLicenseNo/vehicles/drivingLicenseFile and never assigns
// kycStatus. Approval is an admin action (PATCH /admin/transporters/:id), and
// 'approved' coming back from the server is what actually unlocks Home.
const TransporterKycScreen = ({ navigation }) => {
  const user = useAppStore(state => state.user);
  const setTermsAccepted = useAppStore(state => state.setTermsAccepted);
  const setKycStatus = useAppStore(state => state.setKycStatus);

  const { data: profileRes, isLoading, refetch: refetchProfile } = useTransporterProfile();
  const { mutateAsync: saveIdentity, isPending: savingIdentity } = useUpdateUserProfile();
  const { mutateAsync: saveKyc, isPending: savingKyc } = useUpdateTransporterProfile();

  const profile = profileRes?.data;
  const saving = savingIdentity || savingKyc;

  const [step, setStep] = useState(STEP_IDENTITY);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [licenseFile, setLicenseFile] = useState(null);
  // Set when the user removes an already-uploaded licence: the server copy is
  // still there, but they must pick a new one before they can continue.
  const [removedExisting, setRemovedExisting] = useState(false);
  const [errors, setErrors] = useState({});

  const [showTerms, setShowTerms] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // Phone comes from the OTP identity and has no self-service update route,
  // so it is displayed read-only.
  const phone = profile?.userId?.phone ?? user?.phone ?? '';
  const countryCode = profile?.userId?.countryCode ?? user?.countryCode ?? '+91';

  // Already approved (e.g. an admin approved between screens, or this screen was
  // reached with a stale status) — there's nothing to fill in, so go to the app
  // rather than making an approved transporter re-do registration.
  useEffect(() => {
    if (profile?.kycStatus !== 'approved') return;
    logger.log('[TransporterKyc] already approved on load → TransporterApp');
    setKycStatus('approved');
    navigation.reset({ index: 0, routes: [{ name: 'TransporterApp' }] });
  }, [profile, navigation, setKycStatus]);

  // Seed the form once the profile arrives.
  useEffect(() => {
    if (!profile) return;
    setName(prev => prev || profile?.userId?.name || user?.name || '');
    setEmail(prev => prev || profile?.userId?.email || '');
    setLicenseNo(prev => prev || profile?.drivingLicenseNo || '');
    setVehicleNo(prev => prev || profile?.vehicles?.[0]?.vehicleNo || '');
  }, [profile, user]);

  // Hidden once removed, so the user is pushed to pick a replacement.
  const existingLicenseFile = removedExisting ? null : profile?.drivingLicenseFile;

  const validate = () => {
    const next = {};
    if (!name.trim()) next.name = 'Name is required';
    if (!email.trim()) next.email = 'Email is required';
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email';
    if (!licenseNo.trim()) next.licenseNo = 'Driving licence number is required';
    if (!vehicleNo.trim()) next.vehicleNo = 'Vehicle number is required';
    if (!licenseFile && !existingLicenseFile) next.licenseFile = 'Upload your driving licence';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handlePickFile = async () => {
    try {
      // Resolves to null when the user cancels.
      const file = await pickImageWithChooser();
      if (file) {
        setLicenseFile(file);
        setRemovedExisting(false);
        setErrors(prev => ({ ...prev, licenseFile: undefined }));
      }
    } catch (err) {
      toast.error('Could not add photo', err?.message ?? 'Please try again.');
    }
  };

  // Clears the picked file so another can be chosen. An already-uploaded
  // licence stays on the server — the PATCH has no delete — so validation
  // still counts it until a replacement is actually uploaded.
  const handleRemoveFile = () => {
    setLicenseFile(null);
    setRemovedExisting(true);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      // Name/email live on the User doc; licence/vehicle on the Transporter doc.
      // Two endpoints, so identity is saved first — if the KYC PATCH then fails
      // the user only re-submits the second half on retry.
      logger.log('[TransporterKyc] saving identity', { name: name.trim(), email: email.trim() });
      const identityRes = await saveIdentity({ name: name.trim(), email: email.trim() });
      logger.log('[TransporterKyc] identity saved:', JSON.stringify(identityRes, null, 2));

      logger.log('[TransporterKyc] saving KYC', {
        drivingLicenseNo: licenseNo.trim(),
        vehicles: [vehicleNo.trim()],
        hasFile: !!licenseFile,
      });
      const kycRes = await saveKyc({
        drivingLicenseNo: licenseNo.trim(),
        vehicles: [vehicleNo.trim()],
        ...(licenseFile && { drivingLicenseFile: licenseFile }),
      });
      logger.log('[TransporterKyc] KYC saved:', JSON.stringify(kycRes, null, 2));

      // Update succeeded → move on to the review step.
      setStep(STEP_REVIEW);
    } catch (err) {
      logger.log('[TransporterKyc] save failed', { status: err?.status, message: err?.message, data: err?.data });
      toast.error('Could not save details', err?.message ?? 'Please try again.');
    }
  };

  const handleAcceptTerms = async () => {
    if (!agreed) return;
    let serverKyc = null;
    try {
      // `isTermAccepted` and `kycStatus` are both sent, but the backend
      // currently persists neither: the Transporter model has no
      // isTermAccepted field, and updateProfile only reads drivingLicenseNo /
      // vehicles / drivingLicenseFile. Approval stays an admin action
      // (PATCH /admin/transporters/:id), so this normally comes back 'pending'.
      logger.log('[TransporterKyc] accepting terms → PATCH', { isTermAccepted: true, kycStatus: 'approved' });
      const res = await saveKyc({ isTermAccepted: true, kycStatus: 'approved' });
      logger.log('[TransporterKyc] terms PATCH response:', JSON.stringify(res, null, 2));

      // Re-read the profile rather than trusting the PATCH echo: this is the
      // authoritative status, and it also picks up an approval an admin granted
      // while the form was being filled in.
      const freshRes = await refetchProfile();
      const fresh = freshRes?.data?.data ?? null;
      serverKyc = fresh?.kycStatus ?? res?.data?.kycStatus ?? null;
      logger.log('[TransporterKyc] profile re-fetched after submit:', JSON.stringify(fresh, null, 2));
      logger.log('[TransporterKyc] resolved kycStatus:', serverKyc);

      // Keep the store in step with the backend so Splash and the OTP screen
      // route consistently on the next launch.
      if (serverKyc) setKycStatus(serverKyc);
    } catch (err) {
      // A failure here must not strand the user — acceptance is local anyway.
      logger.log('[TransporterKyc] terms submit failed', { status: err?.status, message: err?.message });
    }
    setTermsAccepted(true);
    setShowTerms(false);

    // Only a server-confirmed 'approved' opens the app; anything else waits for
    // the admin. Flipping this to an unconditional Home would drop an
    // unapproved transporter into a screen whose every call still 403s.
    if (serverKyc === 'approved') {
      logger.log('[TransporterKyc] approved → TransporterApp');
      navigation.reset({ index: 0, routes: [{ name: 'TransporterApp' }] });
      return;
    }
    logger.log('[TransporterKyc] not yet approved → VerificationPending', { kycStatus: serverKyc });
    navigation.reset({
      index: 0,
      routes: [{ name: 'VerificationPending', params: { kycStatus: serverKyc ?? 'onReview' } }],
    });
  };

  // Preview source: the freshly-picked local file, else whatever S3 URL the
  // backend already has on the profile.
  const licensePreviewUri = licenseFile?.uri ?? existingLicenseFile ?? null;

  const licenseFileLabel = useMemo(() => {
    if (licenseFile) return getUploadedFileLabel(licenseFile);
    if (existingLicenseFile) return 'Uploaded';
    return 'Upload a photo of your driving licence';
  }, [licenseFile, existingLicenseFile]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={['bottom']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          <HorizontalStepper steps={TRANSPORTER_STEPS} currentStep={step} />

          {step === STEP_IDENTITY ? (
        <>
          <Text style={styles.heading}>Complete your{'\n'}registration</Text>
          <Text style={styles.subheading}>
            We need a few details before your account can be verified.
          </Text>

          {/* Phone — read-only, it's the verified OTP identity */}
          <Text style={styles.label}>Mobile number</Text>
          <View style={styles.readonlyField}>
            <Text style={styles.readonlyText}>{`${countryCode} ${phone}`}</Text>
            <Text style={styles.readonlyBadge}>VERIFIED</Text>
          </View>
          <Text style={styles.hint}>Your mobile number can't be changed.</Text>

          <Text style={styles.label}>Full name</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={name}
            onChangeText={t => { setName(t); setErrors(p => ({ ...p, name: undefined })); }}
            placeholder="Enter your full name"
            placeholderTextColor={colors.textMuted}
            editable={!saving}
          />
          {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

          <Text style={styles.label}>Email address</Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            value={email}
            onChangeText={t => { setEmail(t); setErrors(p => ({ ...p, email: undefined })); }}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!saving}
          />
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

          <Text style={styles.label}>Driving licence number</Text>
          <TextInput
            style={[styles.input, errors.licenseNo && styles.inputError]}
            value={licenseNo}
            onChangeText={t => { setLicenseNo(t); setErrors(p => ({ ...p, licenseNo: undefined })); }}
            placeholder="DL1420110012345"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            editable={!saving}
          />
          {errors.licenseNo ? <Text style={styles.errorText}>{errors.licenseNo}</Text> : null}

          <Text style={styles.label}>Vehicle number</Text>
          <TextInput
            style={[styles.input, errors.vehicleNo && styles.inputError]}
            value={vehicleNo}
            onChangeText={t => { setVehicleNo(t); setErrors(p => ({ ...p, vehicleNo: undefined })); }}
            placeholder="MH12AB1234"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            editable={!saving}
          />
          {errors.vehicleNo ? <Text style={styles.errorText}>{errors.vehicleNo}</Text> : null}

          <Text style={styles.label}>Driving licence document</Text>
          {licensePreviewUri ? (
            <View style={styles.previewCard}>
              <Image
                source={{ uri: licensePreviewUri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <View style={styles.previewMeta}>
                <Text style={styles.previewName} numberOfLines={2}>
                  {licenseFileLabel}
                </Text>
                <View style={styles.previewActions}>
                  <TouchableOpacity onPress={handlePickFile} disabled={saving} activeOpacity={0.7}>
                    <Text style={styles.previewReplace}>Replace</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleRemoveFile} disabled={saving} activeOpacity={0.7}>
                    <Text style={styles.previewRemove}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.fileBtn, errors.licenseFile && styles.inputError]}
              onPress={handlePickFile}
              disabled={saving}
              activeOpacity={0.8}>
              <Text style={styles.fileBtnText} numberOfLines={1}>
                {licenseFileLabel}
              </Text>
            </TouchableOpacity>
          )}
          {errors.licenseFile ? <Text style={styles.errorText}>{errors.licenseFile}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, saving && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={saving}
            activeOpacity={0.85}>
            <Text style={styles.btnText}>{saving ? 'Saving…' : 'Continue'}</Text>
          </TouchableOpacity>
        </>
          ) : (
        <>
          <Text style={styles.heading}>Review your{'\n'}details</Text>
          <Text style={styles.subheading}>
            Please check everything is correct before you submit.
          </Text>

          <View style={styles.reviewCard}>
            <ReviewRow label="Mobile number" value={`${countryCode} ${phone}`} />
            <ReviewRow label="Full name" value={name} />
            <ReviewRow label="Email address" value={email} />
            <ReviewRow label="Driving licence number" value={licenseNo} />
            <ReviewRow label="Vehicle number" value={vehicleNo} />
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Driving licence</Text>
              {licensePreviewUri ? (
                <Image
                  source={{ uri: licensePreviewUri }}
                  style={styles.reviewImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.reviewValue}>—</Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.btn}
            onPress={() => setShowTerms(true)}
            activeOpacity={0.85}>
            <Text style={styles.btnText}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnBack}
            onPress={() => setStep(STEP_IDENTITY)}
            activeOpacity={0.85}>
            <Text style={styles.btnBackText}>Edit details</Text>
          </TouchableOpacity>
        </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Terms & conditions gate */}
      <Modal
        visible={showTerms}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTerms(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Terms & Conditions</Text>

            <ScrollView style={styles.termsScroll} showsVerticalScrollIndicator>
              <Text style={styles.termsText}>
                By registering as a Mauli transporter you agree to carry out deliveries
                assigned to you through the app, to keep your driving licence and vehicle
                details accurate and up to date, and to share your live location while a
                delivery is in progress so customers and vendors can track their order.
                {'\n\n'}
                You confirm that the driving licence and vehicle details you have provided
                are genuine and belong to you, and that you hold a valid licence for the
                vehicle you operate. Submitting false or misleading documents may result in
                your account being rejected or disabled.
                {'\n\n'}
                Your details will be reviewed by the Mauli team before your account is
                activated. Approval is at Mauli's discretion and is not guaranteed.
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setAgreed(a => !a)}
              activeOpacity={0.7}>
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
              <Text style={styles.checkLabel}>
                I have read and agree to the Terms & Conditions
              </Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowTerms(false)}
                activeOpacity={0.85}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, !agreed && styles.btnDisabled]}
                onPress={handleAcceptTerms}
                disabled={!agreed}
                activeOpacity={0.85}>
                <Text style={styles.btnText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.surface },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },

  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 34,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: 28,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    marginTop: 18,
  },
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
  readonlyBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: colors.success,
  },

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

  /* licence preview */
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 10,
    backgroundColor: colors.inputBg,
    gap: 12,
  },
  previewImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  previewMeta: { flex: 1, justifyContent: 'center', gap: 8 },
  previewName: { fontSize: 13, fontWeight: '600', color: colors.text },
  previewActions: { flexDirection: 'row', gap: 18 },
  previewReplace: { fontSize: 13, fontWeight: '700', color: colors.primary },
  previewRemove: { fontSize: 13, fontWeight: '700', color: colors.error },

  btn: {
    height: 54,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  btnBack: {
    height: 54,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  btnBackText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  btnDisabled: { opacity: 0.5 },

  /* review step */
  reviewCard: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.inputBg,
  },
  reviewRow: { paddingVertical: 14 },
  reviewRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 4,
  },
  reviewValue: { fontSize: 15, fontWeight: '600', color: colors.text },
  reviewImage: {
    width: 120,
    height: 84,
    borderRadius: 10,
    marginTop: 4,
    backgroundColor: colors.background,
  },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },

  /* terms modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 22,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 14,
  },
  termsScroll: { maxHeight: 240, marginBottom: 16 },
  termsText: { fontSize: 13, color: colors.textSecondary, lineHeight: 21 },

  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: '800' },
  checkLabel: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 19 },

  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancel: {
    flex: 1,
    height: 50,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  modalSubmit: {
    flex: 1,
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TransporterKycScreen;
