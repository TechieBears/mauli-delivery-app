import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Location, Call, Truck, TickCircle, Box } from 'iconsax-react-native';
import { useTransporterOrder } from '../../hooks/useTransporterQueries';
import {
  formatAddress,
  orderLabel,
  customerName,
  customerPhone,
  telHref,
} from './orderStatus';
import { colors } from '../../theme/colors';

const formatDateTime = iso => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}, ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`;
};

const STATUS_CONFIG = {
  transporter_assigned: { label: 'ASSIGNED', color: '#a16207' },
  intransit: { label: 'IN TRANSIT', color: '#1d4ed8' },
  delivered: { label: 'DELIVERED', color: '#15803d' },
};

const InfoRow = ({ Icon, text }) =>
  text ? (
    <View style={styles.infoRow}>
      <Icon size={14} color={colors.textMuted} variant="Linear" />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  ) : null;

const TransporterOrderDetailScreen = ({ route }) => {
  const id = route?.params?.id;
  const { data, isLoading, error } = useTransporterOrder(id);

  // GET /transporter/orders/:id resolves to { order, items }.
  const order = data?.data?.order;
  const items = Array.isArray(data?.data?.items) ? data.data.items : [];

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]} edges={['bottom']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]} edges={['bottom']}>
        <Text style={styles.emptyTitle}>Couldn't load this order</Text>
        <Text style={styles.emptyBody}>{error?.message ?? 'Please try again.'}</Text>
      </SafeAreaView>
    );
  }

  const cfg = STATUS_CONFIG[order.status] ?? {
    label: String(order.status ?? '').toUpperCase(),
    color: colors.textSecondary,
  };
  const customer = order.customerId;
  const isDelivered = order.status === 'delivered';

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Summary */}
        <View style={styles.headerCard}>
          <Text style={styles.orderId}>{orderLabel(order)}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
            <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Customer */}
        {customer ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Customer</Text>
            {customerName(customer) ? (
              <Text style={styles.customerName}>{customerName(customer)}</Text>
            ) : null}
            <InfoRow Icon={Location} text={formatAddress(customer.address)} />
            {customerPhone(customer) ? (
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => Linking.openURL(telHref(customerPhone(customer)))}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Call size={14} color={colors.primary} variant="Bold" />
                <Text style={[styles.infoText, styles.phoneText]}>
                  {customerPhone(customer)}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* Items */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Order Manifest</Text>
            <View style={styles.itemsBadge}>
              <Text style={styles.itemsBadgeText}>{items.length} Items</Text>
            </View>
          </View>

          {items.length === 0 ? (
            <Text style={styles.infoText}>No items listed for this order.</Text>
          ) : (
            items.map((item, idx) => {
              const variant = item.productVariantId;
              const product = variant?.productId;
              return (
                <View
                  key={String(item._id)}
                  style={[styles.itemRow, idx < items.length - 1 && styles.itemBorder]}>
                  <View style={styles.itemIcon}>
                    <Box size={16} color={colors.primary} variant="Linear" />
                  </View>
                  <View style={styles.itemMeta}>
                    <Text style={styles.itemName}>{product?.name ?? 'Item'}</Text>
                    <Text style={styles.itemDetail}>
                      {[item.quantity ? `Qty ${item.quantity}` : null, product?.unit]
                        .filter(Boolean)
                        .join(' • ')}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Delivery */}
        <View style={styles.deliveryCard}>
          <View style={styles.deliveryHeader}>
            <View style={styles.truckIconWrap}>
              <Truck size={18} color="#92400e" variant="Linear" />
            </View>
            <Text style={styles.deliveryTitle}>Delivery</Text>
          </View>
          {order.deliveryBoy?.vehicleNo ? (
            <View style={styles.deliveryRow}>
              <Truck size={13} color="#92400e" variant="Linear" />
              <Text style={styles.deliveryText}>Vehicle: {order.deliveryBoy.vehicleNo}</Text>
            </View>
          ) : null}
          {isDelivered ? (
            <>
              <View style={styles.deliveryRow}>
                <TickCircle size={13} color="#92400e" variant="Linear" />
                <Text style={styles.deliveryText}>
                  Delivered: {formatDateTime(order.deliveredAt)}
                </Text>
              </View>
              {order.receiver?.name ? (
                <View style={styles.deliveryRow}>
                  <TickCircle size={13} color="#92400e" variant="Linear" />
                  <Text style={styles.deliveryText}>
                    Received by: {order.receiver.name}
                    {order.receiver.phone ? ` (${order.receiver.phone})` : ''}
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.deliveryRow}>
              <Location size={13} color="#92400e" variant="Linear" />
              <Text style={styles.deliveryText}>Not delivered yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f7f4' },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  scroll: { padding: 16, paddingBottom: 32 },

  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  orderId: { fontSize: 20, fontWeight: '800', color: colors.text },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 6 },
  customerName: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  infoText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  phoneText: { color: colors.primary, fontWeight: '700' },

  itemsBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  itemsBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primary },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  itemIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemMeta: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '700', color: colors.text },
  itemDetail: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  deliveryCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  deliveryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  truckIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryTitle: { fontSize: 14, fontWeight: '800', color: '#92400e' },
  deliveryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  deliveryText: { flex: 1, fontSize: 13, color: '#92400e', lineHeight: 19 },

  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
  emptyBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
});

export default TransporterOrderDetailScreen;
