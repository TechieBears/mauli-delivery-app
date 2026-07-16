import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TickCircle } from 'iconsax-react-native';
import { colors } from '../../theme/colors';
import {
  useFrequentItemProducts,
  useAddFrequentItems,
} from '../../hooks/useCustomerQueries';
import toast from '../../utils/toast';

const MIN = 5;

// Placeholder background tint reused for every card image well.
const IMG_BG = '#fef3c7';

const LOGO = require('../../assets/images/Mauli-Logo.jpeg');

// ─── Header ──────────────────────────────────────────────────────────────────

const ScreenHeader = () => (
  <View style={styles.header}>
    <View style={styles.brand}>
      <Image source={LOGO} style={styles.brandLogo} />
      <Text style={styles.brandName}>Mauli Mart</Text>
    </View>
  </View>
);

// ─── Item Card ────────────────────────────────────────────────────────────────

const ItemCard = ({ item, selected, onToggle, disabled }) => {
  const product = item.product || {};
  const category = product.categoryId?.name ?? '';
  const name = [product.name, item.variantName].filter(Boolean).join(' · ');
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onToggle}
      disabled={disabled}
      activeOpacity={0.75}>
      <View style={[styles.imgWrap, { backgroundColor: IMG_BG }]}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.img} />
        ) : null}
      </View>
      <View style={styles.cardMeta}>
        {category ? <Text style={styles.category}>{category}</Text> : null}
        <Text style={styles.itemName}>{name || item.variantName}</Text>
        {item.customerPrice != null ? (
          <Text style={styles.price}>₹{item.customerPrice}</Text>
        ) : null}
      </View>
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected && <TickCircle size={22} color="#fff" variant="Bold" />}
      </View>
    </TouchableOpacity>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const FrequentItemsScreen = ({ navigation }) => {
  const { data: productsRes, isLoading, isError, refetch } = useFrequentItemProducts();
  const saveItems = useAddFrequentItems();

  // The response interceptor returns the whole `{ success, message, data }`
  // body, so the ranked array lives under `.data`. Order is frozen while the
  // user selects — we never refetch on tap, so nothing jumps around.
  const items = Array.isArray(productsRes?.data) ? productsRes.data : [];

  // Selection is local (a Set of productVariantId) so tapping never triggers a
  // refetch/re-sort. Seed it from any items already marked frequent server-side.
  const [selected, setSelected] = useState(() => new Set());
  useEffect(() => {
    const preselected = items.filter(i => i.isFrequent).map(i => String(i.productVariantId));
    if (preselected.length) setSelected(new Set(preselected));
    // Seed once when data first arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productsRes]);

  const selectedCount = selected.size;

  const toggle = item => {
    const id = String(item.productVariantId);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      next.add(id);
      return next;
    });
  };

  const handleContinue = () => {
    if (selectedCount < MIN) {
      toast.info('Select items', `Pick at least ${MIN} items to continue.`);
      return;
    }
    // One bulk call with every selected variant, then into the app.
    saveItems.mutate([...selected], {
      onSuccess: () => navigation.reset({ index: 0, routes: [{ name: 'CustomerApp' }] }),
      onError: () => toast.error('Failed', 'Could not save your items. Try again.'),
    });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#faf8f5" />

      <ScreenHeader />

      <View style={styles.titleBlock}>
        <Text style={styles.title}>Frequent Items</Text>
        <Text style={styles.subtitle}>
          Pick at least <Text style={styles.subtitleBold}>{MIN} items</Text> for quick access.
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Couldn’t load items.</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.continueBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.productVariantId)}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              selected={selected.has(String(item.productVariantId))}
              onToggle={() => toggle(item)}
              disabled={saveItems.isPending}
            />
          )}
          extraData={selected}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No products available yet.</Text>
          }
        />
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.countText}>
          {selectedCount} selected{selectedCount < MIN ? ` (min ${MIN})` : ''}
        </Text>
        <TouchableOpacity
          style={[
            styles.continueBtn,
            (selectedCount < MIN || saveItems.isPending) && styles.continueBtnDisabled,
          ]}
          onPress={handleContinue}
          disabled={selectedCount < MIN || saveItems.isPending}
          activeOpacity={0.85}>
          <Text style={styles.continueBtnText}>
            {saveItems.isPending ? 'Saving...' : 'Continue  →'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#faf8f5' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#faf8f5',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 34,
    height: 34,
    borderRadius: 10,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },

  // Title block
  titleBlock: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  subtitleBold: {
    fontWeight: '700',
    color: colors.primary,
  },

  // List
  list: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 10,
  },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    gap: 14,
    borderWidth: 1.5,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#f0fdf4',
  },
  imgWrap: {
    width: 58,
    height: 58,
    borderRadius: 12,
    overflow: 'hidden',
  },
  img: { width: '100%', height: '100%' },
  cardMeta: { flex: 1 },
  category: {
    fontSize: 10,
    fontWeight: '700',
    color: '#d97706',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  price: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  continueBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  continueBtnDisabled: { opacity: 0.45 },
  continueBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // States
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 24,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
});

export default FrequentItemsScreen;
