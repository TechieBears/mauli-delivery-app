import React, { useCallback, useState } from 'react';
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
import {
  useScanPickupQr,
  useConfirmPickup,
  useTransporterProfile,
} from '../../hooks/useTransporterQueries';
import PickupConfirmModal from './PickupConfirmModal';
import { colors } from '../../theme/colors';
import toast from '../../utils/toast';

const formatAddress = address => {
  if (!address) return '';
  if (typeof address === 'string') return address;
  return [address.line, address.city, address.state, address.pincode]
    .filter(Boolean)
    .join(', ');
};

const TransporterVendorDetailScreen = ({ navigation, route }) => {
  const vendor = route?.params?.vendor ?? {};
  const address = formatAddress(vendor.address);
  const orderCount = vendor.orderCount ?? 0;

  const [scan, setScan] = useState(null);
  const [vehicleNo, setVehicleNo] = useState(null);

  const { data: profileRes } = useTransporterProfile();
  const vehicles = (profileRes?.data?.vehicles ?? [])
    .map(v => v?.vehicleNo)
    .filter(Boolean);

  const { mutate: scanQr, isPending: scanning } = useScanPickupQr();
  const { mutate: confirm, isPending: confirming } = useConfirmPickup();

  // The backend only lets vehicleNo be omitted when exactly one vehicle is on
  // file; with several it 400s asking which one. Default to the sole vehicle so
  // the common case needs no picker.
  const effectiveVehicle = vehicleNo ?? (vehicles.length === 1 ? vehicles[0] : null);

  const handleScanned = useCallback(
    token => {
      scanQr(token, {
        onSuccess: res => setScan(res?.data ?? null),
        onError: err =>
          toast.error(
            'Scan failed',
            err?.message ?? 'This QR code could not be read.',
          ),
      });
    },
    [scanQr],
  );

  const openScanner = () => {
    if (vehicles.length > 1 && !effectiveVehicle) {
      toast.warning('Pick a vehicle', 'Choose which vehicle is making this pickup.');
      return;
    }
    navigation.navigate('PickupScanner', {
      vendorName: vendor.vendorName,
      onScanned: handleScanned,
    });
  };

  const handleConfirm = () => {
    confirm(
      { token: scan?.token, vehicleNo: effectiveVehicle },
      {
        onSuccess: res => {
          const assigned = res?.data?.assigned?.length ?? 0;
          setScan(null);
          toast.success(
            'Pickup confirmed',
            `${assigned} ${assigned === 1 ? 'order is' : 'orders are'} now in transit.`,
          );
          navigation.goBack();
        },
        onError: err =>
          toast.error(
            'Could not confirm pickup',
            err?.message ?? 'Please try again.',
          ),
      },
    );
  };

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
        onClose={() => setScan(null)}
        onConfirm={handleConfirm}
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
