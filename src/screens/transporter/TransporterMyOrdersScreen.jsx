import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useTransporterOrders,
  useTransporterDashboardVendors,
} from '../../hooks/useTransporterQueries';
import OrderRow from './OrderRow';
import VendorCard from './VendorCard';
import { STATUS_ASSIGNED, STATUS_ACCEPTED } from './orderStatus';
import { colors } from '../../theme/colors';

const VIEW_VENDORS = 'vendors';
const VIEW_ORDERS = 'orders';

const FILTERS = [
  {
    key: STATUS_ACCEPTED,
    label: 'Accepted',
    empty: 'Scan a vendor pickup QR to accept orders.',
  },
  {
    key: STATUS_ASSIGNED,
    label: 'Assigned',
    empty: 'No vendors have orders waiting for pickup.',
  },
  {
    key: 'delivered',
    label: 'Delivered',
    empty: 'Orders you deliver will be listed here.',
  },
];

/**
 * The transporter's full order history, reached from the profile. One list with
 * three status capsules:
 *   Accepted  — intransit, picked up and currently being carried
 *   Assigned  — grouped BY VENDOR, mirroring the home screen
 *   Delivered — handed over and OTP-verified
 *
 * Accepted and Delivered can each be seen two ways, via a Vendor/Orders toggle:
 * grouped by vendor (tap through to that vendor's orders) or as a flat order
 * list. Assigned is always vendor-grouped — a pickup QR is issued per vendor and
 * covers all of that vendor's orders at once, so "which vendor do I collect from
 * next" is the only useful framing there, and tapping a vendor opens the same
 * vendor detail screen the home screen uses, which owns the scan → confirm flow.
 *
 * All queries stay mounted so the capsule counts remain live; only the active
 * filter's list is rendered.
 */
const TransporterMyOrdersScreen = ({ navigation, route }) => {
  const initial = FILTERS.some(f => f.key === route?.params?.tab)
    ? route.params.tab
    : STATUS_ACCEPTED;
  const [active, setActive] = useState(initial);
  const [view, setView] = useState(VIEW_ORDERS);

  // Order lists per status, plus the grouped-by-vendor view of each.
  const orderQueries = {
    [STATUS_ACCEPTED]: useTransporterOrders(STATUS_ACCEPTED),
    [STATUS_ASSIGNED]: useTransporterOrders(STATUS_ASSIGNED),
    delivered: useTransporterOrders('delivered'),
  };
  const vendorQueries = {
    [STATUS_ACCEPTED]: useTransporterDashboardVendors(STATUS_ACCEPTED),
    [STATUS_ASSIGNED]: useTransporterDashboardVendors(STATUS_ASSIGNED),
    delivered: useTransporterDashboardVendors('delivered'),
  };

  // Assigned has no order view — it is always grouped by vendor.
  const isVendorList = active === STATUS_ASSIGNED || view === VIEW_VENDORS;
  const query = isVendorList ? vendorQueries[active] : orderQueries[active];
  const rows = Array.isArray(query.data?.data) ? query.data.data : [];
  const filter = FILTERS.find(f => f.key === active);

  // Badges always count ORDERS, never vendors, so they agree with the profile
  // stats and the home screen chips regardless of which view is showing.
  const countFor = key =>
    orderQueries[key].data?.pagination?.total ??
    (orderQueries[key].data?.data?.length ?? 0);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}>
          {FILTERS.map(f => {
            const on = f.key === active;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.capsule, on && styles.capsuleOn]}
                onPress={() => setActive(f.key)}
                activeOpacity={0.8}>
                <Text style={[styles.capsuleText, on && styles.capsuleTextOn]}>
                  {f.label}
                </Text>
                <View style={[styles.badge, on && styles.badgeOn]}>
                  <Text style={[styles.badgeText, on && styles.badgeTextOn]}>
                    {countFor(f.key)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Assigned is vendor-only, so the toggle would be a no-op there. */}
        {active !== STATUS_ASSIGNED ? (
          <View style={styles.viewToggle}>
            {[
              { key: VIEW_VENDORS, label: 'Vendor' },
              { key: VIEW_ORDERS, label: 'Orders' },
            ].map(v => {
              const on = view === v.key;
              return (
                <TouchableOpacity
                  key={v.key}
                  style={[styles.viewBtn, on && styles.viewBtnOn]}
                  onPress={() => setView(v.key)}
                  activeOpacity={0.8}>
                  <Text style={[styles.viewText, on && styles.viewTextOn]}>
                    {v.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </View>

      {query.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item =>
            String(isVendorList ? item.vendorId : item._id)
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching}
              onRefresh={query.refetch}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) =>
            isVendorList ? (
              <VendorCard
                vendor={item}
                countLabel={active === STATUS_ASSIGNED ? 'PENDING' : undefined}
                onPress={() =>
                  // Assigned leads into the pickup flow; the other statuses just
                  // drill down to that vendor's orders.
                  active === STATUS_ASSIGNED
                    ? navigation.navigate('TransporterVendorDetail', { vendor: item })
                    : navigation.navigate('TransporterVendorOrders', {
                        vendor: item,
                        status: active,
                      })
                }
              />
            ) : (
              <OrderRow
                order={item}
                onPress={() =>
                  navigation.navigate('TransporterOrderDetail', { id: item._id })
                }
              />
            )
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>
                {query.error ? "Couldn't load orders" : 'Nothing here yet'}
              </Text>
              <Text style={styles.emptyBody}>
                {query.error
                  ? query.error.message ?? 'Pull down to try again.'
                  : filter?.empty}
              </Text>
            </View>
          }
        />
      )}

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 48,
  },

  filterBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterRow: { paddingHorizontal: 20, paddingVertical: 14, gap: 10 },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
  },
  capsuleOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  capsuleText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  capsuleTextOn: { color: colors.surface },
  badge: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 11,
    backgroundColor: colors.border,
    alignItems: 'center',
  },
  badgeOn: { backgroundColor: 'rgba(255,255,255,0.25)' },
  badgeText: { fontSize: 12, fontWeight: '800', color: colors.textSecondary },
  badgeTextOn: { color: colors.surface },

  // Segmented Vendor/Orders switch under the status capsules.
  viewToggle: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 4,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  viewBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
  },
  viewBtnOn: { backgroundColor: colors.surface },
  viewText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  viewTextOn: { color: colors.text },

  list: { padding: 20, flexGrow: 1 },

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

export default TransporterMyOrdersScreen;
