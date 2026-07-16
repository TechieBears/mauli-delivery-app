import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft2, Notification, TickCircle, Call } from 'iconsax-react-native';
import { colors } from '../../theme/colors';

const STEPS = [
  { id: 1, label: 'Order Pending',   desc: 'Received 09:30 AM',              done: true  },
  { id: 2, label: 'Confirmed',       desc: 'Verified by Vendor 09:45 AM',    done: true  },
  { id: 3, label: 'Ready for Pickup',desc: 'Quality Checked 10:15 AM',       done: true  },
  { id: 4, label: 'In-Transit',      desc: 'Rider Rahul is near your location', active: true },
];

// ─── Status Step ─────────────────────────────────────────────────────────────

const StatusStep = ({ step, isLast }) => (
  <View style={styles.stepRow}>
    <View style={styles.stepLeft}>
      <View style={[
        styles.stepCircle,
        step.done   && styles.stepCircleDone,
        step.active && styles.stepCircleActive,
      ]}>
        {step.done   && <TickCircle size={18} color="#fff" variant="Bold" />}
        {step.active && <View style={styles.activeDot} />}
      </View>
      {!isLast && (
        <View style={[styles.connector, step.done && styles.connectorDone]} />
      )}
    </View>

    <View style={[styles.stepContent, step.active && styles.stepContentActive]}>
      <Text style={[styles.stepLabel, step.active && styles.stepLabelActive]}>
        {step.label}
      </Text>
      <Text style={[styles.stepDesc, step.active && styles.stepDescActive]}>
        {step.desc}
      </Text>
      {step.active && (
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      )}
    </View>
  </View>
);

// ─── Map Card ─────────────────────────────────────────────────────────────────

const MapCard = () => (
  <View style={styles.mapCard}>
    <View style={styles.mapBg}>
      <View style={styles.routeLayer}>
        <Text style={styles.truckEmoji}>🚚</Text>
        <View style={styles.routeDots}>
          {[...Array(8)].map((_, i) => <View key={i} style={styles.routeDot} />)}
        </View>
        <Text style={styles.pinEmoji}>📍</Text>
      </View>
    </View>

    <View style={styles.etaCard}>
      <View style={styles.etaItem}>
        <Text style={styles.etaLabel}>ESTIMATED ARRIVAL</Text>
        <Text style={styles.etaValue}>14:45 PM</Text>
      </View>
      <View style={styles.etaDivider} />
      <View style={styles.etaItem}>
        <Text style={styles.etaLabel}>DISTANCE</Text>
        <Text style={styles.etaValue}>1.2 km</Text>
      </View>
    </View>
  </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

const CustomerOrderTrackingScreen = ({ navigation }) => (
  <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
    <StatusBar barStyle="dark-content" backgroundColor="#faf8f5" />

    {/* Header */}
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backBtn}
        activeOpacity={0.7}>
        <ArrowLeft2 size={22} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Mauli Mart</Text>
      <TouchableOpacity activeOpacity={0.7}>
        <Notification size={22} color={colors.text} variant="Linear" />
      </TouchableOpacity>
    </View>

    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

      {/* Order heading */}
      <View style={styles.orderHead}>
        <Text style={styles.orderIdTag}>ORDER #MM-82910</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusTitle}>In-Transit</Text>
          <View style={styles.liveTag}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live Tracking</Text>
          </View>
        </View>
      </View>

      <MapCard />

      {/* Vendor row */}
      <View style={styles.vendorRow}>
        <View style={styles.vendorLogo}>
          <Text style={styles.vendorLogoEmoji}>🌾</Text>
        </View>
        <View style={styles.vendorInfo}>
          <Text style={styles.vendorName}>Green Valley Farms</Text>
          <Text style={styles.vendorRating}>★ 4.9  Premium Vendor</Text>
        </View>
        <TouchableOpacity style={styles.callBtn} activeOpacity={0.75}>
          <Call size={18} color={colors.primary} variant="Bold" />
        </TouchableOpacity>
      </View>

      {/* Status stepper */}
      <View style={styles.stepper}>
        {STEPS.map((step, idx) => (
          <StatusStep key={step.id} step={step} isLast={idx === STEPS.length - 1} />
        ))}
      </View>

    </ScrollView>
  </SafeAreaView>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#faf8f5' },
  scroll: { paddingBottom: 24 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.primary },

  // Order heading
  orderHead: { paddingHorizontal: 16, paddingBottom: 14 },
  orderIdTag: {
    fontSize: 10, fontWeight: '700', color: colors.primary,
    letterSpacing: 1.2, marginBottom: 6,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusTitle: { fontSize: 26, fontWeight: '800', color: colors.text },
  liveTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#dcfce7', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  liveText: { fontSize: 11, fontWeight: '700', color: colors.primary },

  // Map card
  mapCard: {
    marginHorizontal: 16, height: 186, borderRadius: 16,
    overflow: 'hidden', backgroundColor: '#1a4231', marginBottom: 14,
  },
  mapBg: { flex: 1, justifyContent: 'center', paddingBottom: 52 },
  routeLayer: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, gap: 6,
  },
  truckEmoji: { fontSize: 32 },
  routeDots: {
    flex: 1, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-around',
  },
  routeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  pinEmoji: { fontSize: 32 },
  etaCard: {
    position: 'absolute', bottom: 12, left: 12, right: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center',
  },
  etaItem: { flex: 1, alignItems: 'center' },
  etaLabel: { fontSize: 9, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.8, marginBottom: 3 },
  etaValue: { fontSize: 17, fontWeight: '800', color: colors.text },
  etaDivider: { width: 1, height: 36, backgroundColor: '#f3f4f6' },

  // Vendor row
  vendorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    marginBottom: 22,
  },
  vendorLogo: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center',
  },
  vendorLogoEmoji: { fontSize: 22 },
  vendorInfo: { flex: 1 },
  vendorName: { fontSize: 14, fontWeight: '700', color: colors.text },
  vendorRating: { fontSize: 12, color: '#d97706', fontWeight: '600', marginTop: 2 },
  callBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center',
  },

  // Stepper
  stepper: { paddingHorizontal: 16 },
  stepRow: { flexDirection: 'row' },
  stepLeft: { width: 36, alignItems: 'center' },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center',
    zIndex: 1,
  },
  stepCircleDone:   { backgroundColor: colors.primary },
  stepCircleActive: { backgroundColor: '#0891b2' },
  activeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },
  connector: { width: 2, flex: 1, backgroundColor: '#e5e7eb', marginVertical: 2 },
  connectorDone: { backgroundColor: colors.primary },

  stepContent: { flex: 1, paddingLeft: 12, paddingBottom: 20 },
  stepContentActive: {
    backgroundColor: '#ecfeff', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#a5f3fc', marginBottom: 0,
  },
  stepLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  stepLabelActive: { color: '#0891b2' },
  stepDesc: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  stepDescActive: { fontSize: 12, color: '#0891b2', opacity: 0.8, marginTop: 2 },

  progressTrack: {
    height: 3, backgroundColor: '#a5f3fc', borderRadius: 2,
    marginTop: 8, overflow: 'hidden',
  },
  progressFill: {
    width: '65%', height: '100%',
    backgroundColor: colors.primary, borderRadius: 2,
  },
});

export default CustomerOrderTrackingScreen;
