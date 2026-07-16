import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAppStore from '../../store/useAppStore';
import { colors } from '../../theme/colors';
import { CartIcon, TruckIcon, BanknoteIcon } from '../../components/vendor/VendorIcons';
import AppHeader from '../../components/AppHeader';
import { PromoBannerCarousel } from '../../components/vendor';


const StatCard = ({ iconBg, icon, badge, badgeStyle, badgeTextStyle, label, value, sublabel }) => (
  <View style={styles.statCard}>
    <View style={styles.statCardTop}>
      <View style={[styles.statIconWrap, { backgroundColor: iconBg }]}>{icon}</View>
      {badge ? (
        <View style={[styles.badge, badgeStyle]}>
          <Text style={[styles.badgeText, badgeTextStyle]}>{badge}</Text>
        </View>
      ) : null}
    </View>
    <Text style={styles.statLabel}>{label}</Text>
    <View style={styles.statValueRow}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSublabel}>{sublabel}</Text>
    </View>
  </View>
);

const VendorHomeScreen = ({ navigation }) => {
  const profile = useAppStore(state => state.profile);
  const firstName = (profile?.fullName || 'Rajesh').split(' ')[0].toUpperCase();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader title="Mauli Mart" rightIcon="bell" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.greeting}>GOOD MORNING, {firstName}</Text>
        <Text style={styles.pageTitle}>Your Farm Overview</Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.viewOrdersBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Orders')}>
            <CartIcon color="#374151" size={18} />
            <Text style={styles.viewOrdersText}>View Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.updatePricesBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Prices')}>
            <BanknoteIcon color="#fff" size={18} />
            <Text style={styles.updatePricesText}>Update Prices</Text>
          </TouchableOpacity>
        </View>

        <PromoBannerCarousel />

        <StatCard
          iconBg="#facc15"
          icon={<CartIcon />}
          badge="+12%"
          badgeStyle={styles.badgeGreen}
          badgeTextStyle={styles.badgeTextGreen}
          label="TODAY'S ORDERS"
          value="48"
          sublabel="Manifests"
        />
        <StatCard
          iconBg="#a855f7"
          icon={<TruckIcon />}
          badge="ACTION NEEDED"
          badgeStyle={styles.badgePurple}
          badgeTextStyle={styles.badgeTextPurple}
          label="PENDING PICKUPS"
          value="12"
          sublabel="Trucks en route"
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f7f4' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuBtn: { padding: 4 },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.3,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  greeting: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginTop: 20,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  viewOrdersBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  viewOrdersText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  updatePricesBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    shadowColor: '#1b5e20',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  updatePricesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  statIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeGreen: { backgroundColor: '#dcfce7' },
  badgePurple: { backgroundColor: '#f3e8ff' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  badgeTextGreen: { color: '#15803d' },
  badgeTextPurple: { color: '#7e22ce' },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  statValue: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
  },
  statSublabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
});

export default VendorHomeScreen;
