import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Phone, MapPin, Package } from 'phosphor-react-native';
import { useTransporterOrders } from '../../hooks/useTransporterQueries';
import OrderRow from './OrderRow';
import { formatAddress, telHref, statusConfig } from './orderStatus';
import { colors } from '../../theme/colors';

/**
 * One vendor's orders for a single status — reached by tapping a vendor in the
 * Vendor view of Order History. Vendor details sit at the top, that vendor's
 * orders below.
 *
 * The API has no per-vendor order endpoint, so this fetches the transporter's
 * orders for `status` and filters client-side by vendorId. That's exact rather
 * than approximate: `vendorId` is on every order, and the list is already
 * scoped to this transporter.
 */
const TransporterVendorOrdersScreen = ({ navigation, route }) => {
  const vendor = route?.params?.vendor ?? {};
  const status = route?.params?.status;

  const { data, isLoading, error, refetch, isFetching } = useTransporterOrders(status);

  const orders = (Array.isArray(data?.data) ? data.data : []).filter(
    o => String(o.vendorId) === String(vendor.vendorId),
  );

  const address = formatAddress(vendor.address);
  const cfg = statusConfig(status);

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
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.vendorCard}>
              <Text style={styles.vendorName}>{vendor.vendorName ?? 'Vendor'}</Text>

              <View style={[styles.chip, { backgroundColor: cfg.bg }]}>
                <Package size={13} color={cfg.text} weight="fill" />
                <Text style={[styles.chipText, { color: cfg.text }]}>
                  {orders.length} {cfg.label}
                </Text>
              </View>

              {address ? (
                <View style={styles.row}>
                  <MapPin size={16} color={colors.textMuted} weight="fill" />
                  <Text style={styles.rowText}>{address}</Text>
                </View>
              ) : null}

              {vendor.vendorPhone ? (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => Linking.openURL(telHref(vendor.vendorPhone))}
                  activeOpacity={0.7}>
                  <Phone size={16} color={colors.primary} weight="fill" />
                  <Text style={[styles.rowText, styles.link]}>
                    {vendor.vendorPhone}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <Text style={styles.sectionTitle}>Orders</Text>
          </>
        }
        renderItem={({ item }) => (
          <OrderRow
            order={item}
            onPress={() =>
              navigation.navigate('TransporterOrderDetail', { id: item._id })
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {error ? "Couldn't load orders" : 'No orders here'}
            </Text>
            <Text style={styles.emptyBody}>
              {error
                ? error.message ?? 'Pull down to try again.'
                : 'This vendor has no orders in this state.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  list: { padding: 20, flexGrow: 1 },

  vendorCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  vendorName: { fontSize: 20, fontWeight: '800', color: colors.text },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },
  chipText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  rowText: { flex: 1, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  link: { color: colors.primary, fontWeight: '700' },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textSecondary,
    marginBottom: 12,
  },

  empty: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 32 },
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

export default TransporterVendorOrdersScreen;
