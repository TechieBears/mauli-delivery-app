import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Phone } from 'phosphor-react-native';
import { colors } from '../../theme/colors';
import { formatAddress, telHref } from './orderStatus';

/**
 * One vendor in a pickup list — name, address, tap-to-call number and how many
 * of their orders are still waiting for pickup. Shared by the home screen and
 * the Assigned filter in Order History so both entry points into the pickup
 * flow look identical.
 *
 * `vendor` is a row from GET /transporter/dashboard/vendors:
 *   { vendorId, vendorName, vendorPhone, address, orderCount }
 */
const VendorCard = ({ vendor, onPress, countLabel = 'ORDERS' }) => {
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
            {count} {countLabel}
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
            Linking.openURL(telHref(vendor.vendorPhone));
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

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
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
});

export default VendorCard;
