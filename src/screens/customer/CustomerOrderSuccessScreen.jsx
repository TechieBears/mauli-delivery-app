import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TickCircle } from 'iconsax-react-native';
import { colors } from '../../theme/colors';

const SummaryRow = ({ label, value, last }) => (
  <View style={[styles.summaryRow, !last && styles.summaryRowBorder]}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}</Text>
  </View>
);

const fmt = n => '₹' + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

// Short, human-friendly reference from the Mongo _id (last 6 chars, upper-cased).
const shortOrderRef = id => (id ? `#${String(id).slice(-6).toUpperCase()}` : '');

const CustomerOrderSuccessScreen = ({ navigation, route }) => {
  const { orderId, total, itemCount, vendorName, slotLabel } = route?.params ?? {};

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#faf8f5" />

      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <TickCircle size={72} color={colors.primary} variant="Bold" />
        </View>

        <Text style={styles.title}>Order Placed!</Text>
        {orderId ? <Text style={styles.orderId}>{shortOrderRef(orderId)}</Text> : null}
        <Text style={styles.subtitle}>
          Your order has been confirmed and is being prepared by the vendor.
        </Text>

        <View style={styles.summaryCard}>
          <SummaryRow label="Items" value={`${itemCount ?? 0} ${itemCount === 1 ? 'item' : 'items'}`} />
          <SummaryRow label="Total Paid" value={fmt(total)} />
          {vendorName ? <SummaryRow label="Vendor" value={vendorName} /> : null}
          <SummaryRow label="Delivery Slot" value={slotLabel || '—'} last />
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('OrderTracking')}
          activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Track Your Order  →</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('CustomerApp')}
          activeOpacity={0.85}>
          <Text style={styles.secondaryBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#faf8f5' },

  body: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconWrap: {
    width: 108, height: 108, borderRadius: 54,
    backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center',
    marginBottom: 22,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 4 },
  orderId: { fontSize: 13, fontWeight: '700', color: colors.primary, marginBottom: 10 },
  subtitle: {
    fontSize: 14, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 20, marginBottom: 28,
  },

  summaryCard: {
    width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10,
  },
  summaryRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  summaryLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  summaryValue: {
    fontSize: 13, fontWeight: '700', color: colors.text,
    flex: 1, textAlign: 'right', marginLeft: 12,
  },

  footer: { paddingHorizontal: 20, paddingBottom: 4, gap: 10 },
  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  secondaryBtn: {
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
});

export default CustomerOrderSuccessScreen;
