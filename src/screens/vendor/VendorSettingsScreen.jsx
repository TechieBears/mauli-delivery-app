import React, { useState } from 'react';
import { View, Text, Switch, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Notification } from 'iconsax-react-native';
import { colors } from '../../theme/colors';
import AppHeader from '../../components/AppHeader';

const VendorSettingsScreen = ({ navigation }) => {
  const [pushEnabled, setPushEnabled] = useState(true);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader
        leftIcon="back"
        title="Account"
        rightIcon="settings"
        onLeftPress={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Settings</Text>
        <Text style={styles.pageSubtitle}>
          Manage your preferences and security details.
        </Text>

        <View style={styles.sectionHeader}>
          <Notification size={13} color={colors.primary} variant="Linear" />
          <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingMeta}>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingDesc}>Immediate alerts on your device</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: '#e5e7eb', true: colors.primary }}
              thumbColor="#fff"
              ios_backgroundColor="#e5e7eb"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#faf8f5' },
  content: { paddingHorizontal: 16, paddingBottom: 32 },

  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginTop: 24,
    marginBottom: 6,
  },
  pageSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 28,
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

  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
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
  settingDesc: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});

export default VendorSettingsScreen;
