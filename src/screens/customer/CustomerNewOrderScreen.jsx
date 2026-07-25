import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft2, SearchNormal1, ArrowDown2 } from 'iconsax-react-native';
import { colors } from '../../theme/colors';
import { VENDOR_INFO } from '../../constants/vendorCatalog';
import {
  useOrderProducts,
  useCustomerProfile,
  useAddCartItems,
  useCart,
  useClearCart,
} from '../../hooks/useCustomerQueries';
import toast from '../../utils/toast';
import logger from '../../utils/logger';

// Placeholder tint behind product images that have no imageUrl.
const IMG_BG = '#fef3c7';

// ─── Header ──────────────────────────────────────────────────────────────────

const ScreenHeader = ({ navigation }) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
      <ArrowLeft2 size={22} color={colors.text} />
    </TouchableOpacity>
    <View style={styles.headerMid}>
      <Text style={styles.vendorName}>{VENDOR_INFO.name}</Text>
      <Text style={styles.vendorSub}>{VENDOR_INFO.subtitle}</Text>
    </View>
    <Image source={{ uri: VENDOR_INFO.avatar }} style={styles.vendorAvatar} />
  </View>
);

// ─── Variant Row ──────────────────────────────────────────────────────────────

const VariantRow = ({ variant, qty, onQtyChange }) => {
  const handleQtyText = text => {
    const n = parseInt(text, 10);
    onQtyChange(isNaN(n) || n < 0 ? 0 : n);
  };

  return (
    <View style={styles.variantRow}>
      {qty > 0 && <View style={styles.variantAccent} />}
      <View style={styles.variantInfo}>
        <Text style={styles.variantName}>{variant.variantName}</Text>
        {variant.customerPrice != null ? (
          <Text style={styles.variantPrice}>₹{variant.customerPrice.toLocaleString('en-IN')}</Text>
        ) : null}
      </View>
      <TextInput
        style={[styles.qtyInput, qty > 0 && styles.qtyInputActive]}
        value={qty === 0 ? '' : String(qty)}
        onChangeText={handleQtyText}
        placeholder="0"
        placeholderTextColor="#9ca3af"
        keyboardType="numeric"
        maxLength={5}
        textAlign="center"
      />
    </View>
  );
};

// ─── Product Card ─────────────────────────────────────────────────────────────

