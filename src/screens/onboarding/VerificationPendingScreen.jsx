import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MauliLogo } from '../../assets/images';
import useAppStore from '../../store/useAppStore';
import { colors } from '../../theme/colors';

// Status-specific copy. `rejected` uses distinct wording (and a red accent) so
// the vendor clearly knows they were rejected, not just waiting on review.
const STATUS_CONTENT = {
  rejected: {
    badge: 'APPLICATION REJECTED',
    badgeStyle: 'badgeRejected',
    title: 'Your application was rejected',
    body:
      'Unfortunately your KYC verification was not approved. Please contact ' +
      'support to understand the reason and re-submit your details.',
  },
  onReview: {
    badge: 'UNDER REVIEW',
    badgeStyle: 'badgeReview',
    title: 'Your account is under verification',
    body:
      "We're reviewing your KYC documents. This usually takes 24–48 business " +
      "hours. We'll notify you once your vendor account is approved.",
  },
};

const VerificationPendingScreen = ({ navigation, route }) => {
  const logout = useAppStore(state => state.logout);
  const storeKycStatus = useAppStore(state => state.kycStatus);

  // Prefer an explicit route param, else fall back to the store.
  const kycStatus = route?.params?.kycStatus ?? storeKycStatus;
  const content = kycStatus === 'rejected' ? STATUS_CONTENT.rejected : STATUS_CONTENT.onReview;

  const handleBackToLogin = () => {
    logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      <View style={styles.content}>
        <View style={styles.logoWrap}>
          <Image source={MauliLogo} style={styles.logo} resizeMode="contain" />
        </View>

        <View style={[styles.badge, styles[content.badgeStyle]]}>
          <Text style={[styles.badgeText, kycStatus === 'rejected' && styles.badgeTextRejected]}>
            {content.badge}
          </Text>
        </View>

        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.body}>{content.body}</Text>

        <TouchableOpacity
          style={styles.btnOutline}
          onPress={handleBackToLogin}
          activeOpacity={0.85}>
          <Text style={styles.btnOutlineText}>Go back to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 28,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  badgeReview: {
    backgroundColor: '#fef9c3',
  },
  badgeRejected: {
    backgroundColor: '#fee2e2',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#a16207',
  },
  badgeTextRejected: {
    color: '#dc2626',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 30,
  },
  body: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },
  btn: {
    height: 52,
    paddingHorizontal: 32,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  btnOutline: {
    marginTop: 12,
    height: 52,
    paddingHorizontal: 32,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlineText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});

export default VerificationPendingScreen;
