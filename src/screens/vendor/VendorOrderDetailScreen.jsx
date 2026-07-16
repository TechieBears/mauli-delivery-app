import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import {
  Location,
  Call,
  TickCircle,
  CloseCircle,
  Truck,
  DocumentText1,
  Profile2User,
} from 'iconsax-react-native';
import AppHeader from '../../components/AppHeader';
import { useVendorOrder, useUpdateVendorOrderStatus, useLookupTransporter } from '../../hooks/useVendorQueries';
import toast from '../../utils/toast';
import DeliveryOtpModal from './DeliveryOtpModal';

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Maps a status to one of the 4 visual stepper dots. ready_for_pickup folds
// into ACCEPTED — it's a sub-step of the same stage (transporter assigned).
//   0 PENDING    → pending
//   1 ACCEPTED   → confirmed / ready_for_pickup
//   2 IN-TRANSIT → intransit
//   3 DELIVERED  → delivered
const STEPPER_STEPS = ['PENDING', 'ACCEPTED', 'IN-TRANSIT', 'DELIVERED'];

const getStepIndex = status => {
  const map = { pending: 0, confirmed: 1, ready_for_pickup: 1, intransit: 2, delivered: 3 };
  return map[status] ?? 0;
};

const formatRupee = value =>
  `₹${Number(value ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Masks all but the last 2 digits of a phone number, e.g. "8798789877" → "••••••••77".
const maskPhone = raw => {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length < 2) return '';
  return `${'•'.repeat(digits.length - 2)}${digits.slice(-2)}`;
};

// Maps the /vendor/orders/:id response to the shape the render tree expects.
// The endpoint returns { order, items }: `order` carries a flat customer
// { name, countryCode, phone } and a deliverySlot { startTime, endTime };
// `items` is the line-item array with populated productVariant.
const mapDetailOrder = payload => {
  if (!payload?.order) return null;
  const raw = payload.order;
  const customer = raw.customer ?? {};
  const total = raw.vendorTotalAmount ?? raw.totalAmount ?? 0;
  const maskedNumber = maskPhone(customer.phone);
  const phone = [customer.countryCode, maskedNumber].filter(Boolean).join(' ');

  const items = (Array.isArray(payload.items) ? payload.items : []).map(it => {
    const variant = it.productVariantId ?? {};
    const product = variant.productId ?? {};
    return {
      id: it._id,
      name: product.name ?? 'Item',
      sku: variant.name ?? product.unit ?? '',
      quantity: `${it.quantity} × ${variant.name ?? ''}`.trim(),
      price: it.totalPrice ?? it.priceAtTime ?? 0,
      image: variant.image ?? product.image ?? '',
    };
  });

  const dispatchPhone = raw.deliveryBoy?.phone
    ? maskPhone(raw.deliveryBoy.phone)
    : '';

  return {
    id: raw._id,
    status: raw.status,
    items,
    customer: {
      name: customer.name || 'Customer',
      role: phone || 'Customer',
      address: customer.address?.line ?? '',
      phone,
      avatar: customer.avatar ?? '',
    },
    // Transporter assigned at ready-for-pickup (deliveryBoy on the order doc).
    deliveryBoy: {
      name: raw.deliveryBoy?.name ?? '',
      phone: dispatchPhone,
      vehicleNo: raw.deliveryBoy?.vehicleNo ?? '',
    },
    valuation: {
      subtotal: raw.vendorTotalAmount ?? 0,
      deliveryFee: 0,
      tax: raw.commissionAmount ?? 0,
      customerTotal: raw.totalAmount ?? 0,
      total,
    },
    shipment: {
      origin: '',
      destination: customer.address?.line ?? '',
      items: items.map(i => ({ id: i.id, name: i.name, weight: i.quantity, image: i.image })),
      totalVolume: '',
      carrierType: '',
      expectedArrival: '',
    },
  };
};

// ─── Status Stepper ──────────────────────────────────────────────────────────

const StatusStepper = ({ stepIndex }) => {
  const steps = STEPPER_STEPS;
  return (
    <View style={stepStyles.wrap}>
      {steps.map((label, i) => {
        const lastIndex = steps.length - 1;
        const isDone = stepIndex === lastIndex || i < stepIndex;
        const isActive = stepIndex < lastIndex && i === stepIndex;
        return (
          <React.Fragment key={label}>
            <View style={stepStyles.step}>
              <View style={[stepStyles.circle, (isDone || isActive) && stepStyles.circleFilled]}>
                {isDone ? (
                  <TickCircle size={14} color="#fff" variant="Bold" />
                ) : isActive ? (
                  <View style={stepStyles.activeDot} />
                ) : null}
              </View>
              <Text
                style={[
                  stepStyles.label,
                  isActive && stepStyles.labelActive,
                  isDone && stepStyles.labelDone,
                ]}>
                {label}
              </Text>
            </View>
            {i < steps.length - 1 && (
              <View style={[stepStyles.line, i < stepIndex && stepStyles.lineFilled]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const stepStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  step: { alignItems: 'center', width: 66 },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  circleFilled: { backgroundColor: colors.primary, borderColor: colors.primary },
  activeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: '#e5e7eb',
    marginTop: 15,
    marginHorizontal: 2,
  },
  lineFilled: { backgroundColor: colors.primary },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  labelActive: { color: colors.primary },
  labelDone: { color: colors.primary },
});

// ─── Shared section components ────────────────────────────────────────────────

const Section = ({ children, style }) => (
  <View style={[styles.section, style]}>{children}</View>
);

const SectionTitle = ({ icon, title, badge }) => (
  <View style={styles.sectionHeader}>
    {icon}
    <Text style={styles.sectionTitleText}>{title}</Text>
    {badge != null && (
      <View style={styles.sectionBadge}>
        <Text style={styles.sectionBadgeText}>{badge} ITEMS</Text>
      </View>
    )}
  </View>
);

// ─── Manifest section (with item images) ─────────────────────────────────────

const ManifestSection = ({ order }) => (
  <Section>
    <SectionTitle
      icon={<DocumentText1 size={15} color={colors.primary} variant="Linear" />}
      title="ORDER MANIFEST"
      badge={order.items.length}
    />
    {order.items.map((item, idx) => (
      <View
        key={item.id}
        style={[
          styles.manifestRow,
          idx < order.items.length - 1 && styles.manifestRowBorder,
        ]}>
        <View style={styles.manifestLeft}>
          <Text style={styles.manifestName}>{item.name}</Text>
          {!!item.sku && <Text style={styles.manifestSku}>SKU {item.sku}</Text>}
        </View>
        <View style={styles.manifestCol}>
          <Text style={styles.manifestColLabel}>QUANTITY</Text>
          <Text style={styles.manifestQty}>{item.quantity}</Text>
        </View>
        <View style={[styles.manifestCol, styles.manifestColRight]}>
          <Text style={styles.manifestColLabel}>PRICE</Text>
          <Text style={styles.manifestPrice}>{formatRupee(item.price)}</Text>
        </View>
      </View>
    ))}
  </Section>
);

// ─── Customer section ─────────────────────────────────────────────────────────

const CustomerSection = ({ order }) => (
  <Section>
    <SectionTitle
      icon={<Profile2User size={15} color={colors.primary} variant="Linear" />}
      title="CUSTOMER PROFILE"
    />
    <View style={styles.customerRow}>
      <Image source={{ uri: order.customer.avatar }} style={styles.avatar} />
      <View style={{ flex: 1 }}>
        <Text style={styles.customerName}>{order.customer.name}</Text>
        {!!order.customer.address && (
          <Text style={styles.customerRole} numberOfLines={2}>{order.customer.address}</Text>
        )}
      </View>
    </View>
    {!!order.customer.address && (
      <View style={styles.infoRow}>
        <Location size={14} color={colors.textMuted} variant="Linear" />
        <Text style={styles.infoText}>{order.customer.address}</Text>
      </View>
    )}
    {!!order.customer.phone && (
      <View style={styles.infoRow}>
        <Call size={14} color={colors.textMuted} variant="Linear" />
        <Text style={styles.infoText}>{order.customer.phone}</Text>
      </View>
    )}
  </Section>
);

// ─── Valuation section ────────────────────────────────────────────────────────

const ValuationSection = ({ order }) => (
  <View style={styles.valuationCard}>
    <Text style={styles.valuationTitle}>FINAL VALUATION</Text>
    <View style={{ height: 12 }} />
    {[
      ['Item Subtotal', order.valuation.subtotal],
      ['Commission', order.valuation.tax],
      ['Customer Total', order.valuation.customerTotal],
    ].map(([label, val]) => (
      <View key={label} style={styles.valuationRow}>
        <Text style={styles.valuationLabel}>{label}</Text>
        <Text style={styles.valuationValue}>{formatRupee(val)}</Text>
      </View>
    ))}
    <View style={styles.valuationDivider} />
    <View style={styles.valuationRow}>
      <Text style={styles.totalLabel}>TOTAL DUE</Text>
      <Text style={styles.totalValue}>{formatRupee(order.valuation.total)}</Text>
    </View>
  </View>
);

// ─── Full order content (pending + delivered) ─────────────────────────────────

const FullOrderContent = ({ order }) => (
  <>
    <ManifestSection order={order} />
    <CustomerSection order={order} />
    <ValuationSection order={order} />
  </>
);

// ─── Transporter assignment (confirmed → ready-for-pickup) ────────────────────
// Vendor enters a phone and looks it up. An existing transporter's name +
// known vehicles are shown to pick from (or add a new vehicle); a new phone
// lets the vendor type a name and vehicle to create a transporter.

const AssignInput = ({ label, ...props }) => (
  <View style={styles.assignField}>
    <Text style={styles.assignLabel}>{label}</Text>
    <View style={styles.inputWrap}>
      <TextInput
        style={styles.input}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
    </View>
  </View>
);

const TransporterAssign = ({
  driverPhone, setDriverPhone, onLookup, isLookingUp, lookupResult,
  driverName, setDriverName, vehicleNo, setVehicleNo, addingVehicle, setAddingVehicle,
}) => {
  const vehicles = lookupResult?.vehicles ?? [];
  const searched = lookupResult != null;
  const exists = !!lookupResult?.exists;

  return (
    <Section>
      <SectionTitle
        icon={<Profile2User size={15} color={colors.primary} variant="Linear" />}
        title="ASSIGN TRANSPORTER"
      />

      {/* Phone + search */}
      <Text style={styles.assignLabel}>Transporter Phone</Text>
      <View style={styles.lookupRow}>
        <View style={[styles.inputWrap, { flex: 1, marginBottom: 0 }]}>
          <TextInput
            style={styles.input}
            placeholder="+91 00000 00000"
            placeholderTextColor={colors.textMuted}
            value={driverPhone}
            onChangeText={setDriverPhone}
            keyboardType="phone-pad"
          />
        </View>
        <TouchableOpacity
          style={styles.lookupBtn}
          onPress={onLookup}
          disabled={isLookingUp}
          activeOpacity={0.85}>
          {isLookingUp
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.lookupBtnText}>Search</Text>}
        </TouchableOpacity>
      </View>

      {searched && exists && (
        <View style={styles.foundBanner}>
          <TickCircle size={15} color="#166534" variant="Bold" />
          <Text style={styles.foundText}>Transporter found: {lookupResult.name}</Text>
        </View>
      )}
      {searched && !exists && (
        <Text style={styles.newHint}>No transporter for this number — a new one will be created.</Text>
      )}

      {searched && (
        <>
          <View style={{ height: 12 }} />
          <AssignInput
            label="Driver Name"
            placeholder="Full Name"
            value={driverName}
            onChangeText={setDriverName}
            editable={!exists}
          />

          {/* Existing vehicles to choose from */}
          {vehicles.length > 0 && !addingVehicle && (
            <>
              <Text style={styles.assignLabel}>Select Vehicle</Text>
              <View style={styles.vehicleWrap}>
                {vehicles.map(v => {
                  const active = vehicleNo === v.vehicleNo;
                  return (
                    <TouchableOpacity
                      key={v.vehicleNo}
                      style={[styles.vehicleChip, active && styles.vehicleChipActive]}
                      onPress={() => setVehicleNo(v.vehicleNo)}
                      activeOpacity={0.8}>
                      <Text style={[styles.vehicleChipText, active && styles.vehicleChipTextActive]}>
                        {v.vehicleNo}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity onPress={() => { setAddingVehicle(true); setVehicleNo(''); }} activeOpacity={0.7}>
                <Text style={styles.addVehicleLink}>+ Add a new vehicle</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Enter a new vehicle */}
          {(addingVehicle || vehicles.length === 0) && (
            <AssignInput
              label="Vehicle Number"
              placeholder="e.g. MH 12 AB 1234"
              value={vehicleNo}
              onChangeText={setVehicleNo}
              autoCapitalize="characters"
            />
          )}
          {addingVehicle && vehicles.length > 0 && (
            <TouchableOpacity onPress={() => setAddingVehicle(false)} activeOpacity={0.7}>
              <Text style={styles.addVehicleLink}>← Choose an existing vehicle</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </Section>
  );
};

// ─── Assigned transporter (ready-for-pickup / in-transit) ─────────────────────

const AssignedTransporterSection = ({ order }) => {
  const d = order.deliveryBoy ?? {};
  return (
    <Section>
      <SectionTitle
        icon={<Truck size={15} color={colors.primary} variant="Linear" />}
        title="TRANSPORTER"
      />
      {[
        ['Driver', d.name],
        ['Contact', d.phone],
        ['Vehicle', d.vehicleNo],
      ].map(([label, val]) => (
        <View key={label} style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{label}</Text>
          <Text style={styles.summaryValue}>{val || '—'}</Text>
        </View>
      ))}
    </Section>
  );
};

// ─── Delivered content (full details + completed banner) ──────────────────────

const DeliveredContent = ({ order }) => (
  <>
    <Section style={styles.deliveredBannerSection}>
      <View style={styles.deliveredBanner}>
        <TickCircle size={18} color="#166534" variant="Bold" />
        <Text style={styles.deliveredBannerText}>Order Successfully Delivered</Text>
      </View>
      <Text style={styles.deliveredMeta}>
        Delivered to {order.customer.name} · {order.shipment.destination}
      </Text>
    </Section>

    <FullOrderContent order={order} />

    <Section>
      <Text style={styles.sectionTitleText}>SHIPMENT SUMMARY</Text>
      <View style={{ height: 10 }} />
      {[
        ['Total Volume', order.shipment.totalVolume],
        ['Carrier Type', order.shipment.carrierType],
        ['Destination', order.shipment.destination],
      ].map(([label, val]) => (
        <View key={label} style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{label}</Text>
          <Text style={styles.summaryValue}>{val}</Text>
        </View>
      ))}
    </Section>
  </>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────

const VendorOrderDetailScreen = ({ navigation, route }) => {
  const { orderId } = route.params;
  const insets = useSafeAreaInsets();
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateVendorOrderStatus();
  const { mutate: lookup, isPending: isLookingUp } = useLookupTransporter();

  // Fetch the real order detail. The response shape (items/customer/valuation)
  // is not finalised yet, so we log it and map defensively — missing nested
  // sections fall back to empty so the screen renders without crashing.
  const { data, isLoading, error: apiOrderError } = useVendorOrder(orderId);
  React.useEffect(() => {
    if (data) console.log(`[VendorOrderDetailScreen] /vendor/orders/${orderId} data:`, JSON.stringify(data, null, 2));
    if (apiOrderError) console.log(`[VendorOrderDetailScreen] /vendor/orders/${orderId} error:`, apiOrderError?.message, apiOrderError?.status);
  }, [data, apiOrderError, orderId]);

  const order = useMemo(() => mapDetailOrder(data?.data), [data]);

  // ── Transporter assignment (ready-for-pickup step) ──────────────────────────
  // Vendor types a phone → looks it up. If a transporter exists we show their
  // name + known vehicles to pick from (or add a new one); otherwise the vendor
  // types a name and vehicle to create a new transporter shell.
  const [driverPhone, setDriverPhone] = useState('');
  const [lookupResult, setLookupResult] = useState(null); // null = not searched yet
  const [driverName, setDriverName] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');          // selected / entered vehicle
  const [addingVehicle, setAddingVehicle] = useState(false);

  // Pickup-OTP confirmation. Step 1 (assign transporter) returns an OTP in dev,
  // which we prefill in the modal for testing.
  const [otpVisible, setOtpVisible] = useState(false);
  const [devOtp, setDevOtp] = useState('');

  const handleLookup = () => {
    const phone = driverPhone.trim();
    if (!phone) {
      toast.warning('Enter a phone number', 'Type the transporter’s phone to search.');
      return;
    }
    lookup(phone, {
      onSuccess: res => {
        const result = res?.data ?? res ?? {};
        setLookupResult(result);
        setDriverName(result.exists ? result.name ?? '' : '');
        const vehicles = result.vehicles ?? [];
        // Auto-select the only vehicle; otherwise let the vendor choose.
        setVehicleNo(vehicles.length === 1 ? vehicles[0].vehicleNo : '');
        setAddingVehicle(!result.exists || vehicles.length === 0);
      },
      onError: e => toast.error('Lookup failed', e?.message),
    });
  };

  if (isLoading && !order) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <AppHeader leftIcon="back" title="Order" onLeftPress={() => navigation.goBack()} />
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <AppHeader leftIcon="back" title="Order" onLeftPress={() => navigation.goBack()} />
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>{apiOrderError?.message ?? 'Order not found.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stepIndex = getStepIndex(order.status);
  const isPending = order.status === 'pending';
  const isConfirmed = order.status === 'confirmed';       // assign transporter here
  const isReadyForPickup = order.status === 'ready_for_pickup';
  const isInTransit = order.status === 'intransit';
  const isDelivered = order.status === 'delivered';
  const isTerminal = order.status === 'rejected' || order.status === 'cancelled';

  const hasFooter = isPending || isConfirmed || isReadyForPickup;
  // Pending shows two stacked buttons (Accept + Reject); the others show one.
  const footerHeight = hasFooter ? (isPending ? 140 : 72) + insets.bottom : 0;

  // The ready-for-pickup call needs all three transporter fields.
  const transporterReady =
    !!driverPhone.trim() && !!driverName.trim() && !!vehicleNo.trim();

  const runTransition = (status, extra, successMsg, onDone) =>
    updateStatus(
      { id: order.id, status, ...extra },
      {
        onSuccess: res => {
          toast.success(successMsg);
          onDone?.(res);
        },
        onError: e => toast.error('Update failed', e?.message),
      },
    );

  const handleAccept = () => runTransition('confirmed', {}, 'Order accepted');

  const handleReject = () => {
    Alert.alert(
      'Reject Order',
      `Are you sure you want to reject order #${String(order.id).slice(-6).toUpperCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () =>
            updateStatus(
              { id: order.id, status: 'rejected' },
              {
                onSuccess: () => {
                  toast.success('Order rejected');
                  navigation.goBack();
                },
                onError: e => toast.error('Update failed', e?.message),
              },
            ),
        },
      ],
    );
  };

  // Pickup handshake (order stays "confirmed" through this):
  //   Step 1: PATCH {ready_for_pickup, driverName, driverPhone, vehicleNo} —
  //           assigns the transporter and sends them a pickup OTP (echoed in
  //           dev). Then open the OTP modal.
  //   Step 2 (in the modal): PATCH {ready_for_pickup, otp} — flips the order to
  //           ready_for_pickup.
  const handleMarkReadyForPickup = () => {
    if (!driverPhone.trim() || !driverName.trim() || !vehicleNo.trim()) {
      toast.warning('Missing details', 'Search a phone, then pick/enter a driver name and vehicle.');
      return;
    }
    runTransition(
      'ready_for_pickup',
      {
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        vehicleNo: vehicleNo.trim(),
      },
      'OTP sent to transporter',
      res => {
        // Step 1 keeps status "confirmed" and returns the OTP in dev.
        setDevOtp(res?.data?.otp ?? res?.otp ?? '');
        setOtpVisible(true);
      },
    );
  };

  // Modal step 2 succeeded → order is now ready_for_pickup. Immediately move it
  // on to intransit without waiting for a separate button press.
  const handlePickupConfirmed = () => {
    setOtpVisible(false);
    setDevOtp('');
    runTransition('intransit', {}, 'Order marked in-transit');
  };

  // ready_for_pickup → intransit is also available directly (e.g. an order left
  // in ready_for_pickup from an earlier session).
  const handleMarkInTransit = () => runTransition('intransit', {}, 'Order marked in-transit');

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader leftIcon="back" title={`Order #${String(order.id).slice(-6).toUpperCase()}`} onLeftPress={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: footerHeight + 16 + (hasFooter ? 0 : insets.bottom) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {(isConfirmed || isReadyForPickup || isInTransit) && (
            <View style={styles.dispatchBadgeWrap}>
              <View style={[styles.dispatchBadge, isInTransit && styles.inTransitBadge]}>
                <Truck size={14} color="#fff" variant="Bold" />
                <Text style={styles.dispatchBadgeText}>
                  {isInTransit ? 'IN TRANSIT' : isReadyForPickup ? 'READY FOR PICKUP' : 'READY TO DISPATCH'}
                </Text>
              </View>
            </View>
          )}

          {isTerminal ? (
            <Section style={styles.terminalBannerSection}>
              <View style={styles.terminalBanner}>
                <CloseCircle size={18} color={colors.error} variant="Bold" />
                <Text style={styles.terminalBannerText}>
                  {order.status === 'cancelled' ? 'Order Cancelled' : 'Order Rejected'}
                </Text>
              </View>
            </Section>
          ) : (
            <StatusStepper stepIndex={stepIndex} />
          )}

          {(isPending || isTerminal) && <FullOrderContent order={order} />}

          {/* confirmed → assign a transporter before ready-for-pickup */}
          {isConfirmed && (
            <TransporterAssign
              driverPhone={driverPhone}
              setDriverPhone={setDriverPhone}
              onLookup={handleLookup}
              isLookingUp={isLookingUp}
              lookupResult={lookupResult}
              driverName={driverName}
              setDriverName={setDriverName}
              vehicleNo={vehicleNo}
              setVehicleNo={setVehicleNo}
              addingVehicle={addingVehicle}
              setAddingVehicle={setAddingVehicle}
            />
          )}

          {/* ready_for_pickup / intransit → show the assigned transporter */}
          {(isReadyForPickup || isInTransit) && <AssignedTransporterSection order={order} />}

          {/* Full order details (manifest, customer, valuation) alongside every
              dispatch stage so the vendor can always review the order. */}
          {(isConfirmed || isReadyForPickup || isInTransit) && <FullOrderContent order={order} />}

          {isDelivered && <DeliveredContent order={order} />}
        </ScrollView>

        {isPending && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleAccept}
              disabled={isUpdating}
              activeOpacity={0.85}>
              {isUpdating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <TickCircle size={18} color="#fff" variant="Bold" />
                  <Text style={styles.primaryBtnText}>Accept Order</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectBtnFull}
              onPress={handleReject}
              disabled={isUpdating}
              activeOpacity={0.85}>
              <CloseCircle size={18} color={colors.error} variant="Bold" />
              <Text style={styles.rejectBtnText}>Reject Order</Text>
            </TouchableOpacity>
          </View>
        )}

        {isConfirmed && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
            <TouchableOpacity
              style={[styles.primaryBtn, !transporterReady && styles.primaryBtnDisabled]}
              onPress={handleMarkReadyForPickup}
              disabled={isUpdating || !transporterReady}
              activeOpacity={0.85}>
              {isUpdating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Truck size={18} color="#fff" variant="Linear" />
                  <Text style={styles.primaryBtnText}>
                    {transporterReady ? 'Mark Ready for Pickup' : 'Fill Transporter Details'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {isReadyForPickup && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleMarkInTransit}
              disabled={isUpdating}
              activeOpacity={0.85}>
              {isUpdating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Truck size={18} color="#fff" variant="Linear" />
                  <Text style={styles.primaryBtnText}>Mark as In-Transit</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      <DeliveryOtpModal
        visible={otpVisible}
        orderId={order.id}
        driverPhone={driverPhone}
        devOtp={devOtp}
        onClose={() => { setOtpVisible(false); setDevOtp(''); }}
        onVerified={handlePickupConfirmed}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f7f4' },

  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },

  scrollContent: { paddingTop: 10, paddingBottom: 16 },

  dispatchBadgeWrap: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: colors.surface,
  },
  dispatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  inTransitBadge: { backgroundColor: '#c2410c' },
  dispatchBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 1 },

  // Section
  section: {
    backgroundColor: colors.surface,
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 14,
  },
  sectionTitleText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
    flex: 1,
  },
  sectionBadge: {
    backgroundColor: '#fef9c3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sectionBadgeText: { fontSize: 10, fontWeight: '700', color: '#a16207', letterSpacing: 0.3 },

  // Manifest
  manifestRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
  },
  manifestRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  manifestLeft: { flex: 1.4, marginRight: 8 },
  manifestName: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 3 },
  manifestSku: { fontSize: 11, color: colors.textMuted },
  manifestCol: { flex: 1, alignItems: 'flex-start' },
  manifestColRight: { alignItems: 'flex-end' },
  manifestColLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  manifestQty: { fontSize: 14, fontWeight: '700', color: colors.primary },
  manifestPrice: { fontSize: 14, fontWeight: '700', color: colors.text },

  // Customer
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e5e7eb' },
  customerName: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 },
  customerRole: { fontSize: 13, color: colors.textSecondary },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  infoText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },

  // Valuation
  valuationCard: {
    backgroundColor: colors.primary,
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: '#1b5e20',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  valuationTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1,
  },
  valuationRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  valuationLabel: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  valuationValue: { fontSize: 14, fontWeight: '700', color: '#fff' },
  valuationDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 12 },
  totalLabel: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5, alignSelf: 'center' },
  totalValue: { fontSize: 26, fontWeight: '800', color: '#fff' },

  // Dispatch
  dispatchIntroSection: { paddingTop: 12 },
  dispatchOrderId: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 4 },
  dispatchDesc: { fontSize: 14, color: colors.textSecondary, marginBottom: 2 },
  dispatchDest: { fontSize: 13, color: colors.textMuted },

  inputWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  input: { fontSize: 14, color: colors.text, padding: 0 },

  // Transporter assign
  assignField: { marginBottom: 4 },
  assignLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
  lookupRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  lookupBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 18,
    height: 44,
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookupBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  foundBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dcfce7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 8,
  },
  foundText: { fontSize: 12, fontWeight: '600', color: '#166534' },
  newHint: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
  vehicleWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  vehicleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fafafa',
  },
  vehicleChipActive: { borderColor: colors.primary, backgroundColor: '#e8f5e9' },
  vehicleChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  vehicleChipTextActive: { color: colors.primary },
  addVehicleLink: { fontSize: 13, fontWeight: '600', color: colors.primary, marginBottom: 6 },

  shipmentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  shipmentItem: { alignItems: 'center', width: 80 },
  shipmentImage: { width: 72, height: 72, borderRadius: 12, backgroundColor: '#e5e7eb', marginBottom: 6 },
  shipmentName: { fontSize: 12, fontWeight: '600', color: colors.text, textAlign: 'center' },
  shipmentWeight: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 13, color: colors.textSecondary },
  summaryValue: { fontSize: 13, fontWeight: '700', color: colors.text },

  // Delivered
  deliveredBannerSection: { paddingVertical: 14 },
  deliveredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  deliveredBannerText: { fontSize: 14, fontWeight: '700', color: '#166534' },
  deliveredMeta: { fontSize: 12, color: colors.textMuted },

  // Rejected / cancelled banner
  terminalBannerSection: { paddingVertical: 14 },
  terminalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  terminalBannerText: { fontSize: 14, fontWeight: '700', color: colors.error },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    backgroundColor: '#f5f7f4',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: '#1b5e20',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  primaryBtnDisabled: {
    backgroundColor: '#a5b8a6',
    shadowOpacity: 0,
    elevation: 0,
  },
  rejectBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
    borderWidth: 1.5,
    borderColor: colors.error,
    backgroundColor: '#fff5f5',
  },
  rejectBtnText: { fontSize: 15, fontWeight: '700', color: colors.error },
});

export default VendorOrderDetailScreen;
