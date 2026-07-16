import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { Clock } from 'iconsax-react-native';
import { Storefront, DotsThreeVertical } from 'phosphor-react-native';
import AppHeader from '../../components/AppHeader';
import { useVendorOrders, useUpdateVendorOrderStatus } from '../../hooks/useVendorQueries';
import toast from '../../utils/toast';

// Backend status enum: pending | confirmed | intransit | delivered | rejected | cancelled
// The filter capsules come from the API's `statuses` array; this is a safe
// fallback for the first render (before the list response arrives).
const FALLBACK_STATUSES = [
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'In Transit', value: 'intransit' },
  { label: 'Delivered', value: 'delivered' },
];

const STATUS_CONFIG = {
  pending:    { bg: '#fef3c7', text: '#92400e',  label: 'Pending' },
  confirmed:  { bg: '#dbeafe', text: '#1e40af',  label: 'Confirmed' },
  intransit:  { bg: '#fed7aa', text: '#c2410c',  label: 'In-Transit' },
  delivered:  { bg: '#dcfce7', text: '#166534',  label: 'Delivered' },
  rejected:   { bg: '#fee2e2', text: '#b91c1c',  label: 'Rejected' },
  cancelled:  { bg: '#f3f4f6', text: '#6b7280',  label: 'Cancelled' },
};

const formatAmount = value =>
  Number(value ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Derives the "Scheduled for …" text from the delivery slot / order type.
const formatSchedule = order => {
  if (order.orderType === 'emergency' || order.deliverySlotId?.isEmergency) return 'ASAP Delivery';
  const slot = order.deliverySlotId;
  if (slot?.startTime && slot?.endTime) return `${slot.startTime} - ${slot.endTime}`;
  return 'TBD';
};

// Maps a raw /vendor/orders item to the fields the card renders. The list
// payload has no company name or SKU count, so we fall back to the customer's
// address line and the order type.
const toCardOrder = raw => ({
  id: raw._id,
  status: raw.status,
  amount: raw.vendorTotalAmount ?? raw.totalAmount ?? 0,
  company: raw.customerId?.address?.line || 'Customer Order',
  schedule: formatSchedule(raw),
  orderType: raw.orderType,
});

const OrderCard = ({ order, onPress, onAccept, accepting }) => {
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
  const isPending = order.status === 'pending';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.92}>
      <View style={styles.cardTopRow}>
        <Text style={styles.orderId}>ORDER #{String(order.id).slice(-6).toUpperCase()}</Text>
        <View style={[styles.statusChip, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusChipText, { color: cfg.text }]}>{cfg.label}</Text>
        </View>
      </View>

      <Text style={styles.companyName} numberOfLines={1}>{order.company}</Text>

      <View style={styles.priceRow}>
        <View style={styles.thumb}>
          <Storefront size={22} color={colors.primary} weight="regular" />
        </View>
        <View style={styles.priceCol}>
          <Text style={styles.amount}>₹{formatAmount(order.amount)}</Text>
          <View style={styles.metaRow}>
            <Clock size={13} color={colors.textMuted} variant="Linear" />
            <Text style={styles.metaText}>Scheduled for {order.schedule}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={[styles.actionBtn]}
          onPress={isPending ? onAccept : onPress}
          disabled={accepting}
          activeOpacity={0.85}>
          {accepting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.actionBtnText]}>
              {isPending ? 'Accept Order' : 'View Details'}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.moreBtn}
          onPress={onPress}
          activeOpacity={0.7}>
          <DotsThreeVertical size={20} color={colors.textSecondary} weight="bold" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const VendorOrdersScreen = ({ navigation }) => {
  const [activeFilter, setActiveFilter] = useState('pending');

  // The active filter is sent to the API, which returns only matching orders.
  const { data, isLoading, isError, error, refetch, isRefetching } = useVendorOrders(activeFilter);
  React.useEffect(() => {
    if (error) console.log('[VendorOrdersScreen] /vendor/orders error:', error?.message, error?.status);
  }, [error]);

  // The list screen stays mounted while you drill into an order's detail, so
  // `refetchOnMount` won't fire on the way back. Refetch on focus instead, so a
  // status change made on the detail screen (e.g. accept → confirmed) drops the
  // order out of the Pending list when you return.
  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const { mutate: updateStatus, isPending: isUpdating, variables: updatingVars } =
    useUpdateVendorOrderStatus();

  const handleAccept = id =>
    updateStatus(
      { id, status: 'confirmed' },
      {
        onSuccess: () => toast.success('Order accepted'),
        onError: e => toast.error('Could not accept order', e?.message),
      },
    );

  // Filter capsules come from the API's `statuses`; fall back until it loads.
  const statuses = Array.isArray(data?.statuses) && data.statuses.length
    ? data.statuses
    : FALLBACK_STATUSES;

  // The API already filtered by `activeFilter`, so we render `data.data` as-is.
  const orders = useMemo(
    () => (Array.isArray(data?.data) ? data.data.map(toCardOrder) : []),
    [data],
  );

  const activeLabel =
    statuses.find(s => s.value === activeFilter)?.label ?? activeFilter;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader title="Mauli Mart" leftIcon="menu" rightIcon="bell" />

      <View style={styles.titleWrap}>
        <Text style={styles.pageTitle}>Order Management</Text>
        <Text style={styles.pageSubtitle}>
          Manage your organic produce supply chain in real-time.
        </Text>
      </View>

      <View style={styles.filterBar}>
        <View style={styles.filterContent}>
          {statuses.map(status => {
            const active = activeFilter === status.value;
            return (
              <TouchableOpacity
                key={status.value}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setActiveFilter(status.value)}
                activeOpacity={0.8}>
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {status.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.empty}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
              onAccept={() => handleAccept(item.id)}
              accepting={isUpdating && updatingVars?.id === item.id}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {isError ? 'Could not load orders' : `No ${activeLabel} orders`}
              </Text>
              <Text style={styles.emptyBody}>
                {isError ? (error?.message ?? 'Pull down to retry.') : 'Orders will appear here when available.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f7f4' },
  titleWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: colors.surface,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 3,
  },
  pageSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  filterBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  filterContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
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
  listContent: {
    padding: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderId: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  companyName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceCol: {
    flex: 1,
  },
  amount: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  moreBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default VendorOrdersScreen;
