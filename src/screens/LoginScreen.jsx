import React from 'react';
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
import { useForm, Controller } from 'react-hook-form';
import Svg, { Path } from 'react-native-svg';
import useAppStore from '../store/useAppStore';
import { useSendOtp } from '../hooks/useAuthQueries';

// Single-role app: there is no role picker to read from, so every request
// registers/authenticates the user as a transporter.
const ROLE = 'transporter';

const LoginScreen = ({ navigation }) => {
  const role = ROLE;
  const setRole = useAppStore(state => state.setRole);
  const { mutateAsync: sendOtp, isPending: loading, error } = useSendOtp();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { phone: '', countryCode: '+91' } });

  const onSubmit = async ({ phone, countryCode }) => {
    setRole(role);

    try {
      const res = await sendOtp({ phone, role, countryCode });

      const devOtp = res?.data?.otp ?? null;
      navigation.navigate('Otp', { phone, role, countryCode, devOtp });
    } catch (err) {
      console.error('Error sending OTP:', err);
    }
  };

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

          {/* Role pill */}
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>Transporter Login</Text>
          </View>

          <Text style={styles.heading}>Enter your{'\n'}mobile number</Text>
          <Text style={styles.subheading}>
            We'll send a one-time password to verify your number.
          </Text>

          {/* Phone field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Mobile Number</Text>
            <View style={[styles.inputRow, errors.phone && styles.inputRowError]}>
              <Controller
                control={control}
                name="countryCode"
                rules={{
                  required: true,
                  pattern: { value: /^\+[1-9]\d{0,3}$/, message: 'Invalid code' },
                }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.countryCodeInput}
                    value={value}
                    onChangeText={text => {
                      // keep a leading '+' and digits only
                      const cleaned = '+' + text.replace(/[^0-9]/g, '');
                      onChange(cleaned);
                    }}
                    keyboardType="phone-pad"
                    maxLength={5}
                  />
                )}
              />
              <View style={styles.divider} />
              <Controller
                control={control}
                name="phone"
                rules={{
                  required: 'Phone number is required',
                  pattern: {
                    value: /^[0-9]{10}$/,
                    message: 'Enter a valid 10-digit mobile number',
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="98765 43210"
                    placeholderTextColor="#9ca3af"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit(onSubmit)}
                  />
                )}
              />
            </View>
            {errors.phone && (
              <Text style={styles.errorText}>{errors.phone.message}</Text>
            )}
          </View>

          {error ? <Text style={styles.errorText}>{error?.message ?? 'Failed to send OTP. Try again.'}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSubmit(onSubmit)}
            activeOpacity={0.8}
            disabled={loading}>
            <Text style={styles.btnText}>
              {loading ? 'Sending OTP…' : 'Get OTP'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.terms}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>Terms & Privacy Policy</Text>
          </Text>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>New Transporter? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Onboarding')}
              activeOpacity={0.7}>
              <Text style={styles.registerLink}>Register here</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },

  rolePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
    backgroundColor: '#dcfce7',
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#16a34a',
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

  fieldGroup: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 56,
    gap: 10,
    backgroundColor: '#fafafa',
  },
  inputRowError: { borderColor: '#ef4444' },
  countryCodeInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    minWidth: 44,
    paddingVertical: 0,
    textAlign: 'center',
  },
  divider: { width: 1, height: 22, backgroundColor: '#e5e7eb' },
  input: { flex: 1, fontSize: 16, color: '#111827', letterSpacing: 0.5 },
  errorText: { fontSize: 12, color: '#ef4444', marginTop: 6, marginLeft: 2 },

  btn: {
    height: 54,
    backgroundColor: '#2e7d32',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },

  terms: { fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 18 },
  termsLink: { color: '#2e7d32', fontWeight: '600' },

  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  registerText: { fontSize: 14, color: '#374151' },
  registerLink: { fontSize: 14, fontWeight: '700', color: '#2e7d32' },
});

export default LoginScreen;
