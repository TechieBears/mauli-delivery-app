import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import useAppStore from '../../store/useAppStore';
import useVendorOnboardingStore from '../../store/useVendorOnboardingStore';
import { useSaveBankAndKycSteps, useVendorProfile, useUpdateUserProfile } from '../../hooks/useVendorQueries';
import { useSaveCustomerKycSteps, useCustomerProfile } from '../../hooks/useCustomerQueries';
import { useSendOtp, useVerifyOtp } from '../../hooks/useAuthQueries';
import { resetToLogin } from '../../navigation/navigationRef';
import toast from '../../utils/toast';
import { FormField, HorizontalStepper } from '../../components/onboarding';
import { VENDOR_STEPS, CUSTOMER_STEPS } from '../../constants/onboardingSteps';
import DevOtpBanner from '../../components/DevOtpBanner';
import { colors } from '../../theme/colors';
import {
  VendorIdentityStep,
  VendorBankStep,
  VendorKycStep,
  VendorReviewStep,
} from './vendorSteps';
import {
  CustomerIdentityStep,
  CustomerBankStep,
  CustomerKycStep,
  CustomerReviewStep,
} from './customerSteps';
import logger from '../../utils/logger';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const OTP_LENGTH = 6;

const OnboardingScreen = ({ navigation, route }) => {
  const role = route?.params?.role ?? 'customer';
  const paramPhone = route?.params?.phone ?? '';
  const phoneLocked = !!paramPhone;
  const resumeStep = route?.params?.resumeStep;
  const headerHeight = useHeaderHeight();

  const login = useAppStore(state => state.login);
  const logout = useAppStore(state => state.logout);
  const setProfile = useAppStore(state => state.setProfile);
  const setKycStatus = useAppStore(state => state.setKycStatus);

  const data = useVendorOnboardingStore(state => state.data);
  const setField = useVendorOnboardingStore(state => state.setField);
  const setStoreData = useVendorOnboardingStore(state => state.setData);
  const resetStore = useVendorOnboardingStore(state => state.reset);

  const isVendor = role === 'vendor';

  const { mutateAsync: saveBankAndKycSteps, isPending: submittingVendor } = useSaveBankAndKycSteps();
  const { mutateAsync: saveCustomerKycSteps, isPending: submittingCustomer } = useSaveCustomerKycSteps();
  const { mutateAsync: updateUserProfile } = useUpdateUserProfile();
  const { mutateAsync: sendOtp, isPending: sendingOtp } = useSendOtp();
  const { mutateAsync: verifyOtp, isPending: verifyingOtp } = useVerifyOtp();
  // Resuming/authenticated user: fetch GET /{role}/profile so Name/Email/
  // Bank/KYC all repopulate reliably (TanStack Query refetches on remount,
  // unlike a one-shot effect, so this survives Fast Refresh during dev too).
  // Only the active role's query is enabled.
  const { data: vendorProfileRes } = useVendorProfile(phoneLocked && isVendor);
  const { data: customerProfileRes } = useCustomerProfile(phoneLocked && !isVendor);
  const profileRes = isVendor ? vendorProfileRes : customerProfileRes;
  const saveKycSteps = isVendor ? saveBankAndKycSteps : saveCustomerKycSteps;
  const submitting = isVendor ? submittingVendor : submittingCustomer;

  const steps = isVendor ? VENDOR_STEPS : CUSTOMER_STEPS;
  const [step, setStep] = useState(resumeStep ?? 0);
  const [errors, setErrors] = useState({});
  const [agreed, setAgreed] = useState(false);
  const [agreeError, setAgreeError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [showChangeAccount, setShowChangeAccount] = useState(false);
  // True while the vendor jumped back to a step via "Edit" from the Review
  // screen — Continue should return straight to Review, not advance one step.
  const [editingFromReview, setEditingFromReview] = useState(false);

  // OTP gate shown right after step 0, before moving on to step 1.
  // Email is collected here too, once OTP is verified, rather than on the Identity form.
  const [otpStage, setOtpStage] = useState(false);
  const [otpVerified, setOtpVerified] = useState(phoneLocked);
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [otpError, setOtpError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [devOtp, setDevOtp] = useState(null);
  const otpRefs = useRef([]);

  const phone = phoneLocked ? paramPhone : data.phone;

  const isReview = step === steps.length - 1;

  // Fresh "Register Here" session (no phone param) starts with a clean slate.
  useEffect(() => {
    if (!phoneLocked) resetStore();
  }, [phoneLocked, resetStore]);

  // A resuming, already-authenticated user seeds the store every time
  // GET /{role}/profile resolves — including refetches, so a Fast Refresh
  // during dev (or coming back to this screen) reliably repopulates Name/
  // Email alongside Bank/KYC, instead of only working on the very first mount.
  // Vendor and customer profiles share the same field shape.
  useEffect(() => {
    if (!phoneLocked) return;
    const profile = profileRes?.data;
    if (!profile) return;
    setStoreData({
      fullName: profile.userId?.name ?? '',
      email: profile.userId?.email ?? '',
      bankName: profile.bankDetails?.bankName ?? '',
      branchName: profile.bankDetails?.branchName ?? '',
      accountNumber: profile.bankDetails?.accountNumber ?? '',
      accountType: profile.bankDetails?.accountType
        ? profile.bankDetails.accountType.charAt(0).toUpperCase() + profile.bankDetails.accountType.slice(1)
        : '',
      ifsc: profile.bankDetails?.ifscCode ?? '',
      chequePhoto: profile.bankDetails?.cancelledCheck ?? '',
      officeAddress: profile.address?.line ?? '',
      pan: profile.panCardNo ?? '',
      panDoc: profile.panFile ?? '',
      addressProof: profile.addressProof ?? '',
      identityProofDoc: profile.identityProof ?? '',
      gst: profile.gstNo ?? '',
      gstProof: profile.gstFile ?? '',
      fssai: profile.fssaiNo ?? '',
      fssaiCert: profile.fssaiFile ?? '',
    });
  }, [phoneLocked, profileRes, setStoreData]);

  const onChange = useCallback((key, value) => {
    setField(key, value);
    setErrors(prev => ({ ...prev, [key]: undefined }));
  }, [setField]);

  const validate = () => {
    const next = {};
    if (step === 0) {
      if (!data.fullName?.trim()) next.fullName = 'Full name is required';
      if (!phoneLocked) {
        if (!data.phone?.trim()) next.phone = 'Phone number is required';
        else if (!/^[0-9]{10}$/.test(data.phone.trim())) next.phone = 'Enter a valid 10-digit mobile number';
      }
      if (otpVerified) {
        if (!data.email?.trim()) next.email = 'Email is required';
        else if (!EMAIL_RE.test(data.email)) next.email = 'Enter a valid email';
      }
    }
    if (step === 1) {
      if (!data.bankName?.trim()) next.bankName = 'Bank name is required';
      if (!data.branchName?.trim()) next.branchName = 'Branch name is required';
      if (!data.accountNumber?.trim()) next.accountNumber = 'Account number is required';
      if (!data.accountType) next.accountType = 'Select account type';
      if (!data.ifsc?.trim()) next.ifsc = 'IFSC code is required';
      else if (!IFSC_RE.test(data.ifsc.trim())) next.ifsc = 'Enter a valid IFSC code';
      if (!data.chequePhoto) next.chequePhoto = 'Upload cancelled cheque photo';
    }
    if (step === 2) {
      if (!data.officeAddress?.trim()) next.officeAddress = 'Office address is required';
      if (!data.pan?.trim()) next.pan = 'PAN number is required';
      else if (!PAN_RE.test(data.pan)) next.pan = 'Enter a valid PAN (e.g. ABCDE1234F)';
      if (!data.panDoc) next.panDoc = 'Upload PAN card';
      if (!data.addressProof) next.addressProof = 'Upload address proof';
      if (!data.identityProofDoc) next.identityProofDoc = 'Upload identity proof';
      if (!data.gst?.trim()) next.gst = 'GST number is required';
      if (!data.gstProof) next.gstProof = 'Upload GST proof';
      if (!data.fssai?.trim()) next.fssai = 'FSSAI number is required';
      if (!data.fssaiCert) next.fssaiCert = 'Upload FSSAI certificate';
    }
    if (step === 3 && !agreed) setAgreeError('You must agree to the declaration');
    return next;
  };

  // Pure check (no side effects) used to decide whether the button should read
  // "Continue…" or a step-specific prompt like "Fill in details".
  const isCurrentStepValid = () => {
    if (step === 0) {
      return !!data.fullName?.trim() &&
        (phoneLocked || (!!data.phone?.trim() && /^[0-9]{10}$/.test(data.phone.trim()))) &&
        (!otpVerified || (!!data.email?.trim() && EMAIL_RE.test(data.email)));
    }
    if (step === 1) {
      return !!data.bankName?.trim() && !!data.branchName?.trim() &&
        !!data.accountNumber?.trim() && !!data.accountType &&
        !!data.ifsc?.trim() && IFSC_RE.test(data.ifsc.trim()) && !!data.chequePhoto;
    }
    if (step === 2) {
      return !!data.officeAddress?.trim() &&
        !!data.pan?.trim() && PAN_RE.test(data.pan) && !!data.panDoc && !!data.addressProof &&
        !!data.identityProofDoc &&
        !!data.gst?.trim() && !!data.gstProof &&
        !!data.fssai?.trim() && !!data.fssaiCert;
    }
    if (step === 3) return agreed;
    return true;
  };

  const isEmailValid = !!data.email?.trim() && EMAIL_RE.test(data.email);
  const isOtpComplete = otp.join('').length === OTP_LENGTH;

  const handleContinue = async () => {
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }
    if (isReview && !agreed) {
      setAgreeError('You must agree to the declaration');
      return;
    }
    setAgreeError('');
    setSubmitError('');

    if (step === 0 && !otpVerified) {
      setOtpError('');
      setOtp(Array(OTP_LENGTH).fill(''));
      logger.log('[Onboarding] sendOtp →', { phone: data.phone, name: data.fullName, role });
      try {
        const res = await sendOtp({ phone: data.phone, name: data.fullName, role, countryCode: data.countryCode });
        logger.log('[Onboarding] sendOtp response:', JSON.stringify(res, null, 2));
        setDevOtp(res?.data?.otp ?? null);
        setOtpStage(true);
      } catch (err) {
        logger.log('[Onboarding] sendOtp error:', {
          status: err?.status,
          message: err?.message,
          data: err?.data,
        });
        setErrors(prev => ({ ...prev, phone: err?.message ?? 'Failed to send OTP. Try again.' }));
      }
      return;
    }

    if (!isReview) {
      if (editingFromReview) {
        setEditingFromReview(false);
        setStep(steps.length - 1);
      } else {
        setStep(s => s + 1);
      }
      return;
    }

    // Both vendor and customer submit land on the On-Review state (mirroring the
    // vendor flow). Note: the customer PATCH /customer/profile allowlist does NOT
    // include kycStatus, so the backend ignores the value we send — the customer's
    // server-side status is changed by an admin. We still set 'onReview' so the
    // local store + VerificationPending screen reflect the submitted state.
    const submittedKycStatus = 'onReview';
    logger.log('[Onboarding] saveKycSteps (submit) →', JSON.stringify(data, null, 2));
    try {
      // Persist any name/email edits (User record), then save the form data.
      // Vendor: kycStatus 'onReview' (backend accepts it). Customer: sent for
      // parity but ignored by the backend allowlist.
      await updateUserProfile({ name: data.fullName?.trim(), email: data.email?.trim() });
      const reviewRes = await saveKycSteps({ data, kycStatus: submittedKycStatus });
      logger.log('[Onboarding] saveKycSteps response:', JSON.stringify(reviewRes, null, 2));
      setProfile({ ...data, phone });
      setKycStatus(submittedKycStatus);
    } catch (err) {
      logger.log('[Onboarding] saveKycSteps error:', {
        status: err?.status,
        message: err?.message,
        data: err?.data,
      });
      // A 401 already triggers a global logout + redirect + toast (see api.js).
      if (err?.status !== 401) {
        setSubmitError(err?.message ?? 'Failed to submit. Please try again.');
      }
      return;
    }

    navigation.reset({ index: 0, routes: [{ name: 'VerificationPending', params: { kycStatus: submittedKycStatus } }] });
  };

  const handleOtpChange = useCallback((text, index) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    setOtpError('');
    setOtp(prev => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleOtpKeyPress = useCallback(({ nativeEvent }, index) => {
    if (nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
      setOtp(prev => {
        const next = [...prev];
        next[index - 1] = '';
        return next;
      });
    }
  }, [otp]);

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length < OTP_LENGTH) {
      setOtpError(`Please enter all ${OTP_LENGTH} digits`);
      return;
    }
    logger.log('[Onboarding] verifyOtp →', { phone: data.phone, otp: code });
    try {
      const res = await verifyOtp({ phone: data.phone, otp: code });
      logger.log('[Onboarding] verifyOtp response:', JSON.stringify(res, null, 2));
      const { accessToken, refreshToken, user, profile } = res.data;
      login({
        accessToken,
        refreshToken,
        user,
        vendorId: profile?.vendorId ?? null,
        kycStatus: profile?.kycStatus ?? null,
        isPricingComplete: profile?.isPricingComplete ?? false,
      });
      // OTP verified — stay on this screen and now collect Email before
      // moving on to Step 2 (Bank). Registration itself is already done by
      // /auth/send-otp + /auth/verify-otp (name/phone/role sent on send-otp).
      setOtpVerified(true);
    } catch (err) {
      logger.log('[Onboarding] verifyOtp error:', {
        status: err?.status,
        message: err?.message,
        data: err?.data,
      });
      setOtpError(err?.message ?? 'Invalid OTP. Try again.');
    }
  };

  const handleContinueAfterOtp = async () => {
    if (!data.email?.trim()) {
      setEmailError('Email is required');
      return;
    }
    if (!EMAIL_RE.test(data.email)) {
      setEmailError('Enter a valid email');
      return;
    }
    setEmailError('');
    // Save name + email to the User record (PUT /user/profile) — this is the
    // only place email is persisted; PATCH /vendor/profile doesn't take it.
    setSavingEmail(true);
    try {
      await updateUserProfile({ name: data.fullName?.trim(), email: data.email.trim() });
      setOtpStage(false);
      setStep(s => s + 1);
    } catch (err) {
      if (err?.status !== 401) {
        setEmailError(err?.message ?? 'Failed to save email. Please try again.');
      }
    } finally {
      setSavingEmail(false);
    }
  };

  const handleResendOtp = async () => {
    setOtp(Array(OTP_LENGTH).fill(''));
    setOtpError('');
    try {
      const res = await sendOtp({ phone: data.phone, name: data.fullName, role, countryCode: data.countryCode });
      setDevOtp(res?.data?.otp ?? null);
    } catch (_) {}
  };

  const goToStep = index => {
    setEditingFromReview(true);
    setStep(index);
  };

  const handleChangeAccount = () => {
    setShowChangeAccount(false);
    resetStore();
    logout();
    resetToLogin();
  };

  // Save as draft: persist whatever's been filled in so far with status
  // 'drafted' so the vendor can resume later. Doesn't require the declaration
  // checkbox and doesn't navigate to VerificationPending.
  const handleSaveDraft = async () => {
    setSubmitError('');
    setSavingDraft(true);
    try {
      if (data.email?.trim()) {
        await updateUserProfile({ name: data.fullName?.trim(), email: data.email.trim() });
      }
      await saveKycSteps({ data, kycStatus: 'drafted' });
      setProfile({ ...data, phone });
      setKycStatus('drafted');
      toast.success('Draft saved', 'You can continue your registration anytime.');
    } catch (err) {
      if (err?.status !== 401) {
        setSubmitError(err?.message ?? 'Failed to save draft. Please try again.');
      }
    } finally {
      setSavingDraft(false);
    }
  };

  const nextStepLabel = isReview
    ? isVendor ? 'Submit for Verification' : 'Complete Registration'
    : editingFromReview
    ? 'Save & Back to Review'
    : step === 0 ? (otpVerified ? 'Continue to Bank' : 'Send OTP')
    : step === 1 ? 'Continue to Business'
    : 'Continue to Review';
  // Button reflects validation state: a neutral prompt while the step is
  // incomplete, the real next-step action once everything required is filled in.
  const continueLabel = isCurrentStepValid() ? nextStepLabel : 'Fill in required details';

  const IdentityStep = isVendor ? VendorIdentityStep : CustomerIdentityStep;
  const BankStep = isVendor ? VendorBankStep : CustomerBankStep;
  const KycStep = isVendor ? VendorKycStep : CustomerKycStep;
  const ReviewStep = isVendor ? VendorReviewStep : CustomerReviewStep;

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <IdentityStep
            data={data}
            errors={errors}
            onChange={onChange}
            phone={phone}
            phoneLocked={phoneLocked}
            role={role}
            showEmail={otpVerified}
          />
        );
      case 1:
        return <BankStep data={data} errors={errors} onChange={onChange} />;
      case 2:
        return <KycStep data={data} errors={errors} onChange={onChange} />;
      case 3:
        logger.log('[Onboarding] review document values', {
          panDoc: data.panDoc,
          addressProof: data.addressProof,
          identityProofDoc: data.identityProofDoc,
          gstProof: data.gstProof,
          fssaiCert: data.fssaiCert,
          chequePhoto: data.chequePhoto,
        });
        return (
          <ReviewStep
            data={data}
            phone={phone}
            role={role}
            onEditStep={goToStep}
            agreed={agreed}
            onAgreeChange={v => { setAgreed(v); setAgreeError(''); }}
            agreeError={agreeError}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={headerHeight}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <HorizontalStepper steps={steps} currentStep={step} />
            {otpStage ? (
              otpVerified ? (
                <>
                  <Text style={styles.sectionTitle}>Almost there</Text>
                  <Text style={styles.sectionDesc}>
                    Add your email address to continue.
                  </Text>
                  <FormField
                    label="Email Address"
                    value={data.email}
                    onChangeText={v => {
                      onChange('email', v);
                      setEmailError('');
                    }}
                    placeholder="name@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={emailError}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>Verify your number</Text>
                  <Text style={styles.sectionDesc}>
                    Enter the OTP sent to +91 {data.phone}
                  </Text>

                  <DevOtpBanner
                    otp={devOtp}
                    length={OTP_LENGTH}
                    onFill={setOtp}
                    style={styles.devOtpSpacing}
                  />

                  <View style={styles.otpRow}>
                    {otp.map((digit, i) => (
                      <TextInput
                        key={i}
                        ref={el => (otpRefs.current[i] = el)}
                        style={[
                          styles.otpBox,
                          digit ? styles.otpBoxFilled : null,
                          otpError ? styles.otpBoxError : null,
                        ]}
                        value={digit}
                        onChangeText={text => handleOtpChange(text, i)}
                        onKeyPress={e => handleOtpKeyPress(e, i)}
                        keyboardType="number-pad"
                        maxLength={1}
                        textContentType="oneTimeCode"
                        selectTextOnFocus
                      />
                    ))}
                  </View>
                  {otpError ? <Text style={styles.errorText}>{otpError}</Text> : null}

                  <TouchableOpacity onPress={handleResendOtp} style={styles.resendLink}>
                    <Text style={styles.resendLinkText}>Resend OTP</Text>
                  </TouchableOpacity>
                </>
              )
            ) : (
              renderStep()
            )}
            {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
          </View>

          {isReview && !otpStage ? (
            <TouchableOpacity
              style={[styles.draftBtn, savingDraft && styles.btnDisabled]}
              activeOpacity={0.85}
              onPress={handleSaveDraft}
              disabled={savingDraft || submitting}>
              <Text style={styles.draftBtnText}>
                {savingDraft ? 'Saving Draft…' : 'Save as Draft'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {otpVerified && !otpStage ? (
            <TouchableOpacity
              style={styles.changeAccountBtn}
              activeOpacity={0.7}
              onPress={() => setShowChangeAccount(true)}>
              <Text style={styles.changeAccountText}>Change Account</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.btn, (submitting || sendingOtp || verifyingOtp || savingEmail) && styles.btnDisabled]}
            onPress={
              otpStage
                ? (otpVerified ? handleContinueAfterOtp : handleVerifyOtp)
                : handleContinue
            }
            activeOpacity={0.85}
            disabled={submitting || sendingOtp || verifyingOtp || savingEmail}>
            <Text style={styles.btnText}>
              {otpStage
                ? otpVerified
                  ? (savingEmail ? 'Saving…' : (isEmailValid ? 'Continue to Bank' : 'Enter your email'))
                  : (verifyingOtp ? 'Verifying…' : (isOtpComplete ? 'Verify OTP' : 'Enter OTP'))
                : sendingOtp
                ? 'Sending OTP…'
                : submitting
                ? 'Submitting…'
                : continueLabel}
              {!submitting && !sendingOtp && !verifyingOtp && !savingEmail && !isReview ? '  →' : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Change Account confirmation */}
      <Modal
        visible={showChangeAccount}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowChangeAccount(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change account?</Text>
            <Text style={styles.modalBody}>
              You'll be logged out of your current account and returned to the
              login screen. Any unsaved progress on this form will be lost.
            </Text>
            <TouchableOpacity
              style={styles.modalConfirmBtn}
              onPress={handleChangeAccount}
              activeOpacity={0.85}>
              <Text style={styles.modalConfirmText}>Log Out & Change</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowChangeAccount(false)}
              activeOpacity={0.7}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingBottom: 24 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  terms: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: 8,
    textAlign: 'center',
  },
  termsLink: { color: colors.primary, fontWeight: '600' },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: colors.background,
  },
  btn: {
    height: 54,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  draftBtn: {
    marginTop: 16,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  changeAccountBtn: {
    marginTop: 16,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.error,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeAccountText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.error,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  modalBody: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: 20,
  },
  modalConfirmBtn: {
    height: 50,
    backgroundColor: colors.error,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  modalCancelBtn: {
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  sectionDesc: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
    marginBottom: 20,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    backgroundColor: colors.inputBg,
  },
  otpBoxFilled: {
    borderColor: colors.primary,
  },
  otpBoxError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginBottom: 12,
    textAlign: 'center',
  },
  devOtpSpacing: { marginBottom: 16 },
  resendLink: { alignItems: 'center', marginTop: 4 },
  resendLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});

export default OnboardingScreen;
