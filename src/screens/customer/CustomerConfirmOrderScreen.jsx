import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft2, Edit2 } from 'iconsax-react-native';
import { colors } from '../../theme/colors';
import {
  useCart,
  useCartPrice,
  useDeliverySlots,
  usePlaceOrder,
} from '../../hooks/useCustomerQueries';
import toast from '../../utils/toast';
import logger from '../../utils/logger';

const fmt = n => '₹' + (n || 0).toLocaleString('en-IN');

// Today's date as YYYY-MM-DD for the deliveryDate payload.
const todayISODate = () => new Date().toISOString().slice(0, 10);

const DEFAULT_VENDOR = {
  name: 'Green Valley Organic Hub',
  tag: 'PREMIUM SUPPLIER',
  location: '4.2km away · Pune West',
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const CustomerConfirmOrderScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  // GET /customer/cart + /cart/price — actual order items & totals.
  const { data: cartRes, isLoading: cartLoading } = useCart();
  const { data: priceRes } = useCartPrice();
  // GET /customer/orders/slots — available delivery slots.
  const { data: slotsRes, isLoading: slotsLoading } = useDeliverySlots();

  const cart = cartRes?.data ?? {};
  const items = Array.isArray(cart.items) ? cart.items : [];
  const price = priceRes?.data ?? {};
  const total = price.customerTotal ?? cart.subtotal ?? 0;

  const slots = useMemo(
    () => (Array.isArray(slotsRes?.data) ? slotsRes.data : []),
    [slotsRes],
  );
  const [selectedSlot, setSelectedSlot] = useState(null);

  const placeOrderMutation = usePlaceOrder();

  // Log the raw slots response so the shape can be inspected.
  logger.log('[ConfirmOrder] GET /customer/orders/slots response:', JSON.stringify(slotsRes, null, 2));

  // Default to the first available slot once they load.
  useEffect(() => {
    if (!selectedSlot && slots.length) setSelectedSlot(slots[0]._id);
  }, [slots, selectedSlot]);

  // POST /customer/orders — the backend places the order from the server-side
  // cart; we send the order type, delivery date and the selected slot.
  const handlePlaceOrder = () => {
    if (!items.length) {
      toast.error('Empty cart', 'Your cart is empty.');
      return;
    }
    if (!selectedSlot) {
      toast.info('Select a slot', 'Please choose a delivery slot.');
      return;
    }

    // orderType follows the chosen slot (an emergency slot → emergency order),
    // defaulting to 'normal'.
    const slot = slots.find(s => s._id === selectedSlot);
    const orderType = slot?.isEmergency ? 'emergency' : 'normal';

    // Capture summary details now — the backend clears the cart on success, so
    // items/total would be gone by the time the success screen reads them.
    const itemCount = items.length;
    const slotLabel = slot ? `${slot.startTime} - ${slot.endTime}` : '';

    const payload = {
      vendorId: price.vendorId ?? cart.vendorId,
      orderType,
      deliveryDate: todayISODate(),
      deliverySlotId: selectedSlot,
    };
    logger.log('[ConfirmOrder] POST /customer/orders payload:', JSON.stringify(payload, null, 2));

    placeOrderMutation.mutate(payload, {
      onSuccess: res => {
        logger.log('[ConfirmOrder] POST /customer/orders response:', JSON.stringify(res, null, 2));
        const order = res?.data?.order ?? {};
        navigation.navigate('OrderSuccess', {
          orderId: order._id ?? null,
          total: order.totalAmount ?? total,
          itemCount,
          vendorName: DEFAULT_VENDOR.name,
          slotLabel,
        });
      },
      onError: err => {
        logger.log('[ConfirmOrder] place-order error:', err?.data ?? err);
        toast.error('Failed', err?.data?.message ?? 'Could not place your order.');
      },
    });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#faf8f5" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft2 size={22} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.pageTitle}>Confirm Order</Text>
            <Text style={styles.pageSubtitle}>Review your basket & delivery slot</Text>
          </View>
        </View>

        {/* Vendor Card */}
        <View style={styles.vendorCard}>
          <View style={styles.vendorLogoWrap}>
            <Text style={styles.vendorLogoEmoji}>🌾</Text>
          </View>
          <View style={styles.vendorMeta}>
            <Text style={styles.vendorName}>{DEFAULT_VENDOR.name}</Text>
            <View style={styles.vendorTagRow}>
              <View style={styles.greenDot} />
              <Text style={styles.vendorTag}>{DEFAULT_VENDOR.tag}</Text>
            </View>
            <Text style={styles.vendorLocation}>📍 {DEFAULT_VENDOR.location}</Text>
          </View>
        </View>

        {/* Manifest Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionLabel}>MANIFEST SUMMARY</Text>
            <View style={styles.itemsBadge}>
              <Text style={styles.itemsBadgeText}>{items.length} ITEMS</Text>
            </View>
          </View>
          <View style={styles.card}>
            {cartLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.manifestLoader} />
            ) : items.length === 0 ? (
              <Text style={styles.emptyManifest}>Your cart is empty.</Text>
            ) : (
              items.map((item, idx) => {
                const variant = item.variant || {};
                const product = variant.productId || {};
                const name = [product.name, variant.name].filter(Boolean).join(' · ') || variant.name;
                const lineTotal = (item.customerPrice || 0) * item.quantity;
                return (
                  <View key={String(item.productVariantId)}>
                    <View style={styles.manifestRow}>
                      <Text style={styles.manifestEmoji}>🛒</Text>
                      <View style={styles.manifestMeta}>
                        <Text style={styles.manifestName}>{name}</Text>
                        <Text style={styles.manifestVariant}>
                          Qty {item.quantity} · {fmt(item.customerPrice)} each
                        </Text>
                      </View>
                      <Text style={styles.manifestPrice}>{fmt(lineTotal)}</Text>
                    </View>
                    {idx < items.length - 1 && <View style={styles.sep} />}
                  </View>
                );
              })
            )}

            <View style={styles.manifestTotal}>
              <View>
                <Text style={styles.totalLabel}>Total Payable</Text>
                <Text style={styles.totalAmount}>{fmt(total)}</Text>
              </View>
              <TouchableOpacity
                style={styles.editCartBtn}
                onPress={() => navigation.goBack()}
                activeOpacity={0.75}>
                <Edit2 size={14} color={colors.primary} />
                <Text style={styles.editCartText}>Edit Cart</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Delivery Slots */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PREFERRED SLOT</Text>
          {slotsLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.slotLoader} />
          ) : slots.length === 0 ? (
            <Text style={styles.emptySlots}>No delivery slots available right now.</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.slotScroll}>
              {slots.map(slot => (
                <TouchableOpacity
                  key={String(slot._id)}
                  style={[styles.slotChip, selectedSlot === slot._id && styles.slotChipActive]}
                  onPress={() => setSelectedSlot(slot._id)}
                  activeOpacity={0.8}>
                  <Text style={[styles.slotChipText, selectedSlot === slot._id && styles.slotChipTextActive]}>
                    {slot.startTime} - {slot.endTime}
                  </Text>
                  {slot.isEmergency ? (
                    <Text style={[styles.slotChipSub, selectedSlot === slot._id && styles.slotChipTextActive]}>
                      Emergency
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Wallet — hidden for now until the wallet balance API is wired up.
        <View style={styles.section}>
          <View style={styles.walletCard}>
            <View style={styles.walletAvatar}>
              <Text style={styles.walletAvatarText}>G</Text>
            </View>
            <View style={styles.walletMeta}>
              <Text style={styles.walletLabel}>WALLET BALANCE</Text>
              <Text style={styles.walletAmount}>₹{walletBalance.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.sufficientBadge}>
              <View style={styles.sufficientDot} />
              <Text style={styles.sufficientText}>SUFFICIENT FUNDS</Text>
            </View>
          </View>
        </View> */}

      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[styles.placeOrderBtn, placeOrderMutation.isPending && styles.placeOrderBtnDisabled]}
          onPress={handlePlaceOrder}
          disabled={placeOrderMutation.isPending}
          activeOpacity={0.85}>
          {placeOrderMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.placeOrderText}>Place Order  →</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.legalText}>
          By tapping Place Order, you agree to our Sourcing Terms and quality guarantee.
        </Text>
        <Text style={styles.secureText}>🔒  Secure 256-bit Encrypted Transaction</Text>
      </View>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#faf8f5' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  pageSubtitle: { fontSize: 13, color: '#9ca3af', marginTop: 2 },

  // Vendor card
  vendorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    marginBottom: 16,
  },
  vendorLogoWrap: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center',
  },
  vendorLogoEmoji: { fontSize: 26 },
  vendorMeta: { flex: 1 },
  vendorName: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 4 },
  vendorTagRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  vendorTag: { fontSize: 10, fontWeight: '700', color: colors.primary, letterSpacing: 0.8 },
  vendorLocation: { fontSize: 12, color: '#9ca3af' },

  // Sections
  section: { marginHorizontal: 16, marginBottom: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#9ca3af', letterSpacing: 1.2, marginBottom: 10 },
  itemsBadge: {
    backgroundColor: '#fef9c3', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  itemsBadgeText: { fontSize: 10, fontWeight: '700', color: '#d97706' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },

  // Manifest
  manifestRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  manifestEmoji: { fontSize: 24, width: 34, textAlign: 'center' },
  manifestMeta: { flex: 1 },
  manifestName: { fontSize: 13, fontWeight: '700', color: colors.text },
  manifestVariant: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  manifestPrice: { fontSize: 14, fontWeight: '700', color: colors.text },
  manifestLoader: { paddingVertical: 16 },
  emptyManifest: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 12 },
  sep: { height: 1, backgroundColor: '#f3f4f6' },
  manifestTotal: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 12, marginTop: 4, borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  totalLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginBottom: 2 },
  totalAmount: { fontSize: 20, fontWeight: '800', color: colors.text },
  editCartBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  editCartText: { fontSize: 12, fontWeight: '600', color: colors.primary },

  // Slots
  slotScroll: { gap: 8, paddingRight: 4 },
  slotChip: {
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  slotChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotChipText: { fontSize: 13, fontWeight: '700', color: colors.text },
  slotChipSub: { fontSize: 10, fontWeight: '600', color: '#d97706', marginTop: 2 },
  slotChipTextActive: { color: '#fff' },
  slotLoader: { paddingVertical: 12, alignSelf: 'flex-start' },
  emptySlots: { fontSize: 13, color: '#9ca3af', paddingVertical: 8 },

  // Wallet
  walletCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  walletAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center',
  },
  walletAvatarText: { fontSize: 16, fontWeight: '800', color: colors.primary },
  walletMeta: { flex: 1 },
  walletLabel: { fontSize: 9, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.8 },
  walletAmount: { fontSize: 18, fontWeight: '800', color: colors.text },
  sufficientBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5,
  },
  sufficientDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  sufficientText: { fontSize: 9, fontWeight: '700', color: colors.primary, letterSpacing: 0.6 },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 10,
  },
  placeOrderBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 10,
  },
  placeOrderBtnDisabled: { opacity: 0.6 },
  placeOrderText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  legalText: { fontSize: 10, color: '#9ca3af', textAlign: 'center', lineHeight: 14, marginBottom: 4 },
  secureText: { fontSize: 10, color: '#9ca3af', textAlign: 'center' },
});

export default CustomerConfirmOrderScreen;
