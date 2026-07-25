import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft2,
  Truck,
  TickCircle,
  CloseCircle,
  Camera,
  Warning2,
} from 'iconsax-react-native';
import { colors } from '../../theme/colors';
import { useOrder } from '../../hooks/useCustomerQueries';
import {
  STATUS_META,
  shortOrderRef,
  formatOrderDate,
  slotLabel,
} from '../../utils/orderDisplay';
import logger from '../../utils/logger';

const fmt = n => '₹' + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

// ─── Complaint Sheet ──────────────────────────────────────────────────────────

const ComplaintSheet = ({ visible, items, onClose }) => {
  const [selected, setSelected] = useState({});
  const [comment, setComment] = useState('');

  const toggle = id => setSelected(p => ({ ...p, [id]: !p[id] }));

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={sheet.overlay}>
        <View style={sheet.card}>

          {/* Handle */}
          <View style={sheet.handle} />

          {/* Title row */}
          <View style={sheet.titleRow}>
            <View>
              <Text style={sheet.title}>Raise a Complaint</Text>
              <Text style={sheet.subtitle}>Tell us what went wrong</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={sheet.closeBtn}>
              <CloseCircle size={24} color="#9ca3af" variant="Bold" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={sheet.scroll}>

            {/* Upload Images */}
            <Text style={sheet.sectionLabel}>Upload Images</Text>
            <TouchableOpacity style={sheet.uploadBox} activeOpacity={0.7}>
              <Camera size={28} color="#9ca3af" variant="Linear" />
              <Text style={sheet.uploadText}>Click to upload photos</Text>
              <Text style={sheet.uploadHint}>Max 3 photos (JPG, PNG)</Text>
            </TouchableOpacity>

            {/* Select Items */}
            <Text style={sheet.sectionLabel}>Select Items to Report</Text>
            <View style={sheet.itemsBox}>
              {items.map((item, idx) => (
                <TouchableOpacity
                  key={item.id}
                  style={[sheet.itemRow, idx < items.length - 1 && sheet.itemBorder]}
                  onPress={() => toggle(item.id)}
                  activeOpacity={0.75}>
                  <Image source={{ uri: item.image }} style={sheet.itemImg} />
                  <Text style={sheet.itemName} numberOfLines={1}>{item.name}</Text>
                  <View style={[sheet.checkbox, selected[item.id] && sheet.checkboxActive]}>
                    {selected[item.id] && <TickCircle size={18} color="#fff" variant="Bold" />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Comments */}
            <Text style={sheet.sectionLabel}>Add Comments</Text>
            <TextInput
              style={sheet.commentInput}
              placeholder="Describe the issue with the products..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={comment}
              onChangeText={setComment}
            />

            {/* Submit */}
            <TouchableOpacity style={sheet.submitBtn} activeOpacity={0.85} onPress={onClose}>
              <Warning2 size={18} color="#fff" variant="Bold" />
              <Text style={sheet.submitText}>Submit Complaint</Text>
            </TouchableOpacity>

            <Text style={sheet.supportNote}>
              Our support team typically responds within 2 hours.
            </Text>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const CustomerOrderDetailScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [showComplaint, setShowComplaint] = useState(false);

  const orderId = route?.params?.orderId;
  const { data: orderRes, isLoading, isError, refetch } = useOrder(orderId);

  // Detailed log so the detail response shape can be inspected.
  logger.log('[OrderDetail] GET /customer/orders/:id response:', JSON.stringify(orderRes, null, 2));

  const detail = orderRes?.data ?? {};
  const order = detail.order ?? {};
  const apiItems = Array.isArray(detail.items) ? detail.items : [];
  const meta = STATUS_META[order.status] ?? STATUS_META.pending;
  const isDelivered = order.status === 'delivered';

  // Map API order items to a display shape (product populated under
  // productVariantId.productId). customerPrice isn't on the order item — it
  // stores the vendor priceAtTime — so we show the stored line totalPrice.
  const items = apiItems.map(it => {
    const variant = it.productVariantId || {};
    const product = variant.productId || {};
    return {
      id: it._id,
      name: [product.name, variant.name].filter(Boolean).join(' · ') || variant.name || 'Item',
      variant: `Qty ${it.quantity}`,
      image: product.imageUrl,
      total: it.totalPrice ?? 0,
    };
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#faf8f5" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !order._id) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#faf8f5" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft2 size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Couldn’t load this order.</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn} activeOpacity={0.85}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#faf8f5" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft2 size={22} color="#111827" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Order Details</Text>
          <Text style={styles.headerSub}>{shortOrderRef(order._id)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: meta.dot }]} />
          <Text style={[styles.statusText, { color: meta.text }]}>{meta.label}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: isDelivered ? 100 + insets.bottom : 24 },
        ]}>

        {/* Customer Information — not returned by the order detail API; hidden.
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CUSTOMER INFORMATION</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#f0fdf4' }]}>
                <User size={18} color={colors.primary} variant="Bold" />
              </View>
              <View style={styles.infoMeta}>
                <Text style={styles.infoTitle}>{order.customer.name}</Text>
                <Text style={styles.infoSub}>{order.customer.business}</Text>
              </View>
              <TouchableOpacity style={styles.callBtn} activeOpacity={0.75}>
                <Text style={styles.callBtnText}>📞</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.sep} />
            <View style={styles.addressRow}>
              <Location size={16} color="#9ca3af" variant="Bold" />
              <Text style={styles.addressText}>{order.customer.address}</Text>
            </View>
          </View>
        </View> */}

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {isDelivered ? 'ITEMS DELIVERED' : 'ITEMS ORDERED'}
          </Text>
          <View style={styles.card}>
            {items.map((item, idx) => (
              <View key={String(item.id)}>
                <View style={styles.itemRow}>
                  <Image
                    source={item.image ? { uri: item.image } : undefined}
                    style={styles.itemImg}
                  />
                  <View style={styles.itemMeta}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemVariant}>{item.variant}</Text>
                  </View>
                  <Text style={styles.itemTotal}>{fmt(item.total)}</Text>
                </View>
                {idx < items.length - 1 && <View style={styles.sep} />}
              </View>
            ))}

            {/* Pricing */}
            <View style={styles.pricingBox}>
              <View style={styles.priceLine}>
                <Text style={styles.priceLabel}>Items Subtotal</Text>
                <Text style={styles.priceValue}>{fmt(order.totalAmount)}</Text>
              </View>
              <View style={styles.priceLine}>
                <Text style={styles.priceLabel}>Logistics Fee</Text>
                <Text style={[styles.priceValue, { color: colors.primary, fontWeight: '700' }]}>FREE</Text>
              </View>
              <View style={[styles.priceLine, styles.totalLine]}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <View style={styles.totalRight}>
                  <Text style={styles.totalAmount}>{fmt(order.totalAmount)}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Delivery Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DELIVERY SUMMARY</Text>
          <View style={styles.card}>
            <View style={styles.logisticsRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#eff6ff' }]}>
                <Truck size={18} color="#1d4ed8" variant="Bold" />
              </View>
              <View>
                <Text style={styles.logisticsMiniLabel}>Order Type</Text>
                <Text style={styles.logisticsValue}>
                  {order.orderType === 'emergency' ? 'Emergency' : 'Normal'}
                </Text>
              </View>
            </View>
            <View style={styles.sep} />
            <View style={styles.driverRow}>
              <View style={styles.driverItem}>
                <Text style={styles.logisticsMiniLabel}>Delivery Date</Text>
                <Text style={styles.logisticsValue}>{formatOrderDate(order.deliveryDate)}</Text>
              </View>
              <View style={styles.driverItem}>
                <Text style={styles.logisticsMiniLabel}>Slot</Text>
                <Text style={styles.logisticsValue}>{slotLabel(order.deliverySlotId)}</Text>
              </View>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Raise Complaint Button — only for Delivered */}
      {isDelivered && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={styles.complaintBtn}
            onPress={() => setShowComplaint(true)}
            activeOpacity={0.85}>
            <Warning2 size={18} color="#d97706" variant="Bold" />
            <Text style={styles.complaintBtnText}>
              Raise Complaint for {shortOrderRef(order._id)}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ComplaintSheet
        visible={showComplaint}
        items={items}
        onClose={() => setShowComplaint(false)}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#faf8f5' },
  scroll: { padding: 16 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 24 },
  errorText: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  retryBtn: {
    backgroundColor: colors.primary, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 11,
  },
  retryText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  headerSub: { fontSize: 11, color: '#9ca3af', marginTop: 1, fontWeight: '600' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, marginLeft: 'auto',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: '#9ca3af',
    letterSpacing: 1.2, marginBottom: 10,
  },
  section: { marginBottom: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  sep: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 10 },

  // Customer info
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  infoMeta: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
  infoSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  callBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center',
  },
  callBtnText: { fontSize: 16 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  addressText: { flex: 1, fontSize: 12, color: '#6b7280', lineHeight: 18 },

  // Items
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  itemImg: { width: 52, height: 52, borderRadius: 10, backgroundColor: '#f3f4f6' },
  itemMeta: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  itemVariant: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  itemPrice: { fontSize: 11, color: colors.primary, fontWeight: '600', marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '800', color: '#111827' },

  // Pricing
  pricingBox: {
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
    marginTop: 10, paddingTop: 12,
  },
  priceLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  priceLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  priceValue: { fontSize: 13, fontWeight: '600', color: '#111827' },
  totalLine: {
    borderTopWidth: 1, borderTopColor: '#e5e7eb',
    marginTop: 6, paddingTop: 10,
  },
  totalLabel: { fontSize: 13, fontWeight: '800', color: '#111827' },
  totalRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  totalAmount: { fontSize: 16, fontWeight: '800', color: '#111827' },

  // Logistics
  logisticsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logisticsMiniLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '600', marginBottom: 2 },
  logisticsValue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  driverRow: { flexDirection: 'row', gap: 24 },
  driverItem: {},

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 8,
  },
  complaintBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fffbeb', borderRadius: 14, paddingVertical: 15,
    borderWidth: 1.5, borderColor: '#fde68a',
  },
  complaintBtnText: { fontSize: 14, fontWeight: '700', color: '#d97706' },
});

