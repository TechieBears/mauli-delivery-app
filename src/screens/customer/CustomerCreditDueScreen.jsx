import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft2 } from 'iconsax-react-native';
import { colors } from '../../theme/colors';
import toast from '../../utils/toast';

const fmt = n => '₹' + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

const fmtDate = iso =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const DAY_MS = 24 * 60 * 60 * 1000;

// Static placeholder data — replace with the credit-dues API once available.
const DUMMY_DUES = [
  {
    orderNumber: 'MM-2026-004812',
    orderDate: '2026-06-18T09:30:00.000Z',
    dueDate: '2026-07-18T00:00:00.000Z',
    total: 12450,
    items: [
      { name: 'Tomato · Hybrid', quantity: 20, price: 240 },
      { name: 'Onion · Nashik Red', quantity: 15, price: 310 },
      { name: 'Potato · Jyoti', quantity: 10, price: 305 },
    ],
  },
  {
    orderNumber: 'MM-2026-004655',
    orderDate: '2026-06-02T11:15:00.000Z',
    dueDate: '2026-07-02T00:00:00.000Z',
    total: 8320,
    items: [
      { name: 'Cauliflower · Snowball', quantity: 12, price: 380 },
      { name: 'Green Chilli · Guntur', quantity: 8, price: 470 },
    ],
  },
];

// ─── Due Card ─────────────────────────────────────────────────────────────────

const DueCard = ({ due, onClear }) => {
  const daysLeft = Math.ceil((new Date(due.dueDate) - Date.now()) / DAY_MS);
  const isOverdue = daysLeft < 0;

  return (
    <View style={styles.dueCard}>
      {/* Card header — order number + status pill */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardLabel}>ORDER NUMBER</Text>
          <Text style={styles.orderNumber}>{due.orderNumber}</Text>
        </View>
        <View style={[styles.statusPill, isOverdue ? styles.statusPillOverdue : styles.statusPillDue]}>
          <Text style={[styles.statusText, isOverdue ? styles.statusTextOverdue : styles.statusTextDue]}>
            {isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
          </Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      {/* Order details */}
      <Text style={styles.cardLabel}>ORDER DETAILS</Text>
      <View style={styles.itemsList}>
        {due.items.map(item => (
          <View key={item.name} style={styles.itemRow}>
            <View style={styles.qtyBadge}>
              <Text style={styles.qtyText}>{String(item.quantity).padStart(2, '0')}</Text>
            </View>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.itemPrice}>{fmt(item.price * item.quantity)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.cardDivider} />

      {/* Dates */}
      <View style={styles.metaRow}>
        <View style={styles.metaCol}>
          <Text style={styles.cardLabel}>ORDER DATE</Text>
          <Text style={styles.metaValue}>{fmtDate(due.orderDate)}</Text>
        </View>
        <View style={styles.metaCol}>
          <Text style={styles.cardLabel}>DUE DATE</Text>
          <Text style={[styles.metaValue, isOverdue && styles.metaValueOverdue]}>
            {fmtDate(due.dueDate)}
          </Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      {/* Total + clear CTA */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Order Total</Text>
        <Text style={styles.totalValue}>{fmt(due.total)}</Text>
      </View>

      <TouchableOpacity style={styles.clearBtn} onPress={onClear} activeOpacity={0.85}>
        <Text style={styles.clearBtnText}>Clear Due  →</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const CustomerCreditDueScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const dues = DUMMY_DUES;
  const totalDue = dues.reduce((sum, d) => sum + d.total, 0);

  const handleClear = due => {
    toast.info('Coming soon', `Payment for ${due.orderNumber} is not wired up yet.`);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#faf8f5" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Page header */}
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft2 size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.journeyTag}>CHECKOUT JOURNEY</Text>
          <Text style={styles.pageTitle}>Credit Due Summary</Text>
          <Text style={styles.pageSubtitle}>
            Settle your pending credit before placing a new order.
          </Text>
        </View>

        {dues.length === 0 ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateText}>You have no pending dues.</Text>
          </View>
        ) : (
          <>
            {/* Outstanding banner */}
            <View style={styles.section}>
              <View style={styles.bannerCard}>
                <Text style={styles.bannerLabel}>TOTAL OUTSTANDING</Text>
                <Text style={styles.bannerValue}>{fmt(totalDue)}</Text>
                <Text style={styles.bannerHint}>
                  Across {dues.length} unpaid {dues.length === 1 ? 'order' : 'orders'}
                </Text>
              </View>
            </View>

            {/* Due cards */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>PENDING ORDERS</Text>
              <View style={styles.cardStack}>
                {dues.map(due => (
                  <DueCard key={due.orderNumber} due={due} onClear={() => handleClear(due)} />
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Sticky skip CTA — development-phase bypass */}
      <View style={[styles.ctas, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => navigation.navigate('ConfirmOrder')}
          activeOpacity={0.85}>
          <Text style={styles.skipBtnText}>Skip for now  →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#faf8f5' },
  scroll: { paddingBottom: 16 },

  // Page header
  pageHeader: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  journeyTag: { fontSize: 10, fontWeight: '700', color: colors.primary, letterSpacing: 1.2, marginBottom: 6 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 6 },
  pageSubtitle: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },

  // Section
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#9ca3af', letterSpacing: 1.2, marginBottom: 10 },
  cardStack: { gap: 14 },

  // States
  stateBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  stateText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },

  // Outstanding banner
  bannerCard: {
    backgroundColor: '#fff7ed', borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: '#fed7aa',
  },
  bannerLabel: { fontSize: 10, fontWeight: '800', color: '#c2410c', letterSpacing: 1.2, marginBottom: 6 },
  bannerValue: { fontSize: 28, fontWeight: '800', color: '#9a3412', marginBottom: 4 },
  bannerHint: { fontSize: 12, color: '#c2410c', fontWeight: '500' },

  // Due card
  dueCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardHeaderLeft: { flex: 1 },
  cardLabel: { fontSize: 10, fontWeight: '800', color: '#9ca3af', letterSpacing: 1, marginBottom: 4 },
  orderNumber: { fontSize: 15, fontWeight: '800', color: colors.text },
  statusPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillDue: { backgroundColor: '#f0fdf4' },
  statusPillOverdue: { backgroundColor: '#fef2f2' },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusTextDue: { color: colors.primary },
  statusTextOverdue: { color: '#ef4444' },
  cardDivider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 14 },

  // Items
  itemsList: { gap: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBadge: { backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  qtyText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  itemName: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  itemPrice: { fontSize: 13, fontWeight: '700', color: colors.text },

  // Meta
  metaRow: { flexDirection: 'row' },
  metaCol: { flex: 1 },
  metaValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  metaValueOverdue: { color: '#ef4444' },

  // Total
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  totalLabel: { fontSize: 15, fontWeight: '800', color: colors.text },
  totalValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  clearBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  clearBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Sticky CTA
  ctas: { backgroundColor: '#faf8f5', paddingHorizontal: 16, paddingTop: 12 },
  skipBtn: {
    borderRadius: 14, paddingVertical: 15, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#fff',
  },
  skipBtnText: { fontSize: 14, fontWeight: '700', color: '#6b7280' },
});

export default CustomerCreditDueScreen;
