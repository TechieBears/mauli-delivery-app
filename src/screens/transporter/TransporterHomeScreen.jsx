import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useTransporterOrders,
  useTransporterProfile,
} from '../../hooks/useTransporterQueries';
import { colors } from '../../theme/colors';

// Backend order enum: pending | confirmed | ready_for_pickup | intransit |
// delivered | rejected | cancelled. A transporter only ever sees the last two
// active states plus delivered, so only those are styled here.
const STATUS_CONFIG = {
  ready_for_pickup: { label: 'READY FOR PICKUP', bg: '#fef9c3', text: '#a16207' },
  intransit: { label: 'IN TRANSIT', bg: '#dbeafe', text: '#1d4ed8' },
  delivered: { label: 'DELIVERED', bg: '#dcfce7', text: '#15803d' },
};

const formatAddress = address => {
  if (!address) return '';
  if (typeof address === 'string') return address;
  return [address.line, address.city, address.pincode].filter(Boolean).join(', ');
};

const OrderCard = ({ order, onPress }) => {
  const cfg = STATUS_CONFIG[order.status] ?? {
    label: String(order.status ?? '').toUpperCase(),
    bg: colors.background,
    text: colors.textSecondary,
  };
  const customer = order.customerId;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardTop}>
        <Text style={styles.orderNo}>#{order.orderNumber ?? String(order._id).slice(-6)}</Text>
        <View style={[styles.chip, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.chipText, { color: cfg.text }]}>{cfg.label}</Text>
        </View>
      </View>

      {customer?.businessName || customer?.name ? (
        <Text style={styles.customer}>{customer.businessName ?? customer.name}</Text>
      ) : null}

      {formatAddress(customer?.address) ? (
        <Text style={styles.address} numberOfLines={2}>
          {formatAddress(customer.address)}
        </Text>
      ) : null}

      {order.totalAmount != null ? (
        <Text style={styles.amount}>₹{order.totalAmount}</Text>
      ) : null}
    </TouchableOpacity>
  );
};

// "Good morning" before noon, "Good afternoon" until 17:00, else "Good evening".
const greetingForHour = hour => {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const TransporterHomeScreen = ({ navigation }) => {
  const { data, isLoading, error, refetch, isFetching } = useTransporterOrders();
  const { data: profileRes } = useTransporterProfile();

  const firstName = (profileRes?.data?.userId?.name ?? '').split(' ')[0];
  const greeting = greetingForHour(new Date().getHours());

  // paginated() responds { success, message, data: [...], pagination }.
  const orders = Array.isArray(data?.data) ? data.data : [];

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={['top']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      <View style={styles.header}>
        <Text style={styles.greeting} numberOfLines={1}>
          {greeting}
          {firstName ? `, ${firstName}` : ''}
        </Text>
        <Text style={styles.subtitle}>Recent orders</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={item => String(item._id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />
        }
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() => navigation.navigate('TransporterOrderDetail', { id: item._id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>
              {error ? "Couldn't load deliveries" : 'No deliveries yet'}
            </Text>
            <Text style={styles.emptyBody}>
              {error
                ? error.message ?? 'Please pull down to try again.'
                : 'Orders assigned to you will show up here.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  // The screen omits the 'bottom' safe-area edge (the tab bar owns it), so the
  // list pads itself enough for the last card to clear the tab bar.
  listContent: { paddingHorizontal: 24, paddingBottom: 24, flexGrow: 1 },

  card: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: colors.inputBg,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderNo: { fontSize: 15, fontWeight: '800', color: colors.text },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  chipText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  customer: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 },
  address: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  amount: { fontSize: 15, fontWeight: '800', color: colors.primary, marginTop: 10 },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
});

export default TransporterHomeScreen;
