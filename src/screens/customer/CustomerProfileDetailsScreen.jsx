import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Profile2User,
  Sms,
  Call,
  Location,
  Bank,
  SecurityCard,
  Barcode,
  CardPos,
  TickCircle,
  DocumentText1,
} from 'iconsax-react-native';
import useAppStore from '../../store/useAppStore';
import { useCustomerProfile, useCustomerKycStatus } from '../../hooks/useCustomerQueries';
import { isOnboardingIncomplete, getResumeStep } from '../../utils/onboardingProgress';
import { colors } from '../../theme/colors';
import AppHeader from '../../components/AppHeader';

const AVATAR_URI = 'https://api.dicebear.com/9.x/avataaars/png?seed=Amit&backgroundColor=b6e3f4';

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIcon}>{icon}</View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const KycRow = ({ icon, label, last }) => (
  <View style={[styles.kycRow, !last && styles.kycRowBorder]}>
    <View style={styles.infoIcon}>{icon}</View>
    <Text style={styles.kycLabel}>{label}</Text>
    <View style={styles.verifiedChip}>
      <TickCircle size={13} color="#166534" variant="Bold" />
      <Text style={styles.verifiedText}>Verified</Text>
    </View>
  </View>
);

const SectionTitle = ({ title }) => (
  <Text style={styles.sectionTitle}>{title}</Text>
);

