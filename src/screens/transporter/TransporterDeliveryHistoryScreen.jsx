import React from 'react';
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
import { Box, TickCircle, ArrowRight2 } from 'iconsax-react-native';
import { useTransporterOrders } from '../../hooks/useTransporterQueries';
import { colors } from '../../theme/colors';

const formatINR = amount =>
  '₹' + Number(amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

const formatDate = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTime = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
};

const HistoryCard = ({ order, onViewDetails }) => {
  // deliveredAt is set when the delivery OTP is verified; fall back to the
  // order's own timestamp for anything older that predates it.
  const when = order.deliveredAt ?? order.updatedAt;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.iconWrap}>
          <Box size={18} color={colors.primary} variant="Linear" />
        </View>
        <View style={styles.orderMeta}>
          <Text style={styles.orderId}>
            #{order.orderNumber ?? String(order._id).slice(-6)}
          </Text>
          <Text style={styles.orderDate}>
            {[formatDate(when), formatTime(when)].filter(Boolean).join(' • ')}
          </Text>
        </View>
        <View style={styles.deliveredBadge}>
          <TickCircle size={12} color="#166534" variant="Bold" />
          <Text style={styles.deliveredText}>Delivered</Text>
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

const TransporterDeliveryHistoryScreen = ({ navigation }) => {
  const { data, isLoading, error, refetch, isFetching } = useTransporterOrders('delivered');

  // paginated() responds { success, message, data: [...], pagination }.
  const orders = Array.isArray(data?.data) ? data.data : [];

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]} edges={['bottom']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FlatList
        data={orders}
        keyExtractor={item => String(item._id)}
        renderItem={({ item }) => (
          <HistoryCard
            order={item}
            onViewDetails={() =>
              navigation.navigate('TransporterOrderDetail', { id: item._id })
            }
          />
        )}
        ListHeaderComponent={
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Delivery History</Text>
            <Text style={styles.pageSubtitle}>Orders you have completed</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>
              {error ? "Couldn't load history" : 'No deliveries yet'}
            </Text>
            <Text style={styles.emptyBody}>
              {error
                ? error.message ?? 'Pull down to try again.'
                : 'Orders you deliver will be listed here.'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f7f4' },
  center: { alignItems: 'center', justifyContent: 'center' },

  pageHeader: { paddingTop: 20, paddingBottom: 16 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: colors.textSecondary },

  listContent: { paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1 },

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
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderMeta: { flex: 1 },
  orderId: { fontSize: 14, fontWeight: '800', color: colors.text },
  orderDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  deliveredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  deliveredText: { fontSize: 10, fontWeight: '700', color: '#166534' },

  divider: { height: 1, backgroundColor: '#f3f4f6' },

  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  amount: { fontSize: 15, fontWeight: '800', color: colors.text },
  viewDetailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewDetailsText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21 },
});

export default TransporterDeliveryHistoryScreen;