// ─── Complaint Sheet Styles ───────────────────────────────────────────────────

const sheet = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingHorizontal: 16,
    maxHeight: '90%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 16,
  },
  scroll: { paddingBottom: 32 },
  titleRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#9ca3af', marginTop: 3 },
  closeBtn: { padding: 2 },

  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: '#374151',
    marginBottom: 10, marginTop: 4,
  },

  // Upload
  uploadBox: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderStyle: 'dashed',
    borderRadius: 12, paddingVertical: 20, alignItems: 'center',
    backgroundColor: '#fafafa', marginBottom: 20, gap: 6,
  },
  uploadText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  uploadHint: { fontSize: 11, color: '#9ca3af' },

  // Items
  itemsBox: {
    backgroundColor: '#fafafa', borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 20,
  },
  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, padding: 12,
  },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  itemImg: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#f3f4f6' },
  itemName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#111827' },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: '#d1d5db',
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },

  // Comment
  commentInput: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 12, fontSize: 13, color: '#111827',
    minHeight: 90, backgroundColor: '#fafafa',
    marginBottom: 20,
  },

  // Submit
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#ef4444', borderRadius: 14, paddingVertical: 15,
    marginBottom: 12,
  },
  submitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  supportNote: {
    fontSize: 11, color: '#9ca3af', textAlign: 'center', lineHeight: 16,
  },
});

export default CustomerOrderDetailScreen;
