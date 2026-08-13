import React, { useState } from 'react';
import { View, Text, Switch, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Notification, Trash } from 'iconsax-react-native';
import AppHeader from '../components/AppHeader';
import DeleteAccountModal from '../components/DeleteAccountModal';
import { storage } from '../storage';
import { STORAGE_KEYS } from '../constants';
import { colors } from '../theme/colors';

/**
 * App settings. Two sections: notification preferences at the top, and the
 * account-deletion entry pinned to the bottom of the screen (App Store guideline
 * 5.1.1(v) — deletion must be reachable in-app).
 *
 * The push toggle is a LOCAL preference only: it is stored in MMKV and not sent
 * to the server, so it silences in-app alerting on this device. It deliberately
 * does not control the delivery-tracking foreground notification, which the OS
 * requires to be visible while background location is running.
 */
const SettingsScreen = ({ navigation }) => {
  const [pushEnabled, setPushEnabled] = useState(
    () => storage.getBoolean(STORAGE_KEYS.PUSH_ENABLED) ?? true,
  );
  const [showDelete, setShowDelete] = useState(false);

  const togglePush = next => {
    setPushEnabled(next);
    storage.set(STORAGE_KEYS.PUSH_ENABLED, next);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader
        leftIcon="back"
        title="Settings"
        onLeftPress={() => navigation.goBack()}
      />

      {/* contentContainer grows so the delete section is pushed to the bottom on
          tall screens, but still scrolls into reach on short ones. */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View>
          <View style={styles.sectionHeader}>
            <Notification size={13} color={colors.primary} variant="Linear" />
            <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingMeta}>
                <Text style={styles.settingTitle}>Push Notifications</Text>
                <Text style={styles.settingDesc}>
                  Alerts about new orders and delivery updates
                </Text>
              </View>
              <Switch
                value={pushEnabled}
                onValueChange={togglePush}
                trackColor={{ false: '#e5e7eb', true: colors.primary }}
                thumbColor="#fff"
                ios_backgroundColor="#e5e7eb"
              />
            </View>
          </View>
        </View>

        <View style={styles.dangerZone}>
          <View style={styles.sectionHeader}>
            <Trash size={13} color="#ef4444" variant="Linear" />
            <Text style={[styles.sectionLabel, styles.dangerLabel]}>ACCOUNT</Text>
          </View>

          <TouchableOpacity
            style={styles.deleteRow}
            onPress={() => setShowDelete(true)}
            activeOpacity={0.75}>
            <View style={styles.settingMeta}>
              <Text style={styles.deleteTitle}>Delete Account</Text>
              <Text style={styles.settingDesc}>
                Permanently delete your account and personal data
              </Text>
            </View>
            <Trash size={20} color="#ef4444" variant="Linear" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <DeleteAccountModal
        visible={showDelete}
        onCancel={() => setShowDelete(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#faf8f5' },
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
  },
  dangerLabel: { color: '#ef4444' },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 12,
  },
  settingMeta: { flex: 1 },
  settingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  settingDesc: { fontSize: 12, color: colors.textSecondary },

  // Danger zone — visually separated from the preferences above so deletion is
  // never mistaken for another toggle.
  dangerZone: { marginTop: 40 },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  deleteTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ef4444',
    marginBottom: 3,
  },
});

export default SettingsScreen;
