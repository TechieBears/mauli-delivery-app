import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingBag, ArrowRight2 } from 'iconsax-react-native';
import AppHeader from '../../components/AppHeader';
import { colors } from '../../theme/colors';
import { useOrders } from '../../hooks/useCustomerQueries';
import {
  STATUS_META,
  shortOrderRef,
  formatOrderDate,
  slotLabel,
} from '../../utils/orderDisplay';
import logger from '../../utils/logger';

// Filter label → the API status values it should match.
const FILTERS = [
  { label: 'Pending', statuses: ['pending', 'confirmed', 'intransit'] },
  { label: 'Delivered', statuses: ['delivered'] },
  { label: 'Cancelled', statuses: ['cancelled', 'rejected'] },
];

const fmt = n => '₹' + (n || 0).toLocaleString('en-IN');

// ─── Order Card ───────────────────────────────────────────────────────────────

const OrderCard = ({ order, onPress }) => {
  const meta = STATUS_META[order.status] ?? STATUS_META.pending;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <View style={styles.iconBox}>
            <ShoppingBag size={20} color={colors.primary} variant="Bold" />
          </View>
          <View>
            <Text style={styles.orderNo}>{shortOrderRef(order._id)}</Text>
            <Text style={styles.orderDate}>{formatOrderDate(order.createdAt)}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: meta.dot }]} />
          <Text style={[styles.statusText, { color: meta.text }]}>{meta.label}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardMeta}>
        <View>
          <Text style={styles.metaLabel}>Delivery</Text>
          <Text style={styles.metaValue}>{slotLabel(order.deliverySlotId)}</Text>
        </View>
        <View style={styles.metaCenter}>
          <Text style={styles.metaLabel}>Type</Text>
          <Text style={styles.metaValue}>{order.orderType === 'emergency' ? 'Emergency' : 'Normal'}</Text>
        </View>
        <View style={styles.metaRight}>
          <Text style={styles.metaLabel}>Total</Text>
          <Text style={styles.metaTotal}>{fmt(order.totalAmount)}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.viewBtn} onPress={onPress} activeOpacity={0.8}>
        <Text style={styles.viewBtnText}>View Details</Text>
        <ArrowRight2 size={14} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const CustomerOrdersScreen = ({ navigation }) => {
  const [activeFilter, setActiveFilter] = useState('Pending');

  const { data: ordersRes, isLoading, isError, refetch } = useOrders();

  // Detailed log so the list response shape can be inspected.
  logger.log('[Orders] GET /customer/orders response:', JSON.stringify(ordersRes, null, 2));

  const orders = Array.isArray(ordersRes?.data) ? ordersRes.data : [];
  const active = FILTERS.find(f => f.label === activeFilter) ?? FILTERS[0];
  const filtered = orders.filter(o => active.statuses.includes(o.status));

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f6f8" />
      <AppHeader title="My Orders" rightIcon="bell" />

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.label}
            style={[styles.filterChip, activeFilter === f.label && styles.filterChipActive]}
            onPress={() => setActiveFilter(f.label)}
            activeOpacity={0.75}>
            <Text style={[styles.filterText, activeFilter === f.label && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>

        {isLoading ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : isError ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Couldn’t load orders</Text>
            <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn} activeOpacity={0.85}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No {activeFilter} Orders</Text>
            <Text style={styles.emptySub}>You have no orders in this category.</Text>
          </View>
        ) : (
          filtered.map(order => (
            <OrderCard
              key={String(order._id)}
              order={order}
              onPress={() => navigation.navigate('CustomerOrderDetail', { orderId: order._id })}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f6f8' },
  scroll: { padding: 16, paddingBottom: 24 },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
  },
  filterTextActive: { color: '#fff' },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderNo: { fontSize: 14, fontWeight: '800', color: '#111827' },
  orderDate: { fontSize: 11, color: '#9ca3af', marginTop: 2, fontWeight: '500' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginBottom: 12 },
  cardMeta: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  metaLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '600', marginBottom: 3 },
  metaValue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  metaCenter: { flex: 1, paddingHorizontal: 12 },
  metaRight: { alignItems: 'flex-end' },
  metaTotal: { fontSize: 14, fontWeight: '800', color: colors.primary },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 10,
  },
  viewBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },

  // Empty
  empty: { alignItems: 'center', paddingTop: 80, gap: 14 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
  retryBtn: {
    backgroundColor: colors.primary, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 11,
  },
  retryText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

export default CustomerOrdersScreen;
