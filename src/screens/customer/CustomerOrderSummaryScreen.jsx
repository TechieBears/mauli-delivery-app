import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft2, Trash } from 'iconsax-react-native';
import { colors } from '../../theme/colors';
import {
  useCart,
  useCartPrice,
  useRemoveCartItem,
  useClearCart,
  useCompareCartVendors,
} from '../../hooks/useCustomerQueries';
import toast from '../../utils/toast';
import logger from '../../utils/logger';

const IMG_BG = '#fef3c7';

const fmt = n => '₹' + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

// ─── Cart Row ─────────────────────────────────────────────────────────────────

const CartRow = ({ item, onRemove, removing }) => {
  // From buildCartResponse: variant is the populated ProductVariant with its
  // parent product under `productId`.
  const variant = item.variant || {};
  const product = variant.productId || {};
  const name = [product.name, variant.name].filter(Boolean).join(' · ') || variant.name || 'Item';
  const lineTotal = (item.customerPrice || 0) * item.quantity;

  return (
    <View style={styles.cartRow}>
      <View style={[styles.rowImg, { backgroundColor: IMG_BG }]}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.rowImgInner} />
        ) : null}
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowName} numberOfLines={1}>{name}</Text>
          <Text style={styles.rowPrice}>{fmt(lineTotal)}</Text>
        </View>
        <View style={styles.rowBottom}>
          <View style={styles.qtyBadge}>
            <Text style={styles.qtyText}>{String(item.quantity).padStart(2, '0')}</Text>
          </View>
          <Text style={styles.rowPackaging}>
            {item.isAvailable ? fmt(item.customerPrice) + ' each' : 'Unavailable'}
          </Text>
          <TouchableOpacity
            onPress={onRemove}
            disabled={removing}
            activeOpacity={0.7}
            style={styles.trashBtn}>
            <Trash size={16} color="#ef4444" variant="Bold" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ─── Price Line ───────────────────────────────────────────────────────────────

