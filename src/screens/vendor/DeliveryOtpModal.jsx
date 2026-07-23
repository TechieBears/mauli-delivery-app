import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CloseCircle } from 'iconsax-react-native';
import DevOtpBanner from '../../components/DevOtpBanner';
import { colors } from '../../theme/colors';
import { useUpdateVendorOrderStatus } from '../../hooks/useVendorQueries';
import toast from '../../utils/toast';

const OTP_LENGTH = 6;

/**
 * Pickup-OTP confirmation. Step 1 (assigning the transporter) is done by the
 * caller via PATCH {status:'ready_for_pickup', driver…}, which sends an OTP to
 * the transporter and echoes it back in development. This modal is step 2: the
 * vendor keys in that OTP, submitted via PATCH {status:'ready_for_pickup', otp}
 * to flip the order to ready_for_pickup.
 *
 * Props:
 *  visible     bool
 *  orderId     string
 *  driverPhone string    — transporter's phone the OTP went to (shown masked)
 *  devOtp      string    — OTP echoed by step 1 in dev; shown for reference only
 *  onClose     fn        — dismiss without completing
 *  onVerified  fn        — OTP accepted; order is now ready_for_pickup
 */
const DeliveryOtpModal = ({ visible, orderId, driverPhone, devOtp, onClose, onVerified }) => {
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const inputRefs = useRef([]);
  const { mutate: updateStatus, isPending } = useUpdateVendorOrderStatus();

  // Start from empty boxes each time the modal opens — the vendor keys the OTP
  // in manually (the dev OTP is only displayed above for reference).
  useEffect(() => {
    if (visible) setOtp(Array(OTP_LENGTH).fill(''));
  }, [visible]);

  const handleChange = (text, index) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    setOtp(prev => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

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

  const handleClose = () => {
    setOtp(Array(OTP_LENGTH).fill(''));
    onClose();
  };

  const handleVerify = () => {
    const code = otp.join('');
    if (code.length < OTP_LENGTH) {
      toast.warning('Enter the OTP', `Please enter all ${OTP_LENGTH} digits.`);
      return;
    }
    updateStatus(
      { id: orderId, status: 'ready_for_pickup', otp: code },
      {
        onSuccess: () => {
          setOtp(Array(OTP_LENGTH).fill(''));
          onVerified();
        },
        onError: e => toast.error('Verification failed', e?.message),
      },
    );
  };

  const digits = String(driverPhone ?? '').replace(/\D/g, '');
  const maskedPhone = digits.length >= 4
    ? `${'•'.repeat(Math.max(digits.length - 4, 0))}${digits.slice(-4)}`
    : 'the transporter';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Confirm Pickup</Text>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
              <CloseCircle size={24} color={colors.textMuted} variant="Linear" />
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            OTP sent to <Text style={styles.phone}>{maskedPhone}</Text>
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
                ref={el => (inputRefs.current[i] = el)}
                style={[styles.box, digit ? styles.boxFilled : null]}
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

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleVerify}
            disabled={isPending}
            activeOpacity={0.85}>
            {isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.primaryBtnText}>Verify & Confirm Pickup</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  hint: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 14 },
  phone: { fontWeight: '700', color: colors.text },
  devOtpSpacing: { marginBottom: 16 },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
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
    color: colors.text,
    backgroundColor: '#fafafa',
  },
  boxFilled: {
    borderColor: colors.primary,
    backgroundColor: '#f0fdf4',
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default DeliveryOtpModal;
