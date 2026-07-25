import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  ScrollView,
} from 'react-native';
import { X, User, UserPlus, CheckCircle } from 'phosphor-react-native';
import DevOtpBanner from '../../components/DevOtpBanner';
import {
  useSendDeliveryOtp,
  useVerifyDeliveryOtp,
} from '../../hooks/useTransporterQueries';
import { customerName, customerPhone, STATUS_ACCEPTED } from './orderStatus';
import { colors } from '../../theme/colors';
import toast from '../../utils/toast';
import { fetchTransporterOrders } from '../../services/transporterService';
import LocationTracking from '../../services/LocationTrackingService';

const OTP_LENGTH = 6;

// Indian mobile numbers are 10 digits; the country code is added separately by
// the backend/SMS gateway, so only the bare number is collected here.
const isValidPhone = phone => /^\d{10}$/.test(String(phone).replace(/\D/g, ''));

// ─── Step 1: who is receiving ────────────────────────────────────────────────

const ReceiverStep = ({ order, mode, setMode, rep, setRep, onSend, sending }) => {
  const customer = order?.customerId;
  const ownerName = customerName(customer);
  // The OTP is texted to whatever number is submitted, so the owner path must
  // send the customer's own number — digits only, without the country code.
  const ownerPhone = String(customer?.userId?.phone ?? '').replace(/\D/g, '');

  const isOwner = mode === 'owner';
  const ownerReady = !!ownerName && isValidPhone(ownerPhone);
  const repReady = rep.name.trim().length > 0 && isValidPhone(rep.phone);
  const canSend = isOwner ? ownerReady : repReady;

  return (
    <>
      <Text style={styles.stepHint}>
        Confirm who is taking delivery. An OTP will be sent to their number.
      </Text>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, isOwner && styles.tabOn]}
          onPress={() => setMode('owner')}
          activeOpacity={0.8}>
          <User size={16} color={isOwner ? colors.surface : colors.textSecondary} weight="fill" />
          <Text style={[styles.tabText, isOwner && styles.tabTextOn]}>Owner</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, !isOwner && styles.tabOn]}
          onPress={() => setMode('rep')}
          activeOpacity={0.8}>
          <UserPlus size={16} color={!isOwner ? colors.surface : colors.textSecondary} weight="fill" />
          <Text style={[styles.tabText, !isOwner && styles.tabTextOn]}>
            Representative
          </Text>
        </TouchableOpacity>
      </View>

      {isOwner ? (
        <View style={styles.section}>
          <Text style={styles.label}>Name</Text>
          <View style={styles.readonlyBox}>
            <Text style={styles.readonlyText}>{ownerName || '—'}</Text>
          </View>

          <Text style={styles.label}>Mobile number</Text>
          <View style={styles.readonlyBox}>
            <Text style={styles.readonlyText}>
              {customerPhone(customer) || '—'}
            </Text>
          </View>

          {!ownerReady ? (
            <Text style={styles.warn}>
              This customer has no valid name or mobile number on file. Use the
              Representative tab instead.
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.label}>Representative name</Text>
          <TextInput
            style={styles.input}
            value={rep.name}
            onChangeText={name => setRep(p => ({ ...p, name }))}
            placeholder="Full name"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <Text style={styles.label}>Representative mobile number</Text>
          <TextInput
            style={styles.input}
            value={rep.phone}
            onChangeText={phone =>
              setRep(p => ({ ...p, phone: phone.replace(/\D/g, '').slice(0, 10) }))
            }
            placeholder="10-digit number"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={10}
          />
        </View>
      )}

      {/* Only enabled once both fields are valid. */}
      <TouchableOpacity
        style={[styles.primaryBtn, (!canSend || sending) && styles.btnDisabled]}
        onPress={onSend}
        disabled={!canSend || sending}
        activeOpacity={0.85}>
        {sending ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Text style={styles.primaryBtnText}>Validate</Text>
        )}
      </TouchableOpacity>
    </>
  );
};

// ─── Step 2: OTP ─────────────────────────────────────────────────────────────

