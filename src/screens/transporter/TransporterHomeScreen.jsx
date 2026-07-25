import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  useTransporterDashboardVendors,
  useTransporterOrders,
  useTransporterProfile,
} from '../../hooks/useTransporterQueries';
import { colors } from '../../theme/colors';
import LocationTracking from '../../services/LocationTrackingService';
import OrderRow from './OrderRow';
import VendorCard from './VendorCard';
import { STATUS_ASSIGNED, STATUS_ACCEPTED } from './orderStatus';

// "Good morning" before noon, "Good afternoon" until 17:00, else "Good evening".
const greetingForHour = hour => {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const TransporterHomeScreen = ({ navigation }) => {
  // Only orders still waiting for pickup — unfiltered would also count ones
  // already accepted or delivered.
  const { data, isLoading, error, refetch, isFetching } =
    useTransporterDashboardVendors(STATUS_ASSIGNED);
  const { data: profileRes } = useTransporterProfile();

  // Orders already picked up (confirm-pickup moved them to intransit).
  const { data: acceptedRes, refetch: refetchAccepted } =
    useTransporterOrders(STATUS_ACCEPTED);
  const accepted = Array.isArray(acceptedRes?.data) ? acceptedRes.data : [];

  // While the Home screen is focused and the rider has a delivery in transit,
  // make sure location tracking is running for that vehicle. start() is
  // idempotent and, once running, its foreground interval pushes the location
  // repeatedly (every 10s) the whole time this screen is visible. If there are
  // no in-transit orders we do nothing — idle riders are never tracked. This
  // also re-arms tracking after an app restart, where start() would otherwise
  // never have been called.
  const inTransitVehicle = accepted[0]?.deliveryBoy?.vehicleNo ?? null;
  useFocusEffect(
    useCallback(() => {
      if (accepted.length > 0 && inTransitVehicle) {
        LocationTracking.start(inTransitVehicle);
      }
    }, [accepted.length, inTransitVehicle]),
  );

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
            countLabel="PENDING"
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
