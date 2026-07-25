import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DocumentText1 } from 'iconsax-react-native';
import AppHeader from '../../components/AppHeader';
import DocumentViewer from '../../components/DocumentViewer';
import DevOtpBanner from '../../components/DevOtpBanner';
import { colors } from '../../theme/colors';
import toast from '../../utils/toast';
import { toHttpsUrl, isPdfUrl } from '../../utils/imageUrl';
import {
  useCustomerProfile,
  useSendCustomerAgreementOtp,
  useVerifyCustomerAgreementOtp,
} from '../../hooks/useCustomerQueries';
import logger from '../../utils/logger';

const OTP_LENGTH = 6;

// Shown to an approved customer who has not yet accepted the stamp-paper
// agreement. They read the agreement (stamp paper no. + document), tick the
// consent box, request an OTP, and confirm it in a modal. Verifying the OTP
// flips agreementAccepted on the backend; onAccepted() then advances the app.
const CustomerAgreementScreen = ({ navigation, onAccepted }) => {
  const { data: profileRes, isLoading, error } = useCustomerProfile();
  const { mutateAsync: sendOtp, isPending: sending } = useSendCustomerAgreementOtp();
  const { mutateAsync: verifyOtp, isPending: verifying } = useVerifyCustomerAgreementOtp();

  const customer = useMemo(() => profileRes?.data ?? {}, [profileRes]);

  const [agreed, setAgreed] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [otpError, setOtpError] = useState('');
  const [viewerVisible, setViewerVisible] = useState(false);
  // In development the backend returns the OTP in the send-otp response — show
  // it in the modal (same convention as the login/onboarding OTP flow).
  const [devOtp, setDevOtp] = useState(null);
  const inputRefs = useRef([]);

  const user = customer.userId ?? {};
  const stampPaperNo = customer.stampPaperNo;
  const stampPaperFile = customer.stampPaperFile;
  const stampIsPdf = isPdfUrl(stampPaperFile);
  const customerName = user.name ?? 'Customer';

  const handleRequestOtp = async () => {
    if (!agreed) {
      toast.info('Please agree', 'Tick the consent checkbox to continue.');
      return;
    }
    try {
      const res = await sendOtp();
      // In dev the backend returns the OTP directly (same as the login flow).
      const receivedOtp = res?.data?.otp ?? null;
      setDevOtp(receivedOtp);
      if (receivedOtp) {
        logger.log('[CustomerAgreement] dev OTP:', receivedOtp);
      }
      setOtp(Array(OTP_LENGTH).fill(''));
      setOtpError('');
      setOtpModalVisible(true);
      toast.success('OTP sent', 'Enter the 6-digit code sent to your phone.');
      setTimeout(() => inputRefs.current[0]?.focus(), 250);
    } catch (err) {
      if (err?.status !== 401) {
        toast.error('Could not send OTP', err?.message ?? 'Please try again.');
      }
    }
  };

  const handleOtpChange = (text, index) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    setOtp(prev => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    setOtpError('');
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      setOtpError('Enter the full 6-digit OTP.');
      return;
    }
    try {
      await verifyOtp({ otp: code });
      setOtpModalVisible(false);
      toast.success('Agreement accepted', 'Thank you for confirming.');
      if (onAccepted) {
        onAccepted();
      } else {
        // Agreement is done, but frequent-item selection is still required
        // before the dashboard → send them there next, not to CustomerApp.
        navigation?.reset?.({ index: 0, routes: [{ name: 'FrequentItems' }] });
      }
    } catch (err) {
      if (err?.status !== 401) {
        setOtpError(err?.message ?? 'Invalid OTP. Please try again.');
      }
    }
  };

  const renderBody = () => {
    if (isLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      );
    }
    if (error && error?.status !== 401) {
      return (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            Couldn't load your agreement. Please try again.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>SERVICE AGREEMENT</Text>
          <Text style={styles.title}>Stamp Paper Agreement</Text>
          <Text style={styles.subtitle}>
            {customerName}, please review the agreement below and provide your
            consent to continue.
          </Text>

          <View style={styles.stampRow}>
            <Text style={styles.stampLabel}>Stamp Paper No.</Text>
            <Text style={styles.stampValue}>
              {stampPaperNo || 'Not available'}
            </Text>
          </View>

          {stampPaperFile ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setViewerVisible(true)}>
              {stampIsPdf ? (
                <View style={styles.pdfPreview}>
                  <DocumentText1 size={40} color={colors.primary} variant="Bold" />
                  <Text style={styles.pdfPreviewText}>Agreement document (PDF)</Text>
                </View>
              ) : (
                <Image
                  source={{ uri: toHttpsUrl(stampPaperFile) }}
                  style={styles.stampImage}
                  resizeMode="contain"
                />
              )}
              <Text style={styles.viewFullText}>Tap to view full screen</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.stampPlaceholder}>
              <Text style={styles.stampPlaceholderText}>
                No agreement document attached yet.
              </Text>
            </View>
          )}

          <Text style={styles.agreementBody}>
            By accepting this agreement you confirm that you have read and agree
            to the terms recorded on the stamp paper above, including the credit,
            payment and service conditions governing your account with Mauli
            Mart.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setAgreed(v => !v)}
          activeOpacity={0.8}>
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed ? <Text style={styles.checkboxTick}>✓</Text> : null}
          </View>
          <Text style={styles.checkText}>
            I have read and agree to the terms of this agreement.
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <AppHeader title="Agreement" />

      {renderBody()}

      {!isLoading && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!agreed || sending) && styles.submitBtnDisabled,
            ]}
            onPress={handleRequestOtp}
            disabled={!agreed || sending}
            activeOpacity={0.85}>
            <Text style={styles.submitBtnText}>
              {sending ? 'Sending OTP...' : 'Agree & Submit'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* OTP consent modal */}
      <Modal
        visible={otpModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOtpModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm your consent</Text>
            <Text style={styles.modalSubtitle}>
              Enter the 6-digit OTP sent to your registered phone number to
              accept the agreement.
            </Text>

            <DevOtpBanner
              otp={devOtp}
              length={OTP_LENGTH}
              onFill={setOtp}
              style={styles.devOtpSpacing}
            />

            <View style={styles.otpRow}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={ref => (inputRefs.current[index] = ref)}
                  style={[styles.otpInput, otpError && styles.otpInputError]}
                  value={digit}
                  onChangeText={text => handleOtpChange(text, index)}
                  onKeyPress={e => handleOtpKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                  returnKeyType="done"
                />
              ))}
            </View>

            {otpError ? (
              <Text style={styles.otpErrorText}>{otpError}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.modalBtn, verifying && styles.submitBtnDisabled]}
              onPress={handleVerify}
              disabled={verifying}
              activeOpacity={0.85}>
              <Text style={styles.modalBtnText}>
                {verifying ? 'Verifying...' : 'Verify & Accept'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={handleRequestOtp}
              disabled={sending}
              activeOpacity={0.7}>
              <Text style={styles.modalCancelText}>
                {sending ? 'Resending...' : 'Resend OTP'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setOtpModalVisible(false)}
              activeOpacity={0.7}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Full-screen agreement document viewer (PDF or image) */}
      <DocumentViewer
        visible={viewerVisible}
        uri={stampPaperFile}
        title="Stamp Paper Agreement"
        onClose={() => setViewerVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.primary,
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  stampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 14,
  },
  stampLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  stampValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  stampImage: {
    width: '100%',
    height: 240,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  pdfPreview: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pdfPreviewText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  viewFullText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  stampPlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  stampPlaceholderText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  agreementBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    paddingHorizontal: 2,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxTick: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 16,
  },
  checkText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 22,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 18,
  },
  devOtpSpacing: { marginBottom: 16 },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  otpInput: {
    width: 44,
    height: 52,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    backgroundColor: '#f9fafb',
  },
  otpInputError: {
    borderColor: '#dc2626',
  },
  otpErrorText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 6,
    marginBottom: 2,
  },
  modalBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  modalCancel: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  modalClose: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});

export default CustomerAgreementScreen;
