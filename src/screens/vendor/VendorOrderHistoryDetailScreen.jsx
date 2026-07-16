import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft2,
  Printer,
  More,
  Location,
  Call,
  Truck,
  TickCircle,
  DocumentText1,
  Receipt21,
} from 'iconsax-react-native';
import { colors } from '../../theme/colors';
import { ORDER_HISTORY } from '../../constants/orderHistory';

const formatINR = n =>
  '₹' + (n / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });

// ─── Header ──────────────────────────────────────────────────────────────────

const DetailHeader = ({ orderId, onBack }) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={onBack} style={styles.headerBtn} activeOpacity={0.7}>
      <ArrowLeft2 size={20} color={colors.text} variant="Linear" />
    </TouchableOpacity>

    <View style={styles.headerCenter}>
      <Text style={styles.headerTitle}>Order #{orderId}</Text>
      <View style={styles.deliveredRow}>
        <View style={styles.deliveredDot} />
        <Text style={styles.deliveredLabel}>DELIVERED</Text>
      </View>
    </View>

    <View style={styles.headerRight}>
      <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
        <Printer size={18} color={colors.text} variant="Linear" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
        <More size={18} color={colors.text} variant="Linear" />
      </TouchableOpacity>
    </View>
  </View>
);

// ─── Customer card ────────────────────────────────────────────────────────────

const CustomerCard = ({ customer }) => (
  <View style={styles.customerCard}>
    <View style={styles.customerTop}>
      <Image source={{ uri: customer.avatar }} style={styles.avatar} />
      <View>
        <Text style={styles.customerName}>{customer.name}</Text>
        <Text style={styles.customerBusiness}>{customer.business}</Text>
      </View>
    </View>
    <View style={styles.infoRow}>
      <Location size={14} color={colors.textMuted} variant="Linear" />
      <Text style={styles.infoText}>{customer.address}</Text>
    </View>
    <View style={styles.infoRow}>
      <Call size={14} color={colors.textMuted} variant="Linear" />
      <Text style={styles.infoText}>{customer.phone}</Text>
    </View>
  </View>
);

// ─── Order Manifest ───────────────────────────────────────────────────────────

const ManifestSection = ({ items }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Order Manifest</Text>
      <View style={styles.itemsBadge}>
        <Text style={styles.itemsBadgeText}>{items.length} Items</Text>
      </View>
    </View>
    {items.map((item, idx) => (
      <View key={item.id} style={[styles.manifestRow, idx < items.length - 1 && styles.manifestBorder]}>
        <Image source={{ uri: item.image }} style={styles.itemImage} />
        <View style={styles.itemMeta}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemDetail}>{item.detail}</Text>
        </View>
        <View style={styles.itemPriceCol}>
          <Text style={styles.itemPrice}>{formatINR(item.price)}</Text>
          {item.organic && <Text style={styles.organicTag}>Org.</Text>}
        </View>
      </View>
    ))}
  </View>
);

// ─── Delivery Logistics ───────────────────────────────────────────────────────

const DeliverySection = ({ delivery }) => (
  <View style={styles.deliveryCard}>
    <View style={styles.deliveryHeader}>
      <View style={styles.truckIconWrap}>
        <Truck size={18} color="#92400e" variant="Linear" />
      </View>
      <Text style={styles.deliveryTitle}>Delivery Logistics</Text>
    </View>
    <View style={styles.deliveryRow}>
      <Location size={13} color="#92400e" variant="Linear" />
      <Text style={styles.deliveryText}>{delivery.type}</Text>
    </View>
    <View style={styles.deliveryRow}>
      <TickCircle size={13} color="#92400e" variant="Linear" />
      <Text style={styles.deliveryText}>Delivered: {delivery.deliveredAt}</Text>
    </View>
  </View>
);

// ─── Order Summary ────────────────────────────────────────────────────────────

const SummarySection = ({ summary }) => (
  <View style={styles.summaryCard}>
    <View style={styles.summaryHeader}>
      <Text style={styles.summaryTitle}>ORDER SUMMARY</Text>
      <Receipt21 size={16} color="rgba(255,255,255,0.6)" variant="Linear" />
    </View>

    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>Subtotal</Text>
      <Text style={styles.summaryValue}>{formatINR(summary.subtotal)}</Text>
    </View>
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>Delivery Fee</Text>
      <Text style={[styles.summaryValue, summary.deliveryFee === 0 && styles.freeTag]}>
        {summary.deliveryFee === 0 ? 'FREE' : formatINR(summary.deliveryFee)}
      </Text>
    </View>
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>Tax ({summary.taxRate}%)</Text>
      <Text style={styles.summaryValue}>{formatINR(summary.tax)}</Text>
    </View>

    <View style={styles.summaryDivider} />

    <Text style={styles.grandTotalLabel}>Grand Total (Paid)</Text>
    <View style={styles.grandTotalRow}>
      <Text style={styles.grandTotalAmount}>{formatINR(summary.total)}</Text>
      <View style={styles.cardChip}>
        <Text style={styles.cardChipText}>Card ••{summary.paymentLast4}</Text>
      </View>
    </View>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const VendorOrderHistoryDetailScreen = ({ navigation, route }) => {
  const { orderId } = route.params;
  const order = ORDER_HISTORY.find(o => o.id === orderId);

  if (!order) return null;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <DetailHeader orderId={order.id} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <CustomerCard customer={order.customer} />
        <ManifestSection items={order.items} />
        <DeliverySection delivery={order.delivery} />
        <SummarySection summary={order.summary} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f7f4' },
  scrollContent: { paddingBottom: 32 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerBtn: { padding: 6 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  deliveredRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  deliveredDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  deliveredLabel: { fontSize: 10, fontWeight: '700', color: colors.primary, letterSpacing: 0.8 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },

  // Customer
  customerCard: {
    backgroundColor: colors.surface,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  customerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e5e7eb',
  },
  customerName: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 2 },
  customerBusiness: { fontSize: 13, fontWeight: '600', color: colors.primary },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  infoText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },

  // Section shared
  section: {
    backgroundColor: colors.surface,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text },

  // Items badge
  itemsBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  itemsBadgeText: { fontSize: 11, fontWeight: '700', color: '#6d28d9' },

  // Manifest
  manifestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  manifestBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
  },
  itemMeta: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 3 },
  itemDetail: { fontSize: 11, color: colors.textMuted },
  itemPriceCol: { alignItems: 'flex-end', gap: 3 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: colors.text },
  organicTag: { fontSize: 10, fontWeight: '700', color: '#d97706' },

  // Delivery
  deliveryCard: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    padding: 16,
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  truckIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryTitle: { fontSize: 14, fontWeight: '800', color: '#92400e' },
  deliveryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  deliveryText: { fontSize: 13, color: '#92400e', fontWeight: '500' },

  // Summary
  summaryCard: {
    backgroundColor: '#1b5e20',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 20,
    padding: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  summaryValue: { fontSize: 13, fontWeight: '600', color: '#fff' },
  freeTag: { color: '#86efac', fontWeight: '700' },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 12,
  },
  grandTotalLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    marginBottom: 6,
  },
  grandTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  grandTotalAmount: { fontSize: 32, fontWeight: '900', color: '#fff' },
  cardChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  cardChipText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
});

export default VendorOrderHistoryDetailScreen;
