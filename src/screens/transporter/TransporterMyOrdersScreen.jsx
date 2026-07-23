import React, { useState } from 'react';
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
import { useTransporterOrders } from '../../hooks/useTransporterQueries';
import OrderRow from './OrderRow';
import { STATUS_ASSIGNED, STATUS_ACCEPTED } from './orderStatus';
import { colors } from '../../theme/colors';

const TABS = [
  {
    key: STATUS_ASSIGNED,
    label: 'Assigned',
    empty: 'No orders are waiting for pickup.',
  },
  {
    key: STATUS_ACCEPTED,
    label: 'Accepted',
    empty: 'Scan a vendor pickup QR to accept orders.',
  },
];

/**
 * The transporter's two order tables, reached from the profile screen:
 *   Assigned — transporter_assigned, given to them but not yet picked up
 *   Accepted — intransit, pickup confirmed via QR and currently being carried
 *
 * Both tabs stay mounted as queries (cheap, and keeps the header counts live);
 * only the active one's list is rendered.
 */
const TransporterMyOrdersScreen = ({ navigation, route }) => {
  const [active, setActive] = useState(
    route?.params?.tab === STATUS_ACCEPTED ? STATUS_ACCEPTED : STATUS_ASSIGNED,
  );

  const assigned = useTransporterOrders(STATUS_ASSIGNED);
  const accepted = useTransporterOrders(STATUS_ACCEPTED);

  const query = active === STATUS_ASSIGNED ? assigned : accepted;
  const orders = Array.isArray(query.data?.data) ? query.data.data : [];
  const tab = TABS.find(t => t.key === active);

  const countFor = q => q.data?.pagination?.total ?? (q.data?.data?.length ?? 0);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.tabs}>
        {TABS.map(t => {
          const on = t.key === active;
          const count = countFor(t.key === STATUS_ASSIGNED ? assigned : accepted);
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, on && styles.tabOn]}
              onPress={() => setActive(t.key)}
              activeOpacity={0.8}>
              <Text style={[styles.tabText, on && styles.tabTextOn]}>
                {t.label}
              </Text>
              <View style={[styles.badge, on && styles.badgeOn]}>
                <Text style={[styles.badgeText, on && styles.badgeTextOn]}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {query.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => String(item._id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching}
              onRefresh={query.refetch}
              tintColor={colors.primary}
            />
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
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>
                {query.error ? "Couldn't load orders" : 'Nothing here yet'}
              </Text>
              <Text style={styles.emptyBody}>
                {query.error
                  ? query.error.message ?? 'Pull down to try again.'
                  : tab?.empty}
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

  tabs: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
  },
  tabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  tabTextOn: { color: colors.surface },
  badge: {
    minWidth: 24,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: colors.border,
    alignItems: 'center',
  },
  badgeOn: { backgroundColor: 'rgba(255,255,255,0.25)' },
  badgeText: { fontSize: 12, fontWeight: '800', color: colors.textSecondary },
  badgeTextOn: { color: colors.surface },

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
