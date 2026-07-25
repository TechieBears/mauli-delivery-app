import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CheckSquare, Square, X, Warning } from 'phosphor-react-native';
import SwipeToConfirm from '../../components/SwipeToConfirm';
import { orderLabel, customerName } from './orderStatus';
import { colors } from '../../theme/colors';

// OrderItem rows populate productVariantId.productId with { name, unit }.
const itemName = item =>
  item?.productVariantId?.productId?.name ??
  item?.productVariantId?.name ??
  'Item';

const itemUnit = item => item?.productVariantId?.productId?.unit ?? '';

/**
 * Post-scan pickup confirmation. Lists every order the QR resolved to with its
 * items, and gives the transporter a checkbox per item so they can tick off
 * what they've physically loaded.
 *
 * The checklist is a loading aid only — it is NOT sent to the backend.
 * POST /transporter/orders/confirm-pickup takes just { token, vehicleNo } and
 * moves the ENTIRE batch to intransit; there is no partial-pickup support. The
 * swipe stays disabled until everything is ticked so the transporter can't
 * confirm a batch they haven't fully checked, but once they swipe, all orders
 * in the QR are picked up regardless.
 *
 * Props:
 *  visible    bool
 *  scan       object  — scan-pickup payload: { token, orders: [{order, items}], skipped }
 *  submitting bool
 *  onClose    fn
 *  onConfirm  fn      — user swiped; caller fires confirm-pickup with scan.token
 */
const PickupConfirmModal = ({ visible, scan, submitting, onClose, onConfirm }) => {
  const orders = useMemo(
    () => (Array.isArray(scan?.orders) ? scan.orders : []),
    [scan],
  );
  const skipped = Array.isArray(scan?.skipped) ? scan.skipped : [];

  const allItemIds = useMemo(
    () =>
      orders.flatMap(entry =>
        (entry.items ?? []).map(item => String(item._id)),
      ),
    [orders],
  );

  const [checked, setChecked] = useState(() => new Set());

  // Start unchecked each time a new QR is scanned.
  useEffect(() => {
    if (visible) setChecked(new Set());
  }, [visible, scan?.token]);

  const toggle = id =>
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleOrder = entry => {
    const ids = (entry.items ?? []).map(i => String(i._id));
    const allOn = ids.every(id => checked.has(id));
    setChecked(prev => {
      const next = new Set(prev);
      ids.forEach(id => (allOn ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const totalItems = allItemIds.length;
  const checkedCount = allItemIds.filter(id => checked.has(id)).length;
  const allChecked = totalItems > 0 && checkedCount === totalItems;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      {/* RN <Modal> renders in a separate native window that sits OUTSIDE the
          app-root GestureHandlerRootView, so gestures inside it (the swipe-to-
          accept knob) get no touch events on Android. Wrapping the modal's own
          content in a GestureHandlerRootView restores them. */}
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaView style={styles.sheet} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Confirm pickup</Text>
            <Text style={styles.subtitle}>
              {orders.length} {orders.length === 1 ? 'order' : 'orders'} ·{' '}
              {checkedCount}/{totalItems} items checked
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={24} color={colors.textSecondary} weight="bold" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}>
          {skipped.length ? (
            <View style={styles.warnBox}>
              <Warning size={18} color="#a16207" weight="fill" />
              <Text style={styles.warnText}>
                {skipped.length}{' '}
                {skipped.length === 1 ? 'order was' : 'orders were'} skipped —
                already picked up, not assigned to you, or expired.
              </Text>
            </View>
          ) : null}

          {orders.map(entry => {
            const { order, items = [] } = entry;
            const ids = items.map(i => String(i._id));
            const orderAllOn = ids.length > 0 && ids.every(id => checked.has(id));
            const customer = order?.customerId;

            return (
              <View key={String(order?._id)} style={styles.orderCard}>
                <TouchableOpacity
                  style={styles.orderHead}
                  onPress={() => toggleOrder(entry)}
                  activeOpacity={0.7}>
                  {orderAllOn ? (
                    <CheckSquare size={22} color={colors.primary} weight="fill" />
                  ) : (
                    <Square size={22} color={colors.textMuted} />
                  )}
                  <View style={styles.orderHeadText}>
                    <Text style={styles.orderNo}>{orderLabel(order)}</Text>
                    {customerName(customer) ? (
                      <Text style={styles.customer} numberOfLines={1}>
                        {customerName(customer)}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>

                {items.map(item => {
                  const id = String(item._id);
                  const on = checked.has(id);
                  const unit = itemUnit(item);

                  return (
                    <TouchableOpacity
                      key={id}
                      style={styles.itemRow}
                      onPress={() => toggle(id)}
                      activeOpacity={0.7}>
                      {on ? (
                        <CheckSquare size={20} color={colors.primary} weight="fill" />
                      ) : (
                        <Square size={20} color={colors.textMuted} />
                      )}
                      <Text
                        style={[styles.itemName, on && styles.itemNameOn]}
                        numberOfLines={2}>
                        {itemName(item)}
                      </Text>
                      <Text style={styles.itemQty}>
                        {item.quantity}
                        {unit ? ` ${unit}` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {items.length === 0 ? (
                  <Text style={styles.noItems}>No items on this order.</Text>
                ) : null}
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerHint}>
            {allChecked
              ? 'All items checked — swipe to accept this pickup.'
              : `Check all ${totalItems} items to enable pickup.`}
          </Text>
          <SwipeToConfirm
            label="Swipe to accept order"
            disabled={!allChecked}
            loading={submitting}
            onConfirm={onConfirm}
          />
        </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  sheet: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },

  body: { padding: 20, paddingBottom: 8 },

  warnBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.warningBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  warnText: { flex: 1, fontSize: 13, color: '#a16207', lineHeight: 19 },

  orderCard: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
  },
  orderHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: colors.inputBg,
  },
  orderHeadText: { flex: 1 },
  orderNo: { fontSize: 15, fontWeight: '800', color: colors.text },
  customer: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  itemName: { flex: 1, fontSize: 14, color: colors.text },
  itemNameOn: { color: colors.textSecondary },
  itemQty: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  noItems: {
    padding: 14,
    fontSize: 13,
    color: colors.textMuted,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerHint: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
});

export default PickupConfirmModal;