const ProductCard = ({ item, expanded, onToggle, quantities, onQtyChange }) => {
  const product = item.product || {};
  const variants = Array.isArray(item.variants) ? item.variants : [];

  // How many of this product's variants currently have a quantity, so the
  // header can hint that the collapsed product has items in the cart.
  const selectedCount = variants.filter(v => (quantities[v.productVariantId] || 0) > 0).length;
  const hasSelection = selectedCount > 0;

  return (
    <View style={[styles.card, hasSelection && styles.cardSelected]}>
      <TouchableOpacity style={styles.cardHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={[styles.cardImgWrap, { backgroundColor: IMG_BG }]}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.cardImg} />
          ) : null}
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
          <Text style={styles.productSub}>
            {variants.length} {variants.length === 1 ? 'variant' : 'variants'}
            {selectedCount > 0 ? ` · ${selectedCount} added` : ''}
          </Text>
        </View>

        <View style={[styles.chevron, expanded && styles.chevronOpen]}>
          <ArrowDown2 size={18} color={colors.text} />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.variantList}>
          {variants.map(v => (
            <VariantRow
              key={String(v.productVariantId)}
              variant={v}
              qty={quantities[v.productVariantId] || 0}
              onQtyChange={qty => onQtyChange(v.productVariantId, qty)}
            />
          ))}
        </View>
      )}
    </View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const CustomerNewOrderScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();

  // Emergency vs. standard order — passed from Home based on the active
  // segment. Drives the `isEmergency=true` query param on the products call.
  const isEmergency = route?.params?.isEmergency ?? false;

  // GET /customer/orders/products (adds isEmergency=true when emergency).
  const { data: productsRes, isLoading, isError, refetch } = useOrderProducts(isEmergency);

  // The cart requires the vendorId. The products list belongs to a single
  // vendor (default or emergency) but doesn't carry its id, so read it from
  // the customer profile.
  const { data: profileRes } = useCustomerProfile();
  const profile = profileRes?.data ?? {};
  const vendorRef = isEmergency ? profile.emergencyVendorId : profile.defaultVendorId;
  // Populated object ({ _id, ... }) or a raw id string, depending on the call.
  const vendorId = vendorRef?._id ?? vendorRef ?? null;

  const addItems = useAddCartItems();
  const clearCartMutation = useClearCart();
  const [submitting, setSubmitting] = useState(false);

  // GET /customer/cart — used to preselect quantities for variants already in
  // the cart, so re-entering this screen reflects the current cart.
  const { data: cartRes } = useCart();
  const hasExistingCart = (cartRes?.data?.items?.length ?? 0) > 0;

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  // Quantities keyed by productVariantId across every product.
  const [quantities, setQuantities] = useState({});

  // Seed the quantities from the cart once it arrives, so variants already in
  // the cart show their quantity pre-filled. Seeded once per cart payload; the
  // user's edits afterward are preserved (we don't overwrite on every render).
  useEffect(() => {
    const cartItems = cartRes?.data?.items;
    if (!Array.isArray(cartItems) || !cartItems.length) return;
    const seeded = {};
    cartItems.forEach(i => {
      seeded[i.productVariantId] = i.quantity;
    });
    setQuantities(seeded);
  }, [cartRes]);

  // Which product rows are expanded (keyed by product._id).
  const [expanded, setExpanded] = useState({});

  // The response interceptor returns the whole `{ success, data }` body. Each
  // `data` item is one product with its `variants` array.
  const products = useMemo(
    () => (Array.isArray(productsRes?.data) ? productsRes.data : []),
    [productsRes],
  );

  // Auto-expand products that have a preselected (cart) variant so their
  // quantities are visible without tapping. Runs once both cart & products
  // are available.
  useEffect(() => {
    const cartItems = cartRes?.data?.items;
    if (!Array.isArray(cartItems) || !cartItems.length || !products.length) return;
    const cartVariantIds = new Set(cartItems.map(i => String(i.productVariantId)));
    const toExpand = {};
    products.forEach(p => {
      const hit = (p.variants || []).some(v => cartVariantIds.has(String(v.productVariantId)));
      if (hit && p.product?._id) toExpand[p.product._id] = true;
    });
    if (Object.keys(toExpand).length) {
      setExpanded(prev => ({ ...toExpand, ...prev }));
    }
  }, [cartRes, products]);

  const categories = useMemo(() => {
    const names = products
      .map(p => p.product?.category?.name)
      .filter(Boolean);
    return ['All', ...Array.from(new Set(names))];
  }, [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (activeCategory !== 'All') {
      list = list.filter(p => p.product?.category?.name === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => {
        const inName = p.product?.name?.toLowerCase().includes(q);
        const inVariant = (p.variants || []).some(v =>
          v.variantName?.toLowerCase().includes(q),
        );
        return inName || inVariant;
      });
    }
    return list;
  }, [products, activeCategory, search]);

  const toggleExpand = productId => {
    setExpanded(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  const handleQtyChange = (variantId, newQty) => {
    setQuantities(prev => ({ ...prev, [variantId]: newQty }));
  };

  // Flatten every product's variants into cart lines keyed by variant.
  const cartItems = useMemo(() => {
    const lines = [];
    for (const p of products) {
      for (const v of p.variants || []) {
        const qty = quantities[v.productVariantId] || 0;
        if (qty > 0) {
          lines.push({
            product: p.product,
            variant: v,
            qty,
            subtotal: (v.customerPrice || 0) * qty,
          });
        }
      }
    }
    return lines;
  }, [products, quantities]);

  const totalAmount = cartItems.reduce((sum, i) => sum + i.subtotal, 0);
  const totalItems = cartItems.reduce((sum, i) => sum + i.qty, 0);
  const hasCart = cartItems.length > 0;

  // The selected quantities on this screen represent the full desired cart
  // (they're seeded from the existing cart). Since the add endpoint *increments*
  // existing quantities, we clear the cart first so re-proceeding doesn't
  // double them, then add the current selection and move to the review screen.
  const handleProceed = async () => {
    if (!hasCart) return;
    if (!vendorId) {
      toast.error('No vendor', 'Could not determine your vendor. Please try again.');
      return;
    }

    setSubmitting(true);
    try {
      if (hasExistingCart) {
        logger.log('[NewOrder] DELETE /customer/cart (reset before re-add)');
        await clearCartMutation.mutateAsync();
      }

      const payload = {
        vendorId,
        items: cartItems.map(line => ({
          productVariantId: line.variant.productVariantId,
          quantity: line.qty,
        })),
      };
      logger.log('[NewOrder] POST /customer/cart/items payload:', JSON.stringify(payload, null, 2));
      const res = await addItems.mutateAsync(payload);
      logger.log('[NewOrder] POST /customer/cart/items response:', JSON.stringify(res, null, 2));
      navigation.navigate('OrderSummary');
    } catch (err) {
      logger.log('[NewOrder] add-to-cart error:', err?.data ?? err);
      toast.error('Failed', err?.data?.message ?? 'Could not add items to cart.');
    } finally {
      setSubmitting(false);
    }
  };

  const ListHeader = () => (
    <View>
      <ScreenHeader navigation={navigation} />

      {/* Search */}
      <View style={styles.searchWrap}>
        <SearchNormal1 size={16} color="#9ca3af" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search produce..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.catChip, activeCategory === cat && styles.catChipActive]}
            onPress={() => setActiveCategory(cat)}
            activeOpacity={0.75}>
            <Text style={[styles.catLabel, activeCategory === cat && styles.catLabelActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#faf8f5" />

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.product?._id)}
        renderItem={({ item }) => (
          <ProductCard
            item={item}
            expanded={!!expanded[item.product?._id]}
            onToggle={() => toggleExpand(item.product?._id)}
            quantities={quantities}
            onQtyChange={handleQtyChange}
          />
        )}
        extraData={{ quantities, expanded }}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : isError ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateText}>Couldn’t load products.</Text>
              <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn} activeOpacity={0.85}>
                <Text style={styles.proceedBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.stateBox}>
              <Text style={styles.stateText}>No products available.</Text>
            </View>
          )
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: hasCart ? 90 + insets.bottom : 24 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.rowGap} />}
      />

      {/* Cart Footer */}
      {hasCart && (
        <View style={[styles.cartFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.cartInfo}>
            <Text style={styles.cartLabel}>CART SUMMARY</Text>
            <Text style={styles.cartAmount}>
              ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
            <Text style={styles.cartCount}>{totalItems} Items</Text>
          </View>
          <TouchableOpacity
            style={[styles.proceedBtn, submitting && styles.proceedBtnDisabled]}
            onPress={handleProceed}
            disabled={submitting}
            activeOpacity={0.85}>
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.proceedBtnText}>Proceed Order  →</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#faf8f5' },
  listContent: { paddingTop: 4 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#faf8f5',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  headerMid: { flex: 1 },
  vendorName: { fontSize: 16, fontWeight: '800', color: colors.text },
  vendorSub: { fontSize: 10, fontWeight: '700', color: colors.primary, letterSpacing: 0.8, marginTop: 1 },
  vendorAvatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: '#dcfce7' },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },

  // Category chips
  catRow: { paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  catChipActive: { backgroundColor: '#d97706', borderColor: '#d97706' },
  catLabel: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  catLabelActive: { color: '#fff' },

  // Card (product)
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardSelected: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: '#f0fdf4',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  cardImgWrap: { width: 60, height: 60, borderRadius: 12, overflow: 'hidden' },
  cardImg: { width: '100%', height: '100%' },
  cardBody: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
  productSub: { fontSize: 12, fontWeight: '600', color: '#9ca3af' },
  chevron: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronOpen: { transform: [{ rotate: '180deg' }] },

  // Variant list (expanded)
  variantList: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  variantAccent: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  variantInfo: { flex: 1 },
  variantName: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 },
  variantPrice: { fontSize: 13, fontWeight: '700', color: colors.primary },

  // Qty input
  qtyInput: {
    width: 56,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  qtyInputActive: {
    backgroundColor: '#f0fdf4',
    borderColor: colors.primary,
  },
  rowGap: { height: 8 },

  // Loading / error / empty states
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 14,
  },
  stateText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  retryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },

  // Cart footer
  cartFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  cartInfo: { flex: 1 },
  cartLabel: { fontSize: 10, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.8 },
  cartAmount: { fontSize: 20, fontWeight: '800', color: colors.text, lineHeight: 26 },
  cartCount: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  proceedBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  proceedBtnDisabled: { opacity: 0.6 },
  proceedBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

export default CustomerNewOrderScreen;
