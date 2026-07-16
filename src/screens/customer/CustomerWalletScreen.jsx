import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wallet2, ShoppingBag, Clock, Refresh2 } from 'iconsax-react-native';
import AppHeader from '../../components/AppHeader';
import { colors } from '../../theme/colors';

const QUICK_AMOUNTS = [500, 1000, 2000];

const TRANSACTIONS = [
  {
    id: 't1',
    type: 'order',
    title: 'Order #8821',
    date: 'Oct 24, 2023 · 2:30 PM',
    amount: -840,
    status: 'SUCCESS',
  },
  {
    id: 't2',
    type: 'topup',
    title: 'Wallet Topup',
    date: 'Oct 22, 2023 · 11:15 AM',
    amount: 2000,
    status: 'SUCCESS',
  },
  {
    id: 't3',
    type: 'refund',
    title: 'Refund #7710',
    date: 'Oct 20, 2023 · 09:40 AM',
    amount: 120,
    status: 'PENDING',
  },
  {
    id: 't4',
    type: 'order',
    title: 'Order #8790',
    date: 'Oct 18, 2023 · 4:20 PM',
    amount: -1250,
    status: 'SUCCESS',
  },
];

const ICON_CONFIG = {
  order:  { Icon: ShoppingBag, bg: '#fff7ed', color: '#f97316' },
  topup:  { Icon: Wallet2,     bg: '#f0fdf4', color: colors.primary },
  refund: { Icon: Refresh2,    bg: '#faf5ff', color: '#a855f7' },
};

const STATUS_STYLE = {
  SUCCESS: { bg: '#dcfce7', text: '#16a34a' },
  PENDING: { bg: '#fef3c7', text: '#d97706' },
};

const fmt = n =>
  (n < 0 ? '- ₹' : '+ ₹') +
  Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });

// ─── Transaction Row ──────────────────────────────────────────────────────────

const TxRow = ({ item }) => {
  const { Icon, bg, color } = ICON_CONFIG[item.type];
  const { bg: sBg, text: sText } = STATUS_STYLE[item.status];
  const isDebit = item.amount < 0;

  return (
    <View style={styles.txRow}>
      <View style={[styles.txIcon, { backgroundColor: bg }]}>
        <Icon size={20} color={color} variant="Bold" />
      </View>
      <View style={styles.txMeta}>
        <Text style={styles.txTitle}>{item.title}</Text>
        <Text style={styles.txDate}>{item.date}</Text>
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: isDebit ? '#ef4444' : '#16a34a' }]}>
          {fmt(item.amount)}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: sBg }]}>
          <Text style={[styles.statusText, { color: sText }]}>{item.status}</Text>
        </View>
      </View>
    </View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const CustomerWalletScreen = () => {
  const [selectedAmt, setSelectedAmt] = useState(1000);
  const [customAmt, setCustomAmt] = useState('1000');

  const handleChipPress = amt => {
    setSelectedAmt(amt);
    setCustomAmt(String(amt));
  };

  const handleCustomChange = val => {
    const num = val.replace(/[^0-9]/g, '');
    setCustomAmt(num);
    setSelectedAmt(null);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f6f8" />
      <AppHeader title="Mauli Mart" rightIcon="bell" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
          <Text style={styles.balanceAmount}>₹ 4,850.00</Text>
        </View>

        {/* Quick Recharge */}
        <View style={styles.rechargeSection}>
          <Text style={styles.sectionLabel}>QUICK RECHARGE</Text>

          <View style={styles.chipRow}>
            {QUICK_AMOUNTS.map(amt => (
              <TouchableOpacity
                key={amt}
                style={[styles.chip, selectedAmt === amt && styles.chipActive]}
                onPress={() => handleChipPress(amt)}
                activeOpacity={0.75}>
                <Text style={[styles.chipText, selectedAmt === amt && styles.chipTextActive]}>
                  ₹{amt.toLocaleString('en-IN')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.customLabel}>Custom Amount</Text>
          <View style={styles.inputRow}>
            <Text style={styles.rupeePrefix}>₹</Text>
            <TextInput
              style={styles.amountInput}
              value={customAmt}
              onChangeText={handleCustomChange}
              keyboardType="numeric"
              maxLength={7}
              placeholder="Enter amount"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <TouchableOpacity style={styles.addBtn} activeOpacity={0.85}>
            <Text style={styles.addBtnText}>Add Money to Wallet</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <View style={styles.activityHeader}>
            <Text style={styles.activityTitle}>Recent Activity</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.txCard}>
            {TRANSACTIONS.map((item, idx) => (
              <View key={item.id}>
                <TxRow item={item} />
                {idx < TRANSACTIONS.length - 1 && <View style={styles.sep} />}
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f6f8' },
  scroll: { paddingBottom: 24 },

  // Balance card
  balanceCard: {
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: '#fff',
  },

  // Quick Recharge
  rechargeSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9ca3af',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  chipTextActive: { color: '#fff' },
  customLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    backgroundColor: '#fafafa',
    gap: 6,
  },
  rupeePrefix: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    padding: 0,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // Recent Activity
  activitySection: { marginHorizontal: 16 },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },

  txCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txMeta: { flex: 1 },
  txTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },
  txDate: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
  txRight: { alignItems: 'flex-end', gap: 6 },
  txAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sep: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 14 },
});

export default CustomerWalletScreen;