const CustomerProfileDetailsScreen = ({ navigation }) => {
  const profile = useAppStore(state => state.profile);
  const user = useAppStore(state => state.user);
  const setKycStatus = useAppStore(state => state.setKycStatus);

  // kyc-status returns the status string directly in `data`.
  const { data: kycStatusRes, isLoading: loadingKyc, error: kycError } = useCustomerKycStatus();
  const kycStatus = kycStatusRes?.data;

  // The customer profile is needed both to display an approved customer's
  // details and to derive the resume step for an incomplete one.
  const needsProfile = kycStatus === 'approved' || isOnboardingIncomplete(kycStatus);
  const { data: customerProfileRes } = useCustomerProfile(needsProfile);
  const customer = customerProfileRes?.data;

  // Route away from this screen based on KYC status:
  //  - drafted / pending → resume the onboarding form where they left off
  //  - onReview / rejected → account is under review
  //  - approved → stay here and show the details
  useEffect(() => {
    if (!kycStatus) return;
    if (isOnboardingIncomplete(kycStatus)) {
      if (!customer) return; // wait for the profile so we can derive the resume step
      navigation.replace('Onboarding', {
        role: 'customer',
        phone: user?.phone ?? profile?.phone ?? '',
        resumeStep: getResumeStep(customer),
      });
    } else if (kycStatus !== 'approved') {
      // onReview → under review; rejected → rejected. Keep the real status so
      // the VerificationPending screen can show the right message.
      setKycStatus(kycStatus);
      navigation.replace('VerificationPending', { kycStatus });
    }
  }, [kycStatus, customer, navigation, profile, user, setKycStatus]);

  // Couldn't determine status (401 already redirects globally) — show a message
  // instead of hanging on a spinner forever.
  if (kycError && kycError?.status !== 401) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <AppHeader leftIcon="back" title="Mauli Mart" rightIcon="bell" onLeftPress={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={styles.errorText}>Couldn't load your profile. Please try again.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // While loading, or while redirecting a non-approved customer, show a spinner
  // instead of briefly flashing the (possibly stale) details.
  if (loadingKyc || kycStatus !== 'approved') {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <AppHeader leftIcon="back" title="Mauli Mart" rightIcon="bell" onLeftPress={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const fullName = customer?.userId?.name || profile?.fullName || '—';
  const email = customer?.userId?.email || profile?.email || '—';
  const phone = customer?.userId?.phone
    ? `${customer.userId.countryCode || '+91'} ${customer.userId.phone}`
    : profile?.phone || '—';
  const address = customer?.address?.line || profile?.address || '—';
  const bankName = customer?.bankDetails?.bankName || profile?.bankName || '—';
  const accountNumber = customer?.bankDetails?.accountNumber || profile?.accountNumber || '—';
  const ifscCode = customer?.bankDetails?.ifscCode || profile?.ifscCode || '—';
  const accountType = customer?.bankDetails?.accountType
    ? customer.bankDetails.accountType.charAt(0).toUpperCase() + customer.bankDetails.accountType.slice(1)
    : profile?.accountType || '—';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader leftIcon="back" title="Mauli Mart" rightIcon="bell" onLeftPress={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.profileHeader}>
          <Image source={{ uri: AVATAR_URI }} style={styles.avatar} />
          <Text style={styles.name}>{fullName}</Text>
          <View style={styles.verifiedRow}>
            <TickCircle size={14} color={colors.primary} variant="Bold" />
            <Text style={styles.verifiedKyc}>Verified KYC</Text>
          </View>
        </View>

        <SectionTitle title="PERSONAL DETAILS" />
        <View style={styles.card}>
          <InfoRow
            icon={<Profile2User size={17} color={colors.textSecondary} variant="Linear" />}
            label="Full Name"
            value={fullName}
          />
          <View style={styles.rowDivider} />
          <InfoRow
            icon={<Sms size={17} color={colors.textSecondary} variant="Linear" />}
            label="Email Address"
            value={email}
          />
          <View style={styles.rowDivider} />
          <InfoRow
            icon={<Call size={17} color={colors.textSecondary} variant="Linear" />}
            label="Phone Number"
            value={phone}
          />
          <View style={styles.rowDivider} />
          <InfoRow
            icon={<Location size={17} color={colors.textSecondary} variant="Linear" />}
            label="Address"
            value={address}
          />
        </View>

        <SectionTitle title="SETTLEMENT DETAILS" />
        <View style={styles.card}>
          <InfoRow
            icon={<Bank size={17} color={colors.textSecondary} variant="Linear" />}
            label="Bank Name"
            value={bankName}
          />
          <View style={styles.rowDivider} />
          <InfoRow
            icon={<SecurityCard size={17} color={colors.textSecondary} variant="Linear" />}
            label="Account Number"
            value={accountNumber}
          />
          <View style={styles.rowDivider} />
          <View style={styles.splitRow}>
            <View style={styles.splitCell}>
              <View style={styles.infoIcon}>
                <Barcode size={17} color={colors.textSecondary} variant="Linear" />
              </View>
              <View>
                <Text style={styles.infoLabel}>IFSC Code</Text>
                <Text style={styles.infoValue}>{ifscCode}</Text>
              </View>
            </View>
            <View style={styles.splitDivider} />
            <View style={styles.splitCell}>
              <View style={styles.infoIcon}>
                <CardPos size={17} color={colors.textSecondary} variant="Linear" />
              </View>
              <View>
                <Text style={styles.infoLabel}>Type</Text>
                <Text style={styles.infoValue}>{accountType}</Text>
              </View>
            </View>
          </View>
        </View>

        <SectionTitle title="COMPLIANCE & KYC" />
        <View style={styles.card}>
          {customer?.panCardNo || customer?.panFile ? (
            <KycRow
              icon={<DocumentText1 size={17} color={colors.textSecondary} variant="Linear" />}
              label="PAN Card"
            />
          ) : null}
          {customer?.gstNo || customer?.gstFile ? (
            <KycRow
              icon={<DocumentText1 size={17} color={colors.textSecondary} variant="Linear" />}
              label="GST Certificate"
            />
          ) : null}
          {customer?.fssaiNo || customer?.fssaiFile ? (
            <KycRow
              icon={<DocumentText1 size={17} color={colors.textSecondary} variant="Linear" />}
              label="FSSAI Certificate"
              last
            />
          ) : null}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f7f4' },
  scrollContent: { paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },

  profileHeader: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingTop: 24,
    paddingBottom: 20,
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#b6e3f4',
    borderWidth: 3,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  verifiedKyc: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  infoIcon: {
    width: 22,
    marginTop: 2,
    alignItems: 'center',
  },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 20,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginLeft: 50,
  },

  splitRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  splitCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  splitDivider: {
    width: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 12,
  },

  kycRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  kycRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  kycLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
});

export default CustomerProfileDetailsScreen;
