import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft2, Notification, TickCircle } from 'iconsax-react-native';
import { colors } from '../../theme/colors';
import {
  useCart,
  useCompareCartVendors,
  useClearCart,
  useAddCartItems,
} from '../../hooks/useCustomerQueries';
import toast from '../../utils/toast';

const fmt = n => '₹' + (n || 0).toLocaleString('en-IN');

// ─── Featured Card (cheapest / current-best vendor) ────────────────────────────

const FeaturedCard = ({ vendor, isSelected, onSelect, busy }) => (
  <View style={styles.featuredCard}>
    <View style={styles.featuredTop}>
      <View style={styles.featuredLogo}>
        <Text style={styles.logoEmoji}>🌿</Text>
      </View>
      <View style={styles.vendorInfo}>
        <Text style={styles.vendorName}>{vendor.vendorName || 'Vendor'}</Text>
        {/* Rating / distance not provided by compare-vendors API — hidden for now.
        <View style={styles.metaRow}>
          <Text style={styles.rating}>★ {vendor.rating}</Text>
          <Text style={styles.metaDot}> · </Text>
          <Text style={styles.distance}>{vendor.distance}</Text>
        </View> */}
        <Text style={styles.matchText}>
          {vendor.itemsMatched}/{vendor.totalItemsInCart} items available
        </Text>
      </View>
      <View style={styles.totalCol}>
        <Text style={styles.totalLabel}>TOTAL</Text>
        <Text style={styles.totalAmount}>{fmt(vendor.total)}</Text>
      </View>
    </View>

    <View style={styles.badgeRow}>
      {vendor.priceDifference < 0 ? (
        <View style={styles.savingsBadge}>
          <Text style={styles.savingsBadgeText}>{fmt(Math.abs(vendor.priceDifference))} cheaper</Text>
        </View>
      ) : null}
      {/* Delivery time not provided by the API — hidden for now.
      <View style={styles.deliveryBadge}>
        <Text style={styles.deliveryBadgeText}>⏱  {vendor.deliveryTime}</Text>
      </View> */}
    </View>

    <TouchableOpacity
      style={[styles.selectBtnGreen, isSelected && styles.selectedBtn]}
      onPress={onSelect}
      disabled={isSelected || busy}
      activeOpacity={0.85}>
      {busy ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : isSelected ? (
        <View style={styles.selectedRow}>
          <TickCircle size={18} color="#fff" variant="Bold" />
          <Text style={styles.selectBtnGreenText}>Selected</Text>
        </View>
      ) : (
        <Text style={styles.selectBtnGreenText}>Select Vendor</Text>
      )}
    </TouchableOpacity>
  </View>
);

// ─── Regular Card ─────────────────────────────────────────────────────────────

const VendorCard = ({ vendor, isSelected, onSelect, busy }) => (
  <View style={[styles.vendorCard, isSelected && styles.vendorCardSelected]}>
    <View style={styles.vendorCardTop}>
      <View style={styles.regularLogo}>
        <Text style={styles.logoEmoji}>🏪</Text>
      </View>
      <View style={styles.vendorInfo}>
        <Text style={styles.vendorName}>{vendor.vendorName || 'Vendor'}</Text>
        {/* Rating / distance not provided by compare-vendors API — hidden for now.
        <View style={styles.metaRow}>
          <Text style={styles.rating}>★ {vendor.rating}</Text>
          <Text style={styles.metaDot}> · </Text>
          <Text style={styles.distance}>{vendor.distance}</Text>
        </View> */}
        <Text style={styles.matchText}>
          {vendor.itemsMatched}/{vendor.totalItemsInCart} items available
        </Text>
        {vendor.priceDifference > 0 ? (
          <Text style={styles.diffText}>+{fmt(vendor.priceDifference)} difference</Text>
        ) : vendor.priceDifference < 0 ? (
          <Text style={styles.cheaperText}>{fmt(Math.abs(vendor.priceDifference))} cheaper</Text>
        ) : null}
      </View>
      <Text style={styles.vendorTotal}>{fmt(vendor.total)}</Text>
    </View>

    <TouchableOpacity
      style={[styles.selectBtnGray, isSelected && styles.selectedBtnGray]}
      onPress={onSelect}
      disabled={isSelected || busy || !vendor.allItemsAvailable}
      activeOpacity={0.8}>
      {busy ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Text style={[styles.selectBtnGrayText, isSelected && styles.selectedBtnGrayText]}>
          {isSelected ? 'Selected' : !vendor.allItemsAvailable ? 'Not all items available' : 'Select Vendor'}
        </Text>
      )}
    </TouchableOpacity>
  </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

