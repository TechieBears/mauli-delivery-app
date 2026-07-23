import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Phone, MapPin, Package, QrCode, Truck } from 'phosphor-react-native';
import { useTransporterDashboardVendors } from '../../hooks/useTransporterQueries';
import PickupConfirmModal from './PickupConfirmModal';
import usePickupFlow from './usePickupFlow';
import { formatAddress, STATUS_ASSIGNED } from './orderStatus';
import { colors } from '../../theme/colors';

const TransporterVendorDetailScreen = ({ navigation, route }) => {
  const vendor = route?.params?.vendor ?? {};
  const address = formatAddress(vendor.address);

  // The count passed in nav params is a snapshot from whenever the list was
  // last fetched, so it goes stale the moment a pickup is confirmed. Re-read the
  // pending-only count here (served from cache) and fall back to the param.
  const { data: vendorsRes } = useTransporterDashboardVendors(STATUS_ASSIGNED);
  const liveVendor = (vendorsRes?.data ?? []).find(
    v => String(v.vendorId) === String(vendor.vendorId),
  );
  const orderCount = liveVendor?.orderCount ?? vendor.orderCount ?? 0;

  const {
    scan,
    closeScan,
    scanning,
    confirming,
    openScanner,
    confirmPickup,
    vehicles,
    effectiveVehicle,
    setVehicleNo,
  } = usePickupFlow({
    navigation,
    vendorName: vendor.vendorName,
    onConfirmed: () => navigation.goBack(),
  });

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.vendorName}>{vendor.vendorName ?? 'Vendor'}</Text>

          <View style={styles.countChip}>
            <Package size={14} color={colors.primary} weight="fill" />
            <Text style={styles.countText}>
              {orderCount} pending {orderCount === 1 ? 'order' : 'orders'}
            </Text>
          </View>

          {address ? (
            <View style={styles.row}>
              <MapPin size={18} color={colors.textMuted} weight="fill" />
              <Text style={styles.rowText}>{address}</Text>
            </View>
          ) : null}

          {vendor.vendorPhone ? (
            <TouchableOpacity
              style={styles.row}
              onPress={() => Linking.openURL(`tel:${vendor.vendorPhone}`)}
              activeOpacity={0.7}>
              <Phone size={18} color={colors.primary} weight="fill" />
              <Text style={[styles.rowText, styles.link]}>{vendor.vendorPhone}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {vehicles.length > 1 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Vehicle for this pickup</Text>
            <View style={styles.vehicleWrap}>
              {vehicles.map(plate => {
                const on = effectiveVehicle === plate;
                return (
                  <TouchableOpacity
                    key={plate}
                    style={[styles.vehicle, on && styles.vehicleOn]}
                    onPress={() => setVehicleNo(plate)}
                    activeOpacity={0.8}>
                    <Truck
                      size={16}
                      color={on ? colors.surface : colors.textSecondary}
                      weight="fill"
                    />
                    <Text style={[styles.vehicleText, on && styles.vehicleTextOn]}>
                      {plate}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.scanBtn, scanning && styles.scanBtnBusy]}
          onPress={openScanner}
          disabled={scanning}
          activeOpacity={0.85}>
          <QrCode size={22} color={colors.surface} weight="bold" />
          <Text style={styles.scanBtnText}>
            {scanning ? 'Reading QR…' : 'Scan pickup QR'}
          </Text>
        </TouchableOpacity>
      </View>

      <PickupConfirmModal
        visible={!!scan}
        scan={scan}
        submitting={confirming}
        onClose={closeScan}
        onConfirm={confirmPickup}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: 20 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  vendorName: { fontSize: 22, fontWeight: '800', color: colors.text },
  countChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },
  countText: { fontSize: 12, fontWeight: '800', color: colors.primary },

  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  rowText: { flex: 1, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  link: { color: colors.primary, fontWeight: '700' },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  vehicleWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vehicle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
  },
  vehicleOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  vehicleText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  vehicleTextOn: { color: colors.surface },

  footer: {
    padding: 20,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
  },
  scanBtnBusy: { opacity: 0.7 },
  scanBtnText: { fontSize: 16, fontWeight: '800', color: colors.surface },
});

export default TransporterVendorDetailScreen;
