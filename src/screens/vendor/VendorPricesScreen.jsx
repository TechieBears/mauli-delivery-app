import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import toast from '../../utils/toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import {
  SearchIcon,
  SaveIcon,
  InventoryBoxIcon,
} from '../../components/vendor/VendorIcons';
import AppHeader from '../../components/AppHeader';
import {
  useVendorPricing,
  useBulkUpdatePricing,
  useVendorPricingStatus,
} from '../../hooks/useVendorQueries';
import useAppStore from '../../store/useAppStore';
import { resetToRoleSelection } from '../../navigation/navigationRef';

// Groups the flat /vendor/pricing array (one entry per variant) into product
// cards: [{ productName, unit, variants: [{ productVariantId, variantName, currentPrice }] }]
const groupByProduct = pricingList => {
  const map = new Map();
  (pricingList ?? []).forEach(entry => {
    const key = entry.productName || entry.productVariantId;
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        name: entry.productName || 'Unnamed product',
        unit: entry.unit || '',
        variants: [],
      });
    }
    map.get(key).variants.push(entry);
  });
  return Array.from(map.values());
};

const PriceVariantRow = ({ label, value, onChange, placeholder, editable }) => (
  <View style={styles.variantRow}>
    <Text style={styles.variantLabel}>{label}</Text>
    <View style={[styles.priceInputWrap, !editable && styles.priceInputWrapDisabled]}>
      <Text style={styles.currency}>₹</Text>
      <TextInput
        style={styles.priceInput}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholder={placeholder || '0.00'}
        placeholderTextColor={colors.textMuted}
        editable={editable}
      />
    </View>
  </View>
);

const PriceItemCard = ({ item, prices, onPriceChange, editable }) => (
  <View style={styles.itemCard}>
    <View style={styles.itemHeader}>
      <View style={styles.itemMeta}>
        <Text style={styles.itemName}>{item.name}</Text>
        {item.unit ? <Text style={styles.itemDesc}>Unit: {item.unit}</Text> : null}
      </View>
    </View>
    {item.variants.map(variant => (
      <PriceVariantRow
        key={variant.productVariantId}
        label={variant.variantName || variant.unit || '—'}
        value={prices[variant.productVariantId] ?? ''}
        onChange={text => onPriceChange(variant.productVariantId, text)}
        placeholder={variant.currentPrice != null ? String(variant.currentPrice) : '0.00'}
        editable={editable}
      />
    ))}
  </View>
);

