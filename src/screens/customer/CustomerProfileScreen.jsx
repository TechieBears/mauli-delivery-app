import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Buildings2,
  ClipboardText,
  Heart,
  MessageQuestion,
  Setting4,
  ArrowRight2,
  LogoutCurve,
  TickCircle,
} from 'iconsax-react-native';
import useAppStore from '../../store/useAppStore';
import { useCustomerProfile } from '../../hooks/useCustomerQueries';
import { resetToRoleSelection } from '../../navigation/navigationRef';
import { colors } from '../../theme/colors';

const AVATAR = { uri: 'https://i.pravatar.cc/150?img=33' };

const MENU = [
  {
    id: 'm1',
    label: 'Profile Details',
    desc: 'View and edit your personal info',
    Icon: Buildings2,
  },
  {
    id: 'm2',
    label: 'Order History',
    desc: '12 Recent Shipments',
    Icon: ClipboardText,
  },
  {
    id: 'm3',
    label: 'Favorite Items',
    desc: 'Quick access to your saved produce',
    Icon: Heart,
  },
  {
    id: 'm4',
    label: 'Help & Support',
    desc: '24/7 Agent Access',
    Icon: MessageQuestion,
  },
  {
    id: 'm5',
    label: 'App Settings',
    desc: 'Preferences and notifications',
    Icon: Setting4,
  },
];

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
    <ArrowRight2 size={18} color="#d1d5db" />
  </TouchableOpacity>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

const CustomerProfileScreen = ({ navigation }) => {
  const profile = useAppStore(state => state.profile);
  const user = useAppStore(state => state.user);
  const logout = useAppStore(state => state.logout);

  const { data: customerProfileRes } = useCustomerProfile();
  const customer = customerProfileRes?.data;

  const fullName =
    customer?.userId?.name || user?.name || profile?.fullName || 'Customer';
  const phone = customer?.userId?.phone || user?.phone;
  const phoneLabel = phone
    ? `${customer?.userId?.countryCode || '+91'} ${phone}`
    : profile?.phone || '';

  const handleLogout = () => {
    logout();
    resetToRoleSelection();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f6f8" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Profile header */}
        <View style={styles.profileHead}>
          <View style={styles.avatarWrap}>
            <Image source={AVATAR} style={styles.avatar} />
            <View style={styles.tierBadge}>
              <TickCircle size={16} color="#fff" variant="Bold" />
            </View>
          </View>
          <Text style={styles.name}>{fullName}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.tier}>VERIFIED CUSTOMER</Text>
            {phoneLabel ? (
              <>
                <View style={styles.metaDot} />
                <Text style={styles.userId}>{phoneLabel}</Text>
              </>
            ) : null}
          </View>
        </View>

        {/* Menu items */}
        <View style={styles.menuList}>
          {MENU.map(item => (
            <MenuItem
              key={item.id}
              item={item}
              onPress={() => {
                if (item.id === 'm1') navigation.navigate('CustomerProfileDetails');
                if (item.id === 'm2') navigation.navigate('CustomerOrderHistory');
                if (item.id === 'm3') navigation.navigate('FrequentItems');
                if (item.id === 'm4') navigation.navigate('HelpSupport');
                if (item.id === 'm5') navigation.navigate('Settings');
              }}
            />
          ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}>
          <LogoutCurve size={18} color="#ef4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
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
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#dcfce7',
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
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tier: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#9ca3af',
  },
  userId: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
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
  menuLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  menuDesc: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },

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
  signOutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ef4444',
  },
});

export default CustomerProfileScreen;
