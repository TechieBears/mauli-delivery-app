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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Phone } from 'phosphor-react-native';
import {
  useTransporterDashboardVendors,
  useTransporterOrders,
  useTransporterProfile,
} from '../../hooks/useTransporterQueries';
import { colors } from '../../theme/colors';
import OrderRow from './OrderRow';
import { formatAddress, STATUS_ACCEPTED } from './orderStatus';

const VendorCard = ({ vendor, onPress }) => {
  const address = formatAddress(vendor.address);
  const count = vendor.orderCount ?? 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardTop}>
        <Text style={styles.vendorName} numberOfLines={1}>
          {vendor.vendorName ?? 'Vendor'}
        </Text>
        <View style={styles.chip}>
          <Text style={styles.chipText}>
            {count} {count === 1 ? 'ORDER' : 'ORDERS'}
          </Text>
        </View>
      </View>

      {address ? (
        <Text style={styles.address} numberOfLines={2}>
          {address}
        </Text>
      ) : null}

      {vendor.vendorPhone ? (
        // Nested inside the card's touchable, so the tap is stopped here —
        // otherwise dialling would also push the vendor detail screen.
        <TouchableOpacity
          style={styles.phoneRow}
          onPress={e => {
            e.stopPropagation();
            Linking.openURL(`tel:${vendor.vendorPhone}`);
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Phone size={16} color={colors.primary} weight="fill" />
          <Text style={styles.phone}>{vendor.vendorPhone}</Text>
        </TouchableOpacity>
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
  const { data, isLoading, error, refetch, isFetching } =
    useTransporterDashboardVendors();
  const { data: profileRes } = useTransporterProfile();

  // Orders already picked up (confirm-pickup moved them to intransit).
  const { data: acceptedRes, refetch: refetchAccepted } =
    useTransporterOrders(STATUS_ACCEPTED);
  const accepted = Array.isArray(acceptedRes?.data) ? acceptedRes.data : [];

  const firstName = (profileRes?.data?.userId?.name ?? '').split(' ')[0];
  const greeting = greetingForHour(new Date().getHours());

  // Responds { success, message, data: [...] } — one row per vendor.
  const vendors = Array.isArray(data?.data) ? data.data : [];

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
      </View>

      <FlatList
        data={vendors}
        keyExtractor={item => String(item.vendorId)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={() => {
              refetch();
              refetchAccepted();
            }}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <>
            {accepted.length ? (
              <View style={styles.acceptedBlock}>
                <Text style={styles.sectionTitle}>
                  Accepted · in transit ({accepted.length})
                </Text>
                {accepted.map(order => (
                  <OrderRow
                    key={String(order._id)}
                    order={order}
                    compact
                    onPress={() =>
                      navigation.navigate('TransporterOrderDetail', {
                        id: order._id,
                      })
                    }
                  />
                ))}
              </View>
            ) : null}
            <Text style={styles.sectionTitle}>Your vendors</Text>
          </>
        }
        renderItem={({ item }) => (
          <VendorCard
            vendor={item}
            onPress={() =>
              navigation.navigate('TransporterVendorDetail', { vendor: item })
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>
              {error ? "Couldn't load vendors" : 'No vendors yet'}
            </Text>
            <Text style={styles.emptyBody}>
              {error
                ? error.message ?? 'Please pull down to try again.'
                : 'Vendors with orders assigned to you will show up here.'}
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  // Separates the in-transit strip from the vendor list below it.
  acceptedBlock: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  vendorName: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text, marginRight: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
  },
  chipText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6, color: colors.primary },
  address: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 },
  phone: { fontSize: 14, fontWeight: '700', color: colors.primary },

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
