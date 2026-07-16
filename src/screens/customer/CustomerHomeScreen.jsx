import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Carousel, { Pagination } from 'react-native-reanimated-carousel';
import { useSharedValue } from 'react-native-reanimated';
import { SearchNormal1, Slider, ShoppingCart, Add } from 'iconsax-react-native';
import { colors } from '../../theme/colors';
import { PROMO_BANNERS, STANDARD_CATALOG, EMERGENCY_CATALOG } from '../../constants/customerCatalog';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AVATAR = { uri: 'https://i.pravatar.cc/80?img=12' };
const LOGO = require('../../assets/images/Mauli-Logo.jpeg');

// ─── Header ──────────────────────────────────────────────────────────────────

const ScreenHeader = () => (
  <View style={styles.header}>
    <View style={styles.headerLeft}>
      <Image source={LOGO} style={styles.headerLogo} />
      <View>
        <Text style={styles.headerGreet}>Good morning,</Text>
        <Text style={styles.headerTitle}>Mauli Harvest</Text>
      </View>
    </View>
    <Image source={AVATAR} style={styles.avatar} />
  </View>
);

// ─── Promo Banner ─────────────────────────────────────────────────────────────

const BANNER_WIDTH = SCREEN_WIDTH - 32;
const BANNER_HEIGHT = 180;

const PromoBanner = () => {
  const carouselRef = useRef(null);
  const progress = useSharedValue(0);

  return (
    <View style={styles.bannerWrapper}>
      <Carousel
        ref={carouselRef}
        width={BANNER_WIDTH}
        height={BANNER_HEIGHT}
        data={PROMO_BANNERS}
        loop
        autoPlay
        autoPlayInterval={4000}
        scrollAnimationDuration={600}
        onProgressChange={progress}
        renderItem={({ item }) => (
          <View style={[styles.banner, { backgroundColor: item.bg }]}>
            <View style={styles.bannerContent}>
              <View style={styles.bannerTag}>
                <Text style={styles.bannerTagText}>{item.tag}</Text>
              </View>
              <Text style={styles.bannerTitle}>{item.title}</Text>
            </View>
            <View style={styles.bannerLeafWrap}>
              <Text style={styles.bannerLeaf}>🌿</Text>
            </View>
          </View>
        )}
      />
      <Pagination.Basic
        progress={progress}
        data={PROMO_BANNERS}
        containerStyle={styles.dotRow}
        dotStyle={styles.dot}
        activeDotStyle={styles.dotActive}
        onPress={index => carouselRef.current?.scrollTo({ index, animated: true })}
      />
    </View>
  );
};

// ─── Segment Toggle ───────────────────────────────────────────────────────────

const SegmentToggle = ({ active, onChange }) => (
  <View style={styles.segmentWrap}>
    {['Standard', 'Emergency'].map(tab => (
      <TouchableOpacity
        key={tab}
        style={[styles.segmentBtn, active === tab && styles.segmentBtnActive]}
        onPress={() => onChange(tab)}
        activeOpacity={0.75}>
        <Text style={[styles.segmentLabel, active === tab && styles.segmentLabelActive]}>
          {tab}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ─── Product Row ──────────────────────────────────────────────────────────────

const ProductRow = ({ item, navigation, isEmergency }) => (
  <View style={styles.productRow}>
    <View style={[styles.productImgWrap, { backgroundColor: item.bg }]}>
      <Image source={{ uri: item.image }} style={styles.productImg} />
    </View>
    <View style={styles.productMeta}>
      <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.productPrice}>₹{item.price.toFixed(2)} <Text style={styles.productUnit}>{item.unit}</Text></Text>
      <Text style={styles.productMinQty}>Min. {item.minQty}</Text>
    </View>
    <TouchableOpacity
      style={styles.addBtn}
      onPress={() => navigation.navigate('NewOrder', { isEmergency })}
      activeOpacity={0.8}>
      <Add size={18} color="#fff" />
    </TouchableOpacity>
  </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

const CustomerHomeScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('Standard');
  const [search, setSearch] = useState('');

  const isEmergency = activeTab === 'Emergency';
  const catalog = activeTab === 'Standard' ? STANDARD_CATALOG : EMERGENCY_CATALOG;
  const filtered = search.trim()
    ? catalog.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : catalog;

  const ListHeader = () => (
    <View>
      <ScreenHeader />
      <PromoBanner />
      <SegmentToggle active={activeTab} onChange={setActiveTab} />

      {/* Search */}
      <View style={styles.searchWrap}>
        <SearchNormal1 size={16} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search catalog..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Section label */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>
          {activeTab.toUpperCase()} CATALOG
        </Text>
        <TouchableOpacity activeOpacity={0.7}>
          <Slider size={18} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#faf8f5" />

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ProductRow item={item} navigation={navigation} isEmergency={isEmergency} />
        )}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('NewOrder', { isEmergency })} activeOpacity={0.85}>
        <ShoppingCart size={18} color="#fff" variant="Bold" />
        <Text style={styles.fabText}>Start New Order</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#faf8f5' },
  listContent: { paddingBottom: 100 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: { width: 36, height: 36, borderRadius: 10 },
  headerGreet: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    lineHeight: 22,
  },
  avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: '#dcfce7' },

  // Promo Banner
  bannerWrapper: { marginHorizontal: 16, marginBottom: 4 },
  banner: {
    flex: 1,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  bannerContent: { flex: 1 },
  bannerTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  bannerTagText: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 0.8 },
  bannerTitle: { fontSize: 18, fontWeight: '800', color: '#fff', lineHeight: 24 },
  bannerLeafWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerLeaf: { fontSize: 28 },
  dotRow: { gap: 6, marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#d1d5db' },
  dotActive: { width: 18, borderRadius: 3, backgroundColor: colors.primary },

  // Segment toggle
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 11,
  },
  segmentBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  segmentLabel: { fontSize: 13, fontWeight: '600', color: '#9ca3af' },
  segmentLabelActive: { color: colors.text, fontWeight: '700' },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },

  // Section label
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9ca3af',
    letterSpacing: 1.2,
  },

  // Product row
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  productImgWrap: { width: 60, height: 60, borderRadius: 12, overflow: 'hidden' },
  productImg: { width: '100%', height: '100%' },
  productMeta: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
  productPrice: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 2 },
  productUnit: { fontSize: 11, fontWeight: '500', color: '#9ca3af' },
  productMinQty: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  addBtnDisabled: { backgroundColor: '#e5e7eb' },

  separator: { height: 8 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

export default CustomerHomeScreen;
