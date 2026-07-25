import React, { useRef, useState, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DevOtpBanner from '../components/DevOtpBanner';
import useAppStore from '../store/useAppStore';
import { useSendOtp, useVerifyOtp } from '../hooks/useAuthQueries';
import { fetchVendorProfile } from '../services/vendorService';
import { fetchCustomerProfile } from '../services/customerService';
import { fetchTransporterProfile } from '../services/transporterService';
import { getResumeStep, isOnboardingIncomplete } from '../utils/onboardingProgress';
import logger from '../utils/logger';

const OTP_LENGTH = 6;

const OtpScreen = ({ navigation, route }) => {
  const phone = route?.params?.phone ?? '';
  const role = route?.params?.role ?? 'customer';
  const countryCode = route?.params?.countryCode ?? '+91';
  const devOtp = route?.params?.devOtp ?? null;

  const login = useAppStore(state => state.login);
  const { mutateAsync: verifyOtp, isPending: verifying, error: apiError } = useVerifyOtp();
  const { mutateAsync: sendOtp } = useSendOtp();

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [resendTimer, setResendTimer] = useState(30);
  const [validationError, setValidationError] = useState('');

  // Show local validation error first, fall back to API error message
  const displayError = validationError || apiError?.message;

  const inputRefs = useRef([]);

  // Start resend countdown
  React.useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => {
      setResendTimer(t => {
        if (t <= 1) { clearInterval(id); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const handleChange = useCallback((text, index) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    setValidationError('');

    setOtp(prev => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleKeyPress = useCallback(({ nativeEvent }, index) => {
    if (nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setOtp(prev => {
        const next = [...prev];
        next[index - 1] = '';
        return next;
      });
    }
  }, [otp]);





  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < OTP_LENGTH) {
      setValidationError(`Please enter all ${OTP_LENGTH} digits`);
      return;
    }
    setValidationError('');
    try {
      const res = await verifyOtp({ phone, otp: code });

      logger.log('[Otp] verify-otp response:', JSON.stringify(res, null, 2));

      const { accessToken, refreshToken, user, profile } = res.data;

      login({
        accessToken,
        refreshToken,
        user,
        vendorId: profile?.vendorId ?? null,
        transporterId: profile?.transporterId ?? null,
        kycStatus: profile?.kycStatus ?? null,
        isPricingComplete: profile?.isPricingComplete ?? false,
      });

      const userRole = user?.role ?? role;
      const kycStatus = profile?.kycStatus;

      if (userRole === 'transporter') {
        // GET /transporter/profile — the transporter's own endpoint (never the
        // customer one). Returns the Transporter doc with `userId` populated.
        let transporterProfile = null;
        try {
          const profileRes = await fetchTransporterProfile();
          transporterProfile = profileRes?.data;
        } catch (_) { /* logged in api.js */ }

        logger.log('[Otp] transporter profile:', JSON.stringify(transporterProfile, null, 2));

        // verify-otp returns kycStatus but not email, so the KYC form is gated
        // on status, not on a missing email:
        //   drafted / pending → registration form (name/email/licence/vehicle)
        //   onReview          → under review
        //   rejected          → rejected message
        //   approved          → home
        // Submitting the form leaves kycStatus at 'pending' — only an admin
        // moves it to 'approved', which is what actually opens the app.
        // Prefer the profile's status: it's read fresh, so an approval granted
        // since the token was issued is picked up here.
        const transporterKyc = transporterProfile?.kycStatus ?? kycStatus;

        logger.log('[Otp] transporter routing decision', {
          kycStatusFromOtp: kycStatus,
          kycStatusFromProfile: transporterProfile?.kycStatus,
          resolved: transporterKyc,
          isActive: transporterProfile?.isActive,
          hasLicense: !!transporterProfile?.drivingLicenseNo,
          vehicleCount: transporterProfile?.vehicles?.length ?? 0,
          incomplete: isOnboardingIncomplete(transporterKyc),
        });

        if (transporterKyc === 'approved') {
          navigation.reset({ index: 0, routes: [{ name: 'TransporterApp' }] });
        } else if (isOnboardingIncomplete(transporterKyc)) {
          navigation.reset({ index: 0, routes: [{ name: 'TransporterKyc' }] });
        } else {
          navigation.reset({ index: 0, routes: [{ name: 'VerificationPending', params: { kycStatus: transporterKyc } }] });
        }
      } else if (userRole === 'vendor') {
        // Fetch + log the full vendor profile so we can inspect what the
        // backend returns (and why routing goes where it goes).
        let vendorProfile = null;
        try {
          const profileRes = await fetchVendorProfile();
          vendorProfile = profileRes?.data;
        } catch (_) { /* logged in vendorService */ }

        logger.log('[Otp] routing decision', {
          kycStatus,
          isPricingComplete: profile?.isPricingComplete,
          incomplete: isOnboardingIncomplete(kycStatus),
        });

        if (kycStatus === 'approved') {
          navigation.reset({ index: 0, routes: [{ name: 'VendorApp' }] });
        } else if (isOnboardingIncomplete(kycStatus)) {
          // drafted / pending → resume the onboarding form where they left off.
          const resumeStep = getResumeStep(vendorProfile);
          navigation.reset({ index: 0, routes: [{ name: 'Onboarding', params: { phone, role: userRole, resumeStep } }] });
        } else {
          // onReview → under review; rejected → rejected message.
          navigation.reset({ index: 0, routes: [{ name: 'VerificationPending', params: { kycStatus } }] });
        }
      } else {
        // Customer routing mirrors the vendor's explicit branches, plus the
        // stamp-paper agreement gate:
        //   drafted / pending → resume the onboarding form
        //   onReview          → VerificationPending ("under review") — mandatory
        //   rejected          → VerificationPending (rejected message)
        //   approved + not accepted → CustomerAgreement (stamp paper + OTP)
        //   approved + accepted     → customer app
        let customerProfile = null;
        try {
          const profileRes = await fetchCustomerProfile();
          customerProfile = profileRes?.data;
        } catch (_) { /* logged in customerService */ }

        logger.log('[Otp] customer routing decision', {
          kycStatus,
          agreementAccepted: customerProfile?.agreementAccepted,
          incomplete: isOnboardingIncomplete(kycStatus),
        });

        if (kycStatus === 'approved') {
          if (customerProfile?.agreementAccepted) {
            navigation.reset({ index: 0, routes: [{ name: 'CustomerApp' }] });
          } else {
            // Approved but hasn't signed the stamp-paper agreement yet → gate
            // them on the agreement screen (mandatory OTP) before the app.
            navigation.reset({ index: 0, routes: [{ name: 'CustomerAgreement' }] });
          }
        } else if (isOnboardingIncomplete(kycStatus)) {
          const resumeStep = getResumeStep(customerProfile);
          navigation.reset({ index: 0, routes: [{ name: 'Onboarding', params: { phone, role: userRole, resumeStep } }] });
        } else {
          // onReview → under review; rejected → rejected message.
          navigation.reset({ index: 0, routes: [{ name: 'VerificationPending', params: { kycStatus } }] });
        }
      }
    } catch (err) {
      // 403 = account exists but is under review — send to pending screen
    logger.log("🚀 ~ OtpScreen.jsx:78 ~ handleVerify ~ err:", err)

      if (err?.status === 403) {
        navigation.reset({ index: 0, routes: [{ name: 'VerificationPending' }] });
      }
      // all other errors are shown via apiError from RTK Query
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setOtp(Array(OTP_LENGTH).fill(''));
    setValidationError('');
    setResendTimer(30);
    inputRefs.current[0]?.focus();
    try {
      await sendOtp({ phone, role, countryCode });
    } catch (_) {}
  };

  const maskedPhone = phone
    ? `+91 ${'•'.repeat(6)}${phone.slice(-4)}`
    : '';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Heading */}
          <Text style={styles.heading}>Verify your{'\n'}number</Text>
          <Text style={styles.subheading}>
            OTP sent to{' '}
            <Text style={styles.phone}>{maskedPhone}</Text>
          </Text>

          <DevOtpBanner
            otp={devOtp}
            length={OTP_LENGTH}
            onFill={setOtp}
            style={styles.devOtpSpacing}
          />

          {/* OTP boxes */}
          <View style={styles.otpRow}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={el => (inputRefs.current[i] = el)}
                style={[
                  styles.box,
                  digit ? styles.boxFilled : null,
                  displayError ? styles.boxError : null,
                ]}
                value={digit}
                onChangeText={text => handleChange(text, i)}
                onKeyPress={e => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={1}
                textContentType="oneTimeCode"
                selectTextOnFocus
              />
            ))}
          </View>

          {displayError ? <Text style={styles.errorText}>{displayError}</Text> : null}

          {/* Verify button */}
          <TouchableOpacity
            style={[styles.btn, verifying && styles.btnDisabled]}
            onPress={handleVerify}
            activeOpacity={0.8}
            disabled={verifying}>
            <Text style={styles.btnText}>
              {verifying ? 'Verifying…' : otp.join('').length === OTP_LENGTH ? 'Verify & Continue' : 'Enter OTP'}
            </Text>
          </TouchableOpacity>

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Didn't receive the OTP? </Text>
            <TouchableOpacity onPress={handleResend} disabled={resendTimer > 0}>
              <Text
                style={[
                  styles.resendLink,
                  resendTimer > 0 && styles.resendDisabled,
                ]}>
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },

  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 36,
    marginBottom: 10,
  },
  subheading: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 21,
    marginBottom: 36,
  },
  phone: {
    fontWeight: '700',
    color: '#111827',
  },

  /* OTP boxes */
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  box: {
    flex: 1,
    height: 56,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    backgroundColor: '#fafafa',
  },
  boxFilled: {
    borderColor: '#2e7d32',
    backgroundColor: '#f0fdf4',
  },
  boxError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
  },

  /* button */
  btn: {
    height: 54,
    backgroundColor: '#2e7d32',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },

  /* resend */
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  resendLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2e7d32',
  },
  resendDisabled: {
    color: '#9ca3af',
  },
  devOtpSpacing: { marginBottom: 20 },
});

export default OtpScreen;
