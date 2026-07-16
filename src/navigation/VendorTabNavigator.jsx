import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  VendorHomeScreen,
  VendorOrdersScreen,
  VendorPricesScreen,
  VendorProfileScreen,
} from '../screens/vendor';
import {
  HomeTabIcon,
  OrdersTabIcon,
  PricesTabIcon,
  ProfileTabIcon,
} from '../components/vendor/VendorIcons';
import { colors } from '../theme/colors';
import { useVendorPricingStatus } from '../hooks/useVendorQueries';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = {
  Home: { label: 'HOME', Icon: HomeTabIcon },
  Orders: { label: 'ORDERS', Icon: OrdersTabIcon },
  Prices: { label: 'PRICES', Icon: PricesTabIcon },
  Profile: { label: 'PROFILE', Icon: ProfileTabIcon },
};

// While pricing is not complete the vendor is locked to the Prices tab — every
// other tab is disabled (dimmed, non-navigable) until all item prices are set.
const VendorTabBar = ({ state, navigation, pricingLocked }) => {
  const insets = useSafeAreaInsets();

  // If pricing status resolves to "locked" after the navigator already mounted
  // (async fetch), force the vendor onto the Prices tab.
  const currentRoute = state.routes[state.index]?.name;
  useEffect(() => {
    if (pricingLocked && currentRoute !== 'Prices') {
      navigation.navigate('Prices');
    }
  }, [pricingLocked, currentRoute, navigation]);

  return (
    <View
      style={[
        styles.tabBar,
        { paddingBottom: Math.max(insets.bottom, 10), paddingTop: 10 },
      ]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { label, Icon } = TAB_CONFIG[route.name];
        const disabled = pricingLocked && route.name !== 'Prices';

        return (
          <TouchableOpacity
            key={route.key}
            onPress={() => {
              if (disabled) return;
              navigation.navigate(route.name);
            }}
            activeOpacity={disabled ? 1 : 0.8}
            style={[
              styles.tabItem,
              focused && styles.tabItemActive,
              disabled && styles.tabItemDisabled,
            ]}>
            <Icon color={focused ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingHorizontal: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 72,
  },
  tabItemActive: {
    backgroundColor: '#dcfce7',
  },
  tabItemDisabled: {
    opacity: 0.4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.5,
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.primary,
  },
});

const VendorTabNavigator = () => {
  // Gate the vendor to the Prices tab until pricing is completed. We treat an
  // explicit `false` as locked; while the status is still loading (undefined)
  // we don't lock, so tabs aren't briefly disabled on every app open.
  const { data: statusRes } = useVendorPricingStatus();
  const pricingLocked = statusRes?.data?.isPricingCompleted === false;

  return (
    <Tab.Navigator
      tabBar={props => <VendorTabBar {...props} pricingLocked={pricingLocked} />}
      screenOptions={{ headerShown: false }}
      initialRouteName={pricingLocked ? 'Prices' : 'Home'}>
      <Tab.Screen name="Home" component={VendorHomeScreen} />
      <Tab.Screen name="Orders" component={VendorOrdersScreen} />
      <Tab.Screen name="Prices" component={VendorPricesScreen} />
      <Tab.Screen name="Profile" component={VendorProfileScreen} />
    </Tab.Navigator>
  );
};

export default VendorTabNavigator;
