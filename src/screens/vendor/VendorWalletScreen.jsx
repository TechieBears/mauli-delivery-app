import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowDown2, Wallet2, Clock, TickCircle } from 'iconsax-react-native';
import { colors } from '../../theme/colors';
import AppHeader from '../../components/AppHeader';
import { WALLET_BALANCE, WALLET_TRANSACTIONS } from '../../constants/walletData';

const formatINR = n =>
  '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2 });

const FILTERS = [
  { key: 'all',   label: 'All' },
  { key: '7d',    label: '7 Days' },
  { key: '30d',   label: '30 Days' },
  { key: '3m',    label: '3 Months' },
];

const filterTx = (txns, key) => {
  if (key === 'all') return txns;
  const now = new Date('2026-05-22');
  const days = key === '7d' ? 7 : key === '30d' ? 30 : 90;
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  return txns.filter(t => new Date(t.isoDate) >= cutoff);
};

// ─── Balance card ─────────────────────────────────────────────────────────────

const BalanceCard = ({ filteredTotal, filterKey }) => (
  <View style={styles.balanceCard}>
    <View style={styles.balanceTop}>
      <View style={styles.walletIconWrap}>
        <Wallet2 size={20} color="#fff" variant="Bold" />
      </View>
      <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
    </View>
    <Text style={styles.balanceAmount}>{formatINR(WALLET_BALANCE)}</Text>
    <View style={styles.balanceFooterRow}>
      <View style={styles.balanceMeta}>
        <Clock size={12} color="rgba(255,255,255,0.6)" variant="Linear" />
        <Text style={styles.balanceMetaText}>Updated just now</Text>
      </View>
      {filterKey !== 'all' && (
        <View style={styles.periodEarned}>
          <TickCircle size={11} color="#86efac" variant="Bold" />
          <Text style={styles.periodEarnedText}>{formatINR(filteredTotal)} earned</Text>
        </View>
      )}
    </View>
  </View>
);

// ─── Filter bar ───────────────────────────────────────────────────────────────

const FilterBar = ({ active, onChange }) => (
  <View style={styles.filterRow}>
    {FILTERS.map(f => {
      const isActive = active === f.key;
      return (
        <TouchableOpacity
          key={f.key}
          style={[styles.filterChip, isActive && styles.filterChipActive]}
          onPress={() => onChange(f.key)}
          activeOpacity={0.75}>
          <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
            {f.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

// ─── Transaction card ─────────────────────────────────────────────────────────

const TransactionCard = ({ item }) => (
  <View style={styles.txCard}>
    <View style={styles.txIconWrap}>
      <ArrowDown2 size={17} color="#16a34a" variant="Linear" />
    </View>
    <View style={styles.txMeta}>
      <Text style={styles.txDesc}>{item.description}</Text>
      <Text style={styles.txOrderId}>Order #{item.orderId}</Text>
      <Text style={styles.txDate}>{item.date} • {item.time}</Text>
    </View>
    <View style={styles.txAmountCol}>
      <Text style={styles.txAmount}>+{formatINR(item.amount)}</Text>
      <View style={styles.creditChip}>
        <Text style={styles.creditChipText}>ADMIN</Text>
      </View>
    </View>
  </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

const VendorWalletScreen = ({ navigation }) => {
  const [activeFilter, setActiveFilter] = useState('all');

  const filtered = useMemo(
    () => filterTx(WALLET_TRANSACTIONS, activeFilter),
    [activeFilter],
  );

  const filteredTotal = useMemo(
    () => filtered.reduce((sum, t) => sum + t.amount, 0),
    [filtered],
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <AppHeader
        leftIcon="back"
        title="Mauli Mart"
        rightIcon="bell"
        onLeftPress={() => navigation.goBack()}
      />

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <BalanceCard filteredTotal={filteredTotal} filterKey={activeFilter} />

            <FilterBar active={activeFilter} onChange={setActiveFilter} />

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>TRANSACTION HISTORY</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{filtered.length} RECORDS</Text>
              </View>
            </View>
          </>
        }
        renderItem={({ item }) => <TransactionCard item={item} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No transactions</Text>
            <Text style={styles.emptyBody}>No records found for this period.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f7f4' },
  listContent: { paddingBottom: 16 },

  // Balance card
  balanceCard: {
    backgroundColor: '#1b5e20',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 22,
    shadowColor: '#1b5e20',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  balanceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  walletIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 1.2,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 12,
  },
  balanceFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  balanceMetaText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  periodEarned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  periodEarnedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#86efac',
  },

  // Filter bar
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#fff',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  countBadge: {
    backgroundColor: '#fef9c3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#a16207',
    letterSpacing: 0.3,
  },

  // Transaction card
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  txIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txMeta: { flex: 1 },
  txDesc: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  txOrderId: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 2,
  },
  txDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  txAmountCol: {
    alignItems: 'flex-end',
    gap: 5,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#16a34a',
  },
  creditChip: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  creditChipText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#166534',
    letterSpacing: 0.5,
  },

  // Empty state
  empty: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  emptyBody: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});

export default VendorWalletScreen;
