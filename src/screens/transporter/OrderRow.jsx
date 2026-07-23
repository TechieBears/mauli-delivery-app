import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Phone, MapPin } from 'phosphor-react-native';
import { colors } from '../../theme/colors';
import {
  statusConfig,
  formatAddress,
  orderLabel,
  customerName,
  customerPhone,
  telHref,
} from './orderStatus';

/**
 * One order in a transporter-facing list. Shared by the home screen's accepted
 * strip and both tables on the profile so a given order looks the same
 * everywhere. Tapping opens TransporterOrderDetail.
 */
const OrderRow = ({ order, onPress, compact }) => {
  const cfg = statusConfig(order.status);
  const customer = order.customerId;
  const address = formatAddress(customer?.address);
  const name = customerName(customer);
  const phone = customerPhone(customer);

  return (
    <TouchableOpacity
      style={[styles.card, compact && styles.cardCompact]}
      onPress={onPress}
      activeOpacity={0.85}>
      <View style={styles.top}>
        <Text style={styles.orderNo}>{orderLabel(order)}</Text>
        <View style={[styles.chip, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.chipText, { color: cfg.text }]}>{cfg.label}</Text>
        </View>
      </View>

      {name ? (
        <Text style={styles.customer} numberOfLines={1}>
          {name}
        </Text>
      ) : null}

      {address ? (
        <View style={styles.infoRow}>
          <MapPin size={14} color={colors.textMuted} weight="fill" />
          <Text style={styles.address} numberOfLines={compact ? 1 : 2}>
            {address}
          </Text>
        </View>
      ) : null}

      {phone ? (
        // Nested in the card's touchable, so the tap is stopped here — otherwise
        // dialling would also push the order detail screen.
        <TouchableOpacity
          style={styles.infoRow}
          onPress={e => {
            e.stopPropagation();
            Linking.openURL(telHref(phone));
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Phone size={14} color={colors.primary} weight="fill" />
          <Text style={styles.phone}>{phone}</Text>
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
  cardCompact: { padding: 14, marginBottom: 10 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderNo: { fontSize: 15, fontWeight: '800', color: colors.text },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  chipText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  customer: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  address: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  phone: { fontSize: 13, fontWeight: '700', color: colors.primary },
});

export default OrderRow;