const VendorPricesScreen = () => {
  const [search, setSearch] = useState('');
  const [prices, setPrices] = useState({});
  const [isEditing, setIsEditing] = useState(false);

  const { data: pricingRes, isLoading, error } = useVendorPricing();
  const { data: statusRes } = useVendorPricingStatus();
  const { mutateAsync: bulkUpdate, isPending: saving } = useBulkUpdatePricing();
  const logout = useAppStore(state => state.logout);

  // Locked = pricing not yet completed. In this state the vendor is confined to
  // this screen (the tab bar blocks the other tabs) and must set every price.
  const pricingLocked = statusRes?.data?.isPricingCompleted === false;

  const pricingList = useMemo(() => pricingRes?.data ?? [], [pricingRes]);
  const products = useMemo(() => groupByProduct(pricingList), [pricingList]);

  // Seed the editable price map from the vendor's current prices whenever
  // fresh data arrives.
  useEffect(() => {
    const next = {};
    pricingList.forEach(entry => {
      next[entry.productVariantId] = entry.currentPrice != null ? String(entry.currentPrice) : '';
    });
    setPrices(next);
  }, [pricingList]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(item => item.name.toLowerCase().includes(q));
  }, [search, products]);

  const handlePriceChange = useCallback((productVariantId, text) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    setPrices(prev => ({ ...prev, [productVariantId]: cleaned }));
  }, []);

  const handleLogout = () => {
    logout();
    resetToRoleSelection();
  };

  const handleReset = () => {
    const next = {};
    pricingList.forEach(entry => {
      next[entry.productVariantId] = entry.currentPrice != null ? String(entry.currentPrice) : '';
    });
    setPrices(next);
    setSearch('');
    setIsEditing(false);
  };

  const handleSave = async () => {
    // Only send variants the vendor actually entered a valid price for.
    const items = Object.entries(prices)
      .map(([productVariantId, value]) => ({ productVariantId, price: parseFloat(value) }))
      .filter(item => !isNaN(item.price) && item.price >= 0);

    if (!items.length) {
      toast.info('Nothing to save', 'Enter at least one price first.');
      return;
    }

    try {
      await bulkUpdate(items);
      setIsEditing(false);
      toast.success('Prices Saved', 'Your prices have been updated successfully.');
    } catch (err) {
      if (err?.status !== 401) {
        toast.error('Save failed', err?.message ?? 'Could not update prices. Please try again.');
      }
    }
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      {pricingLocked && (
        <View style={styles.lockBanner}>
          <Text style={styles.lockBannerTitle}>Set your prices to continue</Text>
          <Text style={styles.lockBannerBody}>
            Your account is approved. Add a price for every item to unlock the
            rest of the app. Tap the edit icon to start.
          </Text>
        </View>
      )}
      <View style={styles.inventoryRow}>
        <View style={styles.inventoryLeft}>
          <InventoryBoxIcon />
          <Text style={styles.inventoryLabel}>Inventory List</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>
            {filteredItems.length} ITEMS FOUND
          </Text>
        </View>
      </View>
    </View>
  );

  // Logout lives at the end of the list, and only while the vendor is locked to
  // this screen and not actively editing prices.
  const renderFooter = () => {
    if (!pricingLocked || isEditing) return null;
    return (
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        activeOpacity={0.85}>
        <Text style={styles.logoutBtnText}>Log Out</Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      );
    }
    if (error && error?.status !== 401) {
      return (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Couldn't load pricing. Please try again.</Text>
        </View>
      );
    }
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No products available to price yet.</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader
        title="Price Management"
        rightIcon={isEditing ? 'refresh' : 'edit'}
        onRightPress={isEditing ? handleReset : () => setIsEditing(true)}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Rendered as a static sibling (not inside ListHeaderComponent) so the
            TextInput isn't remounted on every keystroke, which would dismiss
            the keyboard. */}
        <View style={styles.searchBarWrap}>
          <View style={styles.searchWrap}>
            <SearchIcon />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search items..."
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        <FlatList
          data={filteredItems}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <PriceItemCard
              item={item}
              prices={prices}
              onPriceChange={handlePriceChange}
              editable={isEditing}
            />
          )}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        {isEditing && (
          <View style={styles.saveFooter}>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}>
              <SaveIcon />
              <Text style={styles.saveBtnText}>
                {saving ? 'Saving...' : 'Save All Prices'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  flex: { flex: 1 },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  listHeader: {
    paddingTop: 10,
    paddingBottom: 4,
  },
  lockBanner: {
    backgroundColor: '#fef9c3',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: 12,
    marginBottom: 12,
  },
  lockBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#a16207',
    marginBottom: 4,
  },
  lockBannerBody: {
    fontSize: 12,
    color: '#92722e',
    lineHeight: 18,
  },
  logoutBtn: {
    marginTop: 12,
    marginBottom: 4,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#dc2626',
  },
  searchBarWrap: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: '#f3f4f6',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  inventoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  inventoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inventoryLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  countBadge: {
    backgroundColor: '#fef9c3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#a16207',
    letterSpacing: 0.3,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemMeta: { flex: 1 },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 1,
  },
  itemDesc: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  variantLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  priceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    minWidth: 100,
    height: 34,
  },
  priceInputWrapDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
  },
  currency: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginRight: 3,
  },
  priceInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
    padding: 0,
  },
  saveFooter: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#f3f4f6',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    shadowColor: '#1b5e20',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});

export default VendorPricesScreen;
