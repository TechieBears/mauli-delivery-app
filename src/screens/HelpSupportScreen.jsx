import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft2, ArrowDown2, ArrowUp2, MessageQuestion, Call, Sms } from 'iconsax-react-native';
import { colors } from '../theme/colors';
import { useSupportContact } from '../hooks/useSettingsQueries';
import { openDialer, openEmail } from '../utils/openLink';

// Shown until GET /settings/support responds, and if the admin has left the
// settings fields blank.
const FALLBACK_SUPPORT = {
  phone: '9833355302',
  email: 'contact@mauligmart.com',
};

const FAQS = [
  { id: 'f1', q: 'How do I place a new order?', a: 'Go to Home tab and tap "Start New Order". Browse the catalog, select items and quantities, then proceed to checkout.' },
  { id: 'f2', q: 'How do I track my order?', a: 'After placing an order, go to the Orders tab and tap on your active order to see live tracking and status updates.' },
  { id: 'f3', q: 'Can I cancel or modify an order?', a: 'Orders can be modified within 15 minutes of placement. Contact support via call or chat for any urgent changes.' },
  { id: 'f4', q: 'How does wallet payment work?', a: 'Your wallet is pre-loaded by the admin. All order payments are deducted automatically from your wallet balance.' },
  { id: 'f5', q: 'How are prices determined?', a: 'Prices are set by vendors and reviewed daily based on market rates. Emergency catalog may have different pricing.' },
];

const FaqItem = ({ item }) => {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity
      style={styles.faqItem}
      onPress={() => setOpen(v => !v)}
      activeOpacity={0.75}>
      <View style={styles.faqHeader}>
        <Text style={styles.faqQ}>{item.q}</Text>
        {open
          ? <ArrowUp2 size={16} color={colors.primary} />
          : <ArrowDown2 size={16} color="#9ca3af" />}
      </View>
      {open && <Text style={styles.faqA}>{item.a}</Text>}
    </TouchableOpacity>
  );
};

const HelpSupportScreen = ({ navigation }) => {
  const { data: support } = useSupportContact();
  const phone = support?.phone || FALLBACK_SUPPORT.phone;
  const email = support?.email || FALLBACK_SUPPORT.email;

  return (
  <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
    <StatusBar barStyle="dark-content" backgroundColor="#faf8f5" />

    {/* Header */}
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
        <ArrowLeft2 size={22} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Help & Support</Text>
      <View style={{ width: 36 }} />
    </View>

    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <MessageQuestion size={36} color={colors.primary} variant="Bold" />
        </View>
        <Text style={styles.heroTitle}>How can we help?</Text>
        <Text style={styles.heroSub}>Browse FAQs or reach out to our support team directly.</Text>
      </View>

      {/* FAQ */}
      <Text style={styles.sectionLabel}>FREQUENTLY ASKED</Text>
      <View style={styles.faqCard}>
        {FAQS.map((item, idx) => (
          <View key={item.id}>
            <FaqItem item={item} />
            {idx < FAQS.length - 1 && <View style={styles.faqSep} />}
          </View>
        ))}
      </View>

      {/* Contact */}
      <Text style={styles.sectionLabel}>CONTACT US</Text>
      <View style={styles.contactCard}>
        <TouchableOpacity
          style={styles.contactRow}
          activeOpacity={0.75}
          onPress={() => openDialer(phone)}>
          <View style={[styles.contactIcon, { backgroundColor: '#dcfce7' }]}>
            <Call size={20} color={colors.primary} variant="Bold" />
          </View>
          <View style={styles.contactMeta}>
            <Text style={styles.contactLabel}>Call Support</Text>
            <Text style={styles.contactDesc}>{phone}</Text>
            <Text style={styles.contactHint}>Mon–Sat, 9 AM – 6 PM</Text>
          </View>
          <ArrowLeft2 size={16} color="#d1d5db" style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>
        <View style={styles.faqSep} />
        <TouchableOpacity
          style={styles.contactRow}
          activeOpacity={0.75}
          onPress={() => openEmail(email, 'Mauli Gmart — Transporter support request')}>
          <View style={[styles.contactIcon, { backgroundColor: '#eff6ff' }]}>
            <Sms size={20} color="#1d4ed8" variant="Bold" />
          </View>
          <View style={styles.contactMeta}>
            <Text style={styles.contactLabel}>Email Support</Text>
            <Text style={styles.contactDesc}>{email}</Text>
          </View>
          <ArrowLeft2 size={16} color="#d1d5db" style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>
      </View>

    </ScrollView>
  </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#faf8f5' },
  scroll: { paddingBottom: 24 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.text },

  hero: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24 },
  heroIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  heroTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 6 },
  heroSub: { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 19 },

  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: '#9ca3af', letterSpacing: 1.2,
    marginHorizontal: 16, marginBottom: 10,
  },

  faqCard: {
    backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  faqItem: { padding: 14 },
  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  faqQ: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  faqA: { fontSize: 13, color: '#6b7280', lineHeight: 19, marginTop: 8 },
  faqSep: { height: 1, backgroundColor: '#f3f4f6' },

  contactCard: {
    backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  contactIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  contactMeta: { flex: 1 },
  contactLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  contactDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  contactHint: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
});

export default HelpSupportScreen;