const OtpStep = ({ receiver, devOtp, otp, setOtp, onVerify, onResend, verifying, sending }) => {
  const inputs = useRef([]);

  const handleChange = (text, index) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    setOtp(prev => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = ({ nativeEvent }, index) => {
    if (nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const complete = otp.every(d => d);

  return (
    <>
      <Text style={styles.stepHint}>
        A 6-digit code was sent to{' '}
        <Text style={styles.strong}>{receiver.name}</Text> on{' '}
        <Text style={styles.strong}>{receiver.phone}</Text>.
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
            ref={el => (inputs.current[i] = el)}
            style={[styles.otpBox, digit && styles.otpBoxFilled]}
            value={digit}
            onChangeText={t => handleChange(t, i)}
            onKeyPress={e => handleKeyPress(e, i)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, (!complete || verifying) && styles.btnDisabled]}
        onPress={onVerify}
        disabled={!complete || verifying}
        activeOpacity={0.85}>
        {verifying ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Text style={styles.primaryBtnText}>Confirm delivery</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.resendBtn}
        onPress={onResend}
        disabled={sending}
        activeOpacity={0.7}>
        <Text style={styles.resendText}>
          {sending ? 'Sending…' : 'Resend OTP'}
        </Text>
      </TouchableOpacity>
    </>
  );
};

// ─── Modal ───────────────────────────────────────────────────────────────────

/**
 * Two-step delivery handover, opened from the order detail screen while the
 * order is 'intransit'.
 *
 *  1. Who is receiving — the Owner (name/number pulled from the order, read
 *     only) or a Representative the transporter types in.
 *  2. OTP — sent to that number, verified to flip the order to 'delivered'.
 *
 * Both endpoints require receiverName + receiverPhone, so the chosen receiver is
 * carried through to the verify call as well.
 */
const DeliveryValidationModal = ({ visible, order, onClose, onDelivered }) => {
  const [step, setStep] = useState('receiver');
  const [mode, setMode] = useState('owner');
  const [rep, setRep] = useState({ name: '', phone: '' });
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [devOtp, setDevOtp] = useState('');

  const { mutate: send, isPending: sending } = useSendDeliveryOtp();
  const { mutate: verify, isPending: verifying } = useVerifyDeliveryOtp();

  // Reset everything each time the modal is reopened.
  useEffect(() => {
    if (visible) {
      setStep('receiver');
      setMode('owner');
      setRep({ name: '', phone: '' });
      setOtp(Array(OTP_LENGTH).fill(''));
      setDevOtp('');
    }
  }, [visible]);

  const customer = order?.customerId;
  const receiver = useMemo(() => {
    if (mode === 'owner') {
      return {
        name: customerName(customer),
        phone: String(customer?.userId?.phone ?? '').replace(/\D/g, ''),
      };
    }
    return { name: rep.name.trim(), phone: rep.phone };
  }, [mode, customer, rep]);

  const requestOtp = () =>
    send(
      {
        id: order?._id,
        receiverName: receiver.name,
        receiverPhone: receiver.phone,
      },
      {
        onSuccess: res => {
          // Development builds echo the OTP back so it can be read without SMS.
          setDevOtp(res?.data?.otp ?? '');
          setOtp(Array(OTP_LENGTH).fill(''));
          setStep('otp');
          toast.success('OTP sent', `Code sent to ${receiver.phone}.`);
        },
        onError: err =>
          toast.error('Could not send OTP', err?.message ?? 'Please try again.'),
      },
    );

  // After a delivery, tracking must stop only once the vehicle has no other
  // 'intransit' order left — a single vehicle carries a whole pickup batch.
  const stopTrackingIfLastDelivery = async () => {
    // Only relevant if we're tracking; and only this vehicle's orders matter.
    if (!LocationTracking.isTracking()) return;
    const vehicleNo =
      order?.deliveryBoy?.vehicleNo ?? LocationTracking.getVehicleNo();
    try {
      const res = await fetchTransporterOrders(STATUS_ACCEPTED);
      const stillInTransit = (Array.isArray(res?.data) ? res.data : []).filter(
        o => (o?.deliveryBoy?.vehicleNo ?? vehicleNo) === vehicleNo,
      );
      if (stillInTransit.length === 0) {
        LocationTracking.stop();
      }
    } catch {
      // If we can't confirm, err toward stopping — the backend rejects stray
      // writes anyway, and the watcher restarts on the next pickup.
      LocationTracking.stop();
    }
  };

  const submitOtp = () =>
    verify(
      {
        id: order?._id,
        otp: otp.join(''),
        receiverName: receiver.name,
        receiverPhone: receiver.phone,
      },
      {
        onSuccess: () => {
          stopTrackingIfLastDelivery();
          toast.success('Delivered', `Handed over to ${receiver.name}.`);
          onDelivered?.();
        },
        onError: err =>
          toast.error('Verification failed', err?.message ?? 'Check the code and try again.'),
      },
    );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <CheckCircle size={20} color={colors.primary} weight="fill" />
            </View>
            <Text style={styles.title}>
              {step === 'receiver' ? 'Validate customer' : 'Enter delivery OTP'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={colors.textSecondary} weight="bold" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {step === 'receiver' ? (
              <ReceiverStep
                order={order}
                mode={mode}
                setMode={setMode}
                rep={rep}
                setRep={setRep}
                onSend={requestOtp}
                sending={sending}
              />
            ) : (
              <OtpStep
                receiver={receiver}
                devOtp={devOtp}
                otp={otp}
                setOtp={setOtp}
                onVerify={submitOtp}
                onResend={requestOtp}
                verifying={verifying}
                sending={sending}
              />
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.text },

  body: { padding: 20, paddingBottom: 32 },
  stepHint: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginBottom: 18 },
  strong: { fontWeight: '800', color: colors.text },

  tabs: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
  },
  tabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  tabTextOn: { color: colors.surface },

  section: { marginBottom: 8 },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  readonlyBox: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  readonlyText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
    marginBottom: 16,
  },
  warn: { fontSize: 13, color: '#a16207', lineHeight: 19, marginBottom: 8 },

  devOtpSpacing: { marginBottom: 18 },

  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  otpBox: {
    width: 46,
    height: 56,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.inputBg,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  otpBoxFilled: { borderColor: colors.primary, backgroundColor: colors.primaryLight },

  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: { backgroundColor: colors.border },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: colors.surface },
  resendBtn: { paddingVertical: 14, alignItems: 'center' },
  resendText: { fontSize: 14, fontWeight: '700', color: colors.primary },
});

export default DeliveryValidationModal;
