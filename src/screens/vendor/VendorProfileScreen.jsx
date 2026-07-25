import React, { useState, useEffect } from 'react';
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
  Buildings2,
  ClipboardText,
  Wallet2,
  MessageQuestion,
  Setting4,
  ArrowRight2,
  LogoutCurve,
  TickCircle,
} from 'iconsax-react-native';
import useAppStore from '../../store/useAppStore';
import { useVendorProfile } from '../../hooks/useVendorQueries';
import { resetToRoleSelection } from '../../navigation/navigationRef';
import { colors } from '../../theme/colors';
import logger from '../../utils/logger';

const AVATAR_URI = 'https://api.dicebear.com/9.x/avataaars/png?seed=Rajesh&backgroundColor=b6e3f4';

const MENU = [
  { id: 'm1', label: 'Profile Details', desc: 'View and edit your business info', Icon: Buildings2 },
  { id: 'm2', label: 'Order History', desc: 'View past orders and invoices', Icon: ClipboardText },
  { id: 'm3', label: 'Wallet', desc: 'Manage your balance and transactions', Icon: Wallet2 },
  { id: 'm4', label: 'Help & Support', desc: '24/7 Agent Access', Icon: MessageQuestion },
  { id: 'm5', label: 'App Settings', desc: 'Preferences and notifications', Icon: Setting4 },
];

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
          You will be logged out of your Mauli Mart account.
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
    <ArrowRight2 size={18} color="#d1d5db" />
  </TouchableOpacity>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

const VendorProfileScreen = ({ navigation }) => {
  const profile = useAppStore(state => state.profile);
  const logout = useAppStore(state => state.logout);
  const [showLogout, setShowLogout] = useState(false);

  // GET /vendor/profile — logged in vendorService.js; also logged here so
  // it's easy to spot the response for this specific screen in the console.
  const { data: vendorProfileRes, error: vendorProfileError } = useVendorProfile();

  useEffect(() => {
    if (vendorProfileRes) {
      logger.log('[VendorProfileScreen] vendor profile:', JSON.stringify(vendorProfileRes, null, 2));
    }
    if (vendorProfileError) {
      logger.log('[VendorProfileScreen] vendor profile error:', {
        status: vendorProfileError?.status,
        message: vendorProfileError?.message,
        data: vendorProfileError?.data,
      });
    }
  }, [vendorProfileRes, vendorProfileError]);

  const vendor = vendorProfileRes?.data;
  const fullName = vendor?.userId?.name || profile?.fullName || 'Rajesh Deshmukh';
  const phoneLabel = vendor?.userId?.phone
    ? `${vendor.userId.countryCode || '+91'} ${vendor.userId.phone}`
    : profile?.phone || '';

  const handleLogout = () => {
    setShowLogout(false);
    logout();
    resetToRoleSelection();
  };

  const handleMenuPress = id => {
    if (id === 'm1') navigation.navigate('ProfileDetails');
    if (id === 'm2') navigation.navigate('OrderHistory');
    if (id === 'm3') navigation.navigate('Wallet');
    if (id === 'm4') navigation.navigate('HelpSupport');
    if (id === 'm5') navigation.navigate('Settings');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f6f8" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Profile header */}
        <View style={styles.profileHead}>
          <View style={styles.avatarWrap}>
            <Image source={{ uri: AVATAR_URI }} style={styles.avatar} />
            <View style={styles.tierBadge}>
              <TickCircle size={16} color="#fff" variant="Bold" />
            </View>
          </View>
          <Text style={styles.name}>{fullName}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.tier}>VERIFIED VENDOR</Text>
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
              onPress={() => handleMenuPress(item.id)}
            />
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
    backgroundColor: '#b6e3f4',
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
    color: '#111827',
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
    color: '#111827',
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
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
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
  signOutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  cancelBtn: {
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
});

export default VendorProfileScreen;
