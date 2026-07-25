import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shop, TickCircle, ArrowRight2 } from 'iconsax-react-native';
import { colors } from '../../theme/colors';
import AppHeader from '../../components/AppHeader';
import { useOrders } from '../../hooks/useCustomerQueries';
import { STATUS_META, shortOrderRef, formatOrderDate } from '../../utils/orderDisplay';
import logger from '../../utils/logger';

const formatINR = amount =>
  '₹' + (amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

const HistoryCard = ({ order, onViewDetails }) => {
  const meta = STATUS_META[order.status] ?? STATUS_META.pending;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.iconWrap}>
          <Shop size={18} color={colors.primary} variant="Linear" />
        </View>
        <View style={styles.orderMeta}>
          <Text style={styles.orderId}>{shortOrderRef(order._id)}</Text>
          <Text style={styles.orderDate}>{formatOrderDate(order.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <TickCircle size={12} color={meta.text} variant="Bold" />
          <Text style={[styles.statusText, { color: meta.text }]}>{meta.label}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardBottom}>
        <Text style={styles.amount}>{formatINR(order.totalAmount)}</Text>
        <TouchableOpacity style={styles.viewDetailsBtn} onPress={onViewDetails} activeOpacity={0.7}>
          <Text style={styles.viewDetailsText}>View Details</Text>
          <ArrowRight2 size={12} color={colors.primary} variant="Linear" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const CustomerOrderHistoryScreen = ({ navigation }) => {
  const { data: ordersRes, isLoading, isError, refetch } = useOrders();

  // Detailed log so the list response shape can be inspected.
  logger.log('[OrderHistory] GET /customer/orders response:', JSON.stringify(ordersRes, null, 2));

  const orders = Array.isArray(ordersRes?.data) ? ordersRes.data : [];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader leftIcon="back" title="Mauli Mart" rightIcon="bell" onLeftPress={() => navigation.goBack()} />

      {isLoading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>Couldn’t load your orders.</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn} activeOpacity={0.85}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => String(item._id)}
          renderItem={({ item }) => (
            <HistoryCard
              order={item}
              onViewDetails={() => navigation.navigate('CustomerOrderDetail', { orderId: item._id })}
            />
          )}
          ListHeaderComponent={
            <View style={styles.pageHeader}>
              <Text style={styles.pageTitle}>Order History</Text>
              <Text style={styles.pageSubtitle}>Review your orders and deliveries</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.stateBox}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.stateText}>You haven’t placed any orders yet.</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f7f4' },

  pageHeader: { paddingTop: 20, paddingBottom: 16 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: colors.textSecondary },

  listContent: { paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1 },

  stateBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingVertical: 60 },
  stateText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  emptyIcon: { fontSize: 44 },
  retryBtn: {
    backgroundColor: colors.primary, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 11,
  },
  retryText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  iconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0',
    alignItems: 'center', justifyContent: 'center',
  },
  orderMeta: { flex: 1 },
  orderId: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 1 },
  orderDate: { fontSize: 11, color: colors.textMuted },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  statusText: { fontSize: 10, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginBottom: 8 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewDetailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  viewDetailsText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  amount: { fontSize: 20, fontWeight: '800', color: colors.text },
});

export default CustomerOrderHistoryScreen;