const PriceLine = ({ label, value, isFree, isTotal }) => (
  <View style={[styles.priceLine, isTotal && styles.priceTotalLine]}>
    <Text style={[styles.priceLineLabel, isTotal && styles.priceTotalLabel]}>{label}</Text>
    <Text style={[
      styles.priceLineValue,
      isFree && styles.priceLineFree,
      isTotal && styles.priceTotalValue,
    ]}>{value}</Text>
  </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

const CustomerOrderSummaryScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  // GET /customer/cart — live items & subtotal.
  const { data: cartRes, isLoading: cartLoading, isError: cartError, refetch: refetchCart } = useCart();
  // GET /customer/cart/price — order-accurate totals.
  const { data: priceRes, isLoading: priceLoading } = useCartPrice();

  const removeMutation = useRemoveCartItem();
  const clearMutation = useClearCart();

  const cart = cartRes?.data ?? {};
  const items = Array.isArray(cart.items) ? cart.items : [];
  const price = priceRes?.data ?? {};

  // GET /customer/cart/compare-vendors — only once the cart is known to have
  // items (the backend 400s on an empty cart).
  const {
    data: compareRes,
    isError: compareError,
    error: compareErr,
  } = useCompareCartVendors(items.length > 0);

  // Detailed logs so the raw API shapes can be inspected/shared.
  logger.log('[OrderSummary] GET /customer/cart response:', JSON.stringify(cartRes, null, 2));
  logger.log('[OrderSummary] GET /customer/cart/price response:', JSON.stringify(priceRes, null, 2));
  logger.log('[OrderSummary] GET /customer/cart/compare-vendors response:', JSON.stringify(compareRes, null, 2));
  if (compareError) {
    logger.log('[OrderSummary] compare-vendors error:', compareErr?.data ?? compareErr);
  }

  const subtotal = price.customerTotal ?? cart.subtotal ?? 0;
  const canCheckout = price.canCheckout ?? items.length > 0;
  const loading = cartLoading || priceLoading;

  // Vendor comparison: a cheaper vendor exists when the backend reports
  // isSavingMoney: false AND returns a cheapestVendor with positive savings.
  const compare = compareRes?.data ?? {};
  const cheaperVendor = !compare.isSavingMoney ? compare.cheapestVendor : null;
  const potentialSavings = compare.potentialSavings ?? 0;
  const canSave = !!cheaperVendor && potentialSavings > 0;
  // Whether there are any other vendors at all to switch between.
  const hasOtherVendors = (compare.comparisons?.length ?? 0) > 0;

  const handleRemove = variantId => {
    logger.log('[OrderSummary] DELETE /customer/cart/items/%s', variantId);
    removeMutation.mutate(variantId, {
      onSuccess: res => logger.log('[OrderSummary] remove response:', JSON.stringify(res, null, 2)),
      onError: err => {
        logger.log('[OrderSummary] remove error:', err?.data ?? err);
        toast.error('Failed', err?.data?.message ?? 'Could not remove item.');
      },
    });
  };

  const handleClear = () => {
    logger.log('[OrderSummary] DELETE /customer/cart (clear)');
    clearMutation.mutate(undefined, {
      onSuccess: res => logger.log('[OrderSummary] clear response:', JSON.stringify(res, null, 2)),
      onError: err => {
        logger.log('[OrderSummary] clear error:', err?.data ?? err);
        toast.error('Failed', err?.data?.message ?? 'Could not clear cart.');
      },
    });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#faf8f5" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>

        {/* Page header */}
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft2 size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.journeyTag}>CHECKOUT JOURNEY</Text>
          <Text style={styles.pageTitle}>Order Summary</Text>
          <Text style={styles.pageSubtitle}>
            Review your selected organic produce and choose your fulfillment partner.
          </Text>
        </View>

        {loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : cartError ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateText}>Couldn’t load your cart.</Text>
            <TouchableOpacity onPress={() => refetchCart()} style={styles.retryBtn} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateText}>Your cart is empty.</Text>
          </View>
        ) : (
          <>
            {/* Order items card */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>ORDER ITEMS</Text>
                <TouchableOpacity onPress={handleClear} disabled={clearMutation.isPending} activeOpacity={0.7}>
                  <Text style={styles.clearLink}>Clear all</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.itemsCard}>
                {items.map((item, idx) => (
                  <View key={String(item.productVariantId)}>
                    <CartRow
                      item={item}
                      removing={removeMutation.isPending}
                      onRemove={() => handleRemove(item.productVariantId)}
                    />
                    {idx < items.length - 1 && <View style={styles.itemSep} />}
                  </View>
                ))}
              </View>
            </View>

            {/* Pricing breakdown card */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>PRICING BREAKDOWN</Text>
              <View style={styles.pricingCard}>
                <PriceLine label="Items Subtotal" value={fmt(subtotal)} />
                <PriceLine label="Logistics Fee" value="FREE" isFree />
                <View style={styles.priceDivider} />
                <PriceLine label="Grand Total" value={fmt(subtotal)} isTotal />
              </View>
            </View>
          </>
        )}

      </ScrollView>

      {/* Sticky CTAs */}
      {items.length > 0 && (
        <View style={[styles.ctas, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={[styles.primaryBtn, !canCheckout && styles.primaryBtnDisabled]}
            onPress={() => navigation.navigate('CreditDue')}
            disabled={!canCheckout}
            activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>
              {canSave
                ? 'Continue with Default Vendor  →'
                : 'Continue — You’re getting the best price  →'}
            </Text>
          </TouchableOpacity>

          {hasOtherVendors ? (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('VendorComparison')}
              activeOpacity={0.85}>
              <Text style={styles.secondaryBtnText}>
                {canSave
                  ? `✦  Save ${fmt(potentialSavings)} by comparing with other vendors`
                  : '⇄  Switch vendor'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#faf8f5' },
  scroll: { paddingBottom: 16 },

  // Page header
  pageHeader: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  journeyTag: { fontSize: 10, fontWeight: '700', color: colors.primary, letterSpacing: 1.2, marginBottom: 6 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 6 },
  pageSubtitle: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },

  // Section
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#9ca3af', letterSpacing: 1.2, marginBottom: 10 },
  clearLink: { fontSize: 12, fontWeight: '700', color: '#ef4444', marginBottom: 10 },

  // States
  stateBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 14 },
  stateText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  retryBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 12,
  },

  // Items card
  itemsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 14,
  },
  rowImg: { width: 56, height: 56, borderRadius: 12, overflow: 'hidden' },
  rowImgInner: { width: '100%', height: '100%' },
  rowBody: { flex: 1, gap: 8 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowName: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text, marginRight: 8 },
  rowPrice: { fontSize: 15, fontWeight: '800', color: colors.text },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBadge: {
    backgroundColor: colors.primary, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  qtyText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  rowPackaging: { flex: 1, fontSize: 12, color: '#9ca3af', fontWeight: '500' },
  trashBtn: { padding: 4 },
  itemSep: { height: 1, backgroundColor: '#f3f4f6' },

  // Pricing card
  pricingCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  priceLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  priceTotalLine: { paddingTop: 14 },
  priceLineLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  priceTotalLabel: { fontSize: 16, fontWeight: '800', color: colors.text },
  priceLineValue: { fontSize: 13, fontWeight: '600', color: colors.text },
  priceLineFree: { color: colors.primary, fontWeight: '700' },
  priceTotalValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  priceDivider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 4 },

  // Sticky CTAs
  ctas: {
    backgroundColor: '#faf8f5',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  secondaryBtn: {
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.primary, backgroundColor: '#f0fdf4',
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },
});

export default CustomerOrderSummaryScreen;
