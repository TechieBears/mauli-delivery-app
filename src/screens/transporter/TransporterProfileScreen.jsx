import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Profile,
  ClipboardText,
  Car,
  MessageQuestion,
  ArrowRight2,
  LogoutCurve,
  TickCircle,
} from 'iconsax-react-native';
import useAppStore from '../../store/useAppStore';
import {
  useTransporterProfile,
  useTransporterOrders,
} from '../../hooks/useTransporterQueries';
import { STATUS_ASSIGNED, STATUS_ACCEPTED } from './orderStatus';
import { resetToLogin } from '../../navigation/navigationRef';
import { colors } from '../../theme/colors';

const AVATAR_URI =
  'https://api.dicebear.com/9.x/avataaars/png?seed=Transporter&backgroundColor=c0aede';

// ─── Logout Modal ─────────────────────────────────────────────────────────────

const LogoutModal = ({ visible, onConfirm, onCancel }) => (
  <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
    <View style={modalStyles.overlay}>
      <View style={modalStyles.card}>
        <View style={modalStyles.iconWrap}>
          <LogoutCurve size={26} color={colors.error} variant="Linear" />
        </View>
        <Text style={modalStyles.title}>Are you sure?</Text>
        <Text style={modalStyles.subtitle}>
          You will be logged out of your Mauli G-Mart Transporter account.
        </Text>
        <TouchableOpacity style={modalStyles.signOutBtn} onPress={onConfirm} activeOpacity={0.85}>
          <Text style={modalStyles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={modalStyles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
          <Text style={modalStyles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// ─── Menu Item ────────────────────────────────────────────────────────────────

const MenuItem = ({ item, onPress }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.75}>
    <View style={styles.menuIconBox}>
      <item.Icon size={20} color={colors.primary} variant="Linear" />
    </View>
    <View style={styles.menuText}>
      <Text style={styles.menuLabel}>{item.label}</Text>
      <Text style={styles.menuDesc}>{item.desc}</Text>
    </View>
    {item.value ? <Text style={styles.menuValue}>{item.value}</Text> : null}
    <ArrowRight2 size={18} color="#d1d5db" />
  </TouchableOpacity>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

const TransporterProfileScreen = ({ navigation }) => {
  const logout = useAppStore(state => state.logout);
  const [showLogout, setShowLogout] = useState(false);

  const { data: profileRes } = useTransporterProfile();
  const { data: assignedRes } = useTransporterOrders(STATUS_ASSIGNED);
  const { data: acceptedRes } = useTransporterOrders(STATUS_ACCEPTED);
  const { data: deliveredRes } = useTransporterOrders('delivered');

  const profile = profileRes?.data;
  const fullName = profile?.userId?.name ?? '';
  const phoneLabel = profile?.userId?.phone
    ? `${profile.userId.countryCode ?? '+91'} ${profile.userId.phone}`
    : '';
  const isVerified = profile?.kycStatus === 'approved';

  // Totals come from the paginated envelope, not the page length (capped at 20).
  const assignedCount = assignedRes?.pagination?.total ?? 0;
  const acceptedCount = acceptedRes?.pagination?.total ?? 0;
  const deliveredCount = deliveredRes?.pagination?.total ?? 0;

  const menu = [
    {
      id: 'details',
      label: 'Profile Details',
      desc: 'View and edit your personal info',
      Icon: Profile,
    },
    {
      id: 'vehicle',
      label: 'Vehicle & Licence',
      desc: 'Your vehicle and driving licence',
      Icon: Car,
      value: profile?.vehicles?.[0]?.vehicleNo,
    },
    {
      id: 'orders',
      label: 'Order History',
      desc: 'Accepted, assigned and delivered orders',
      Icon: ClipboardText,
      value: String(assignedCount + acceptedCount + deliveredCount),
    },
    {
      id: 'help',
      label: 'Help & Support',
      desc: '24/7 Agent Access',
      Icon: MessageQuestion,
    },
  ];

  const handleLogout = () => {
    setShowLogout(false);
    logout();
    resetToLogin();
  };

  const handleMenuPress = id => {
    if (id === 'details' || id === 'vehicle') {
      navigation.navigate('TransporterProfileDetails');
      return;
    }
    if (id === 'orders') {
      navigation.navigate('TransporterMyOrders', { tab: STATUS_ACCEPTED });
      return;
    }
    if (id === 'help') navigation.navigate('HelpSupport');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f6f8" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Profile header */}
        <View style={styles.profileHead}>
          <View style={styles.avatarWrap}>
            <Image source={{ uri: AVATAR_URI }} style={styles.avatar} />
            {isVerified ? (
              <View style={styles.tierBadge}>
                <TickCircle size={16} color="#fff" variant="Bold" />
              </View>
            ) : null}
          </View>
          <Text style={styles.name}>{fullName || 'Your profile'}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.tier}>
              {isVerified
                ? 'VERIFIED TRANSPORTER'
                : String(profile?.kycStatus ?? 'pending').toUpperCase()}
            </Text>
            {phoneLabel ? (
              <>
                <View style={styles.metaDot} />
                <Text style={styles.userId}>{phoneLabel}</Text>
              </>
            ) : null}
          </View>
        </View>

        {/* Delivery stats */}
        <View style={styles.statsCard}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{assignedCount}</Text>
            <Text style={styles.statLabel}>ASSIGNED</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{acceptedCount}</Text>
            <Text style={styles.statLabel}>ACCEPTED</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{deliveredCount}</Text>
            <Text style={styles.statLabel}>DELIVERED</Text>
          </View>
        </View>

        {/* Menu items */}
        <View style={styles.menuList}>
          {menu.map(item => (
            <MenuItem key={item.id} item={item} onPress={() => handleMenuPress(item.id)} />
          ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={() => setShowLogout(true)}
          activeOpacity={0.8}>
          <LogoutCurve size={18} color="#ef4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>

      <LogoutModal
        visible={showLogout}
        onConfirm={handleLogout}
        onCancel={() => setShowLogout(false)}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f6f8' },
  scroll: { paddingBottom: 24 },

  // Profile header
  profileHead: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#dcfce7',
    backgroundColor: '#c0aede',
  },
  tierBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#f5f6f8',
  },
  name: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tier: { fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 0.8 },
  metaDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#9ca3af' },
  userId: { fontSize: 11, fontWeight: '600', color: '#9ca3af' },

  // Stats
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 34, backgroundColor: '#f3f4f6' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#111827' },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#9ca3af',
    marginTop: 4,
  },

  // Menu
  menuList: { paddingHorizontal: 16, gap: 10 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  menuIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 3 },
  menuDesc: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },
  menuValue: { fontSize: 13, fontWeight: '700', color: colors.primary },

  // Sign out
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#fef2f2',
    borderRadius: 14,
    paddingVertical: 16,
  },
  signOutText: { fontSize: 15, fontWeight: '700', color: '#ef4444' },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: 'center',
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff1f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  signOutBtn: {
    width: '100%',
    backgroundColor: '#ef4444',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  signOutText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cancelBtn: { paddingVertical: 8 },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
});

export default TransporterProfileScreen;