const CustomerVendorComparisonScreen = ({ navigation }) => {
  const { data: cartRes } = useCart();
  const { data: compareRes, isLoading, isError, refetch } = useCompareCartVendors();
  const clearMutation = useClearCart();
  const addMutation = useAddCartItems();

  // Which vendor is being switched to right now (its vendorId), for the spinner.
  const [switchingId, setSwitchingId] = useState(null);

  const compare = compareRes?.data ?? {};
  const cartVendor = compare.cartVendor ?? null;
  const comparisons = Array.isArray(compare.comparisons) ? compare.comparisons : [];
  const cheapest = compare.cheapestVendor ?? null;

  // The cart's current items, needed to re-add them to a new vendor.
  const cartItems = Array.isArray(cartRes?.data?.items) ? cartRes.data.items : [];

  // The currently-selected vendor is whoever the cart currently belongs to.
  const selectedVendorId = cartVendor?.vendorId ?? null;

  // Feature the cheapest vendor at the top when it isn't already the cart's.
  const featured =
    cheapest && cheapest.vendorId !== selectedVendorId ? cheapest : null;
  // Remaining vendors (everything except whatever is featured).
  const others = comparisons.filter(v => !featured || v.vendorId !== featured.vendorId);

  // Switching vendors: the cart is single-vendor, so clear it and re-add the
  // same variants+quantities to the chosen vendor via the bulk add-to-cart API.
  const selectVendor = async vendor => {
    if (!vendor?.vendorId || vendor.vendorId === selectedVendorId) return;
    if (!cartItems.length) {
      toast.error('Empty cart', 'Your cart is empty.');
      return;
    }

    setSwitchingId(vendor.vendorId);
    try {
      await clearMutation.mutateAsync();

      const payload = {
        vendorId: vendor.vendorId,
        items: cartItems.map(i => ({
          productVariantId: i.productVariantId,
          quantity: i.quantity,
        })),
      };
      console.log('[VendorComparison] POST /customer/cart/items payload:', JSON.stringify(payload, null, 2));
      const res = await addMutation.mutateAsync(payload);
      console.log('[VendorComparison] POST /customer/cart/items response:', JSON.stringify(res, null, 2));

      toast.success('Vendor switched', `Now ordering from ${vendor.vendorName || 'the selected vendor'}.`);
      // Back to the order summary so the customer sees the updated cart/pricing.
      navigation.navigate('OrderSummary');
    } catch (err) {
      console.log('[VendorComparison] switch-vendor error:', err?.data ?? err);
      toast.error('Failed', err?.data?.message ?? 'Could not switch vendor.');
    } finally {
      setSwitchingId(null);
    }
  };

  const ListHeader = () => (
    <View>
      <View style={styles.pageHead}>
        <Text style={styles.hubTag}>↗  OPTIMIZATION HUB</Text>
        <Text style={styles.pageTitle}>Vendor Comparison</Text>
      </View>

      {/* Current vendor (the cart's vendor) shown as selected. */}
      {cartVendor ? (
        <VendorCard
          vendor={{
            ...cartVendor,
            itemsMatched: cartItems.length,
            totalItemsInCart: cartItems.length,
            priceDifference: 0,
            allItemsAvailable: true,
          }}
          isSelected
          busy={false}
          onSelect={() => {}}
        />
      ) : null}

      {featured && (
        <View style={styles.featuredWrap}>
          <FeaturedCard
            vendor={featured}
            isSelected={featured.vendorId === selectedVendorId}
            busy={switchingId === featured.vendorId}
            onSelect={() => selectVendor(featured)}
          />
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft2 size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mauli Mart</Text>
        <TouchableOpacity activeOpacity={0.7}>
          <Notification size={22} color={colors.text} variant="Linear" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>Couldn’t load vendor comparison.</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn} activeOpacity={0.85}>
            <Text style={styles.selectBtnGreenText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={others}
          keyExtractor={v => String(v.vendorId)}
          renderItem={({ item }) => (
            <VendorCard
              vendor={item}
              isSelected={item.vendorId === selectedVendorId}
              busy={switchingId === item.vendorId}
              onSelect={() => selectVendor(item)}
            />
          )}
          extraData={switchingId}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <View style={styles.stateBox}>
              <Text style={styles.stateText}>No other vendors available for your area.</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.rowGap} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#faf8f5' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.primary },

  // Page head
  listContent: { paddingBottom: 28 },
  pageHead: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14 },
  hubTag: { fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 0.8, marginBottom: 6 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: colors.text },

  rowGap: { height: 10 },
  featuredWrap: { marginTop: 10 },

  // States
  stateBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 14, paddingHorizontal: 16 },
  stateText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  retryBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 12,
  },

  // Shared
  logoEmoji: { fontSize: 22 },
  vendorInfo: { flex: 1, marginHorizontal: 10 },
  vendorName: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  rating: { fontSize: 12, fontWeight: '700', color: '#d97706' },
  metaDot: { fontSize: 12, color: '#d1d5db' },
  distance: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },
  matchText: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },

  // Featured card
  featuredCard: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: colors.primary,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
  },
  featuredTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  featuredLogo: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center',
  },
  totalCol: { alignItems: 'flex-end' },
  totalLabel: { fontSize: 9, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.8, marginBottom: 2 },
  totalAmount: { fontSize: 20, fontWeight: '800', color: colors.text },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  savingsBadge: {
    backgroundColor: '#dcfce7', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  savingsBadgeText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  deliveryBadge: {
    backgroundColor: '#eff6ff', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  deliveryBadgeText: { fontSize: 12, fontWeight: '600', color: '#1d4ed8' },
  selectBtnGreen: {
    backgroundColor: colors.primary, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  selectBtnGreenText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  selectedBtn: { backgroundColor: '#16a34a' },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  // Regular card
  vendorCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  vendorCardSelected: {
    borderColor: colors.primary, borderWidth: 1.5, backgroundColor: '#f0fdf4',
  },
  vendorCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  regularLogo: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  vendorTotal: { fontSize: 16, fontWeight: '800', color: colors.text },
  diffText: { fontSize: 11, fontWeight: '600', color: '#ef4444', marginTop: 3 },
  cheaperText: { fontSize: 11, fontWeight: '600', color: colors.primary, marginTop: 3 },
  selectBtnGray: {
    borderRadius: 12, paddingVertical: 11, alignItems: 'center',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  selectBtnGrayText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  selectedBtnGray: { borderColor: colors.primary, backgroundColor: '#dcfce7' },
  selectedBtnGrayText: { color: colors.primary, fontWeight: '700' },
});

export default CustomerVendorComparisonScreen;
