import React from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUsers } from '../hooks/useUsers';
import { Button } from '../components';
import { colors } from '../theme/colors';

const UserCard = ({ user }) => (
  <View style={styles.card}>
    <Text style={styles.cardName}>{user.name}</Text>
    <Text style={styles.cardEmail}>{user.email}</Text>
    <Text style={styles.cardCompany}>{user.company?.name}</Text>
  </View>
);

const HomeScreen = () => {
  const { data: users, isLoading, isError, error, refetch, isFetching } = useUsers();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Oops!</Text>
        <Text style={styles.errorBody}>{error?.message || 'Failed to load'}</Text>
        <Button title="Try Again" onPress={refetch} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FlatList
        data={users}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => <UserCard user={item} />}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Users</Text>
            <Text style={styles.subtitle}>
              Fetched via TanStack Query + Axios
            </Text>
            <View style={styles.refreshWrap}>
              <Button
                title="Refresh"
                size="sm"
                onPress={refetch}
                loading={isFetching && !isLoading}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No data found</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  errorBody: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textSecondary,
  },
  refreshWrap: {
    marginTop: 16,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  cardEmail: {
    marginTop: 2,
    fontSize: 14,
    color: colors.textSecondary,
  },
  cardCompany: {
    marginTop: 2,
    fontSize: 12,
    color: colors.primary,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    color: colors.textMuted,
  },
  listContent: {
    paddingBottom: 20,
  },
});

export default HomeScreen;
