import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Trash } from 'phosphor-react-native';
import { colors } from '../theme/colors';
import AppHeader from '../components/AppHeader';
import {
  useClearNotifications,
  useMarkNotificationsRead,
  useNotifications,
} from '../hooks/useNotificationQueries';
import { metaForType } from '../constants/notifications';
import {
  ensurePushPermission,
  hasNotificationPermission,
} from '../services/pushNotifications';
import { openNotification } from '../utils/notificationEvents';
import { relativeTime } from '../utils/relativeTime';

const NotificationRow = ({ item, onPress }) => {
  const { Icon, tint, bg } = metaForType(item.type);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.row, !item.isRead && styles.rowUnread]}>
      <View style={[styles.iconWrap, { backgroundColor: bg }]}>
        <Icon size={18} color={tint} weight="regular" />
      </View>

      <View style={styles.rowBody}>
        <Text
          style={[styles.rowTitle, !item.isRead && styles.rowTitleUnread]}
          numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.rowText} numberOfLines={3}>
          {item.body}
        </Text>
        <Text style={styles.rowTime}>{relativeTime(item.createdAt)}</Text>
      </View>

      {!item.isRead ? <View style={styles.unreadDot} /> : null}
    </TouchableOpacity>
  );
};

const NotificationsScreen = ({ navigation }) => {
  const [unreadOnly, setUnreadOnly] = useState(false);

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotifications(unreadOnly);

  const markRead = useMarkNotificationsRead();
  const clear = useClearNotifications();

  // Opening this screen is a strong signal the user wants notifications, so if
  // the OS permission is off, prompt once. On approval ensurePushPermission
  // re-registers the device token with the API — a user who declined at first
  // run would otherwise stay unreachable until their next login.
  const [pushBlocked, setPushBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (await hasNotificationPermission()) return;

      const granted = await ensurePushPermission();
      // Only surface the banner when the prompt was actually declined. iOS
      // shows its dialog once per install; after that ensurePushPermission
      // resolves false without any UI, which is exactly when the user needs
      // pointing at Settings.
      if (!cancelled) setPushBlocked(!granted);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Flatten the pages, deduping by _id. The list is sorted createdAt desc and
  // paginated by offset, so a notification arriving between two page fetches
  // shifts every item down a slot — without this, the same row appears on both
  // pages and FlatList warns about duplicate keys.
  const items = useMemo(() => {
    const seen = new Set();
    const out = [];
    (data?.pages ?? []).forEach(page => {
      (page?.data ?? []).forEach(n => {
        if (seen.has(n._id)) return;
        seen.add(n._id);
        out.push(n);
      });
    });
    return out;
  }, [data]);

  const hasUnread = items.some(n => !n.isRead);

  const onRowPress = useCallback(item => openNotification(item), []);

  const confirmClearAll = () =>
    Alert.alert('Clear all notifications?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear all',
        style: 'destructive',
        onPress: () => clear.mutate({ all: true }),
      },
    ]);

  const renderBody = () => {
    if (isLoading) {
      return (
        <View style={styles.stateBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (isError) {
      return (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>Couldn't load notifications.</Text>
          <TouchableOpacity
            onPress={() => refetch()}
            activeOpacity={0.85}
            style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={items}
        keyExtractor={item => String(item._id)}
        renderItem={({ item }) => (
          <NotificationRow item={item} onPress={() => onRowPress(item)} />
        )}
        refreshControl={
          <RefreshControl
            // Guarded so loading page 3 doesn't spin the pull-to-refresh
            // control at the top of the list.
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator style={styles.footer} color={colors.primary} />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.stateBox}>
            <Bell size={40} color={colors.textMuted} weight="regular" />
            <Text style={styles.emptyTitle}>
              {unreadOnly ? 'No unread notifications' : 'No notifications yet'}
            </Text>
            <Text style={styles.emptyBody}>
              {unreadOnly
                ? "You're all caught up."
                : 'Order updates and alerts will appear here.'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader
        title="Notifications"
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
      />

      {pushBlocked ? (
        <TouchableOpacity
          style={styles.permBanner}
          activeOpacity={0.8}
          onPress={() => Linking.openSettings()}>
          <Text style={styles.permTitle}>Notifications are turned off</Text>
          <Text style={styles.permBody}>
            You'll still see updates here, but your device won't alert you. Tap
            to enable them in Settings.
          </Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.toolbar}>
        <TouchableOpacity
          onPress={() => setUnreadOnly(v => !v)}
          activeOpacity={0.7}
          style={[styles.chip, unreadOnly && styles.chipActive]}>
          <Text style={[styles.chipText, unreadOnly && styles.chipTextActive]}>
            Unread only
          </Text>
        </TouchableOpacity>

        <View style={styles.toolbarRight}>
          {hasUnread ? (
            <TouchableOpacity
              onPress={() => markRead.mutate({ all: true })}
              activeOpacity={0.7}
              style={styles.textBtn}>
              <Text style={styles.textBtnLabel}>Mark all read</Text>
            </TouchableOpacity>
          ) : null}

          {items.length > 0 ? (
            <TouchableOpacity
              onPress={confirmClearAll}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Clear all notifications"
              style={styles.iconBtn}>
              <Trash size={18} color={colors.textSecondary} weight="regular" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {renderBody()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f7f4' },

  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  chipTextActive: { color: colors.primary },
  textBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  textBtnLabel: { fontSize: 12, fontWeight: '700', color: colors.primary },
  iconBtn: { padding: 6 },

  permBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  permTitle: { fontSize: 13, fontWeight: '800', color: '#92400e' },
  permBody: { fontSize: 11, color: '#92400e', marginTop: 3, lineHeight: 16 },

  listContent: { paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1 },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowUnread: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderLeftWidth: 3,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rowBody: { flex: 1 },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  rowTitleUnread: { fontWeight: '800' },
  rowText: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  rowTime: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    marginLeft: 8,
    marginTop: 4,
  },

  stateBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  stateText: { fontSize: 14, color: colors.textSecondary, marginBottom: 12 },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginTop: 12,
  },
  emptyBody: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  footer: { paddingVertical: 16 },
});

export default NotificationsScreen;
