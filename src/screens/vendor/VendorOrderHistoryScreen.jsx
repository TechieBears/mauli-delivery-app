import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shop, TickCircle, ArrowRight2 } from 'iconsax-react-native';
import { colors } from '../../theme/colors';
import AppHeader from '../../components/AppHeader';
import { ORDER_HISTORY } from '../../constants/orderHistory';

const formatINR = amount =>
  '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2 });

const HistoryCard = ({ order, onViewDetails }) => (
  <View style={styles.card}>
    <View style={styles.cardTop}>
      <View style={styles.iconWrap}>
        <Shop size={18} color={colors.primary} variant="Linear" />
      </View>
      <View style={styles.orderMeta}>
        <Text style={styles.orderId}>#{order.id}</Text>
        <Text style={styles.orderDate}>{order.date} • {order.time}</Text>
      </View>
      <View style={styles.deliveredBadge}>
        <TickCircle size={12} color="#166534" variant="Bold" />
        <Text style={styles.deliveredText}>Delivered</Text>
      </View>
    </View>

    <View style={styles.divider} />

    <View style={styles.cardBottom}>
      <Text style={styles.amount}>{formatINR(order.amount)}</Text>
      <TouchableOpacity style={styles.viewDetailsBtn} onPress={onViewDetails} activeOpacity={0.7}>
        <Text style={styles.viewDetailsText}>View Details</Text>
        <ArrowRight2 size={12} color={colors.primary} variant="Linear" />
      </TouchableOpacity>
    </View>
  </View>
);

const VendorOrderHistoryScreen = ({ navigation }) => (
  <SafeAreaView style={styles.screen} edges={['top']}>
    <AppHeader leftIcon="back" title="Mauli Mart" rightIcon="bell" onLeftPress={() => navigation.goBack()} />

    <FlatList
      data={ORDER_HISTORY}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
          <HistoryCard
            order={item}
            onViewDetails={() => navigation.navigate('OrderHistoryDetail', { orderId: item.id })}
          />
        )}
      ListHeaderComponent={
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Order History</Text>
          <Text style={styles.pageSubtitle}>Review your completed wholesale deliveries</Text>
        </View>
      }
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  </SafeAreaView>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f7f4' },

  pageHeader: {
    paddingTop: 20,
    paddingBottom: 16,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderMeta: { flex: 1 },
  orderId: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 1,
  },
  orderDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  deliveredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  deliveredText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },

  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginBottom: 8,
  },

  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  amount: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
});

export default VendorOrderHistoryScreen;
