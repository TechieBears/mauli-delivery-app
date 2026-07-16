import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home2, ShoppingBag, Wallet2, Profile } from 'iconsax-react-native';
import { colors } from '../theme/colors';
import CustomerHomeScreen from '../screens/customer/CustomerHomeScreen';
import CustomerOrdersScreen from '../screens/customer/CustomerOrdersScreen';
import CustomerWalletScreen from '../screens/customer/CustomerWalletScreen';
import CustomerProfileScreen from '../screens/customer/CustomerProfileScreen';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = {
  Home:    { label: 'HOME',    Icon: ({ color }) => <Home2 size={22} color={color} variant="Linear" /> },
  Orders:  { label: 'ORDERS',  Icon: ({ color }) => <ShoppingBag size={22} color={color} variant="Linear" /> },
  Wallet:  { label: 'WALLET',  Icon: ({ color }) => <Wallet2 size={22} color={color} variant="Linear" /> },
  Profile: { label: 'PROFILE', Icon: ({ color }) => <Profile size={22} color={color} variant="Linear" /> },
};

const CustomerTabBar = ({ state, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 10), paddingTop: 10 }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { label, Icon } = TAB_CONFIG[route.name];
        return (
          <TouchableOpacity
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            activeOpacity={0.8}
            style={[styles.tabItem, focused && styles.tabItemActive]}>
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

const CustomerTabNavigator = () => (
  <Tab.Navigator
    tabBar={props => <CustomerTabBar {...props} />}
    screenOptions={{ headerShown: false }}>
    <Tab.Screen name="Home"    component={CustomerHomeScreen} />
    <Tab.Screen name="Orders"  component={CustomerOrdersScreen} />
    <Tab.Screen name="Wallet"  component={CustomerWalletScreen} />
    <Tab.Screen name="Profile" component={CustomerProfileScreen} />
  </Tab.Navigator>
);

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
  tabItemActive: { backgroundColor: '#dcfce7' },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.5,
    color: colors.textMuted,
  },
  tabLabelActive: { color: colors.primary },
});

export default CustomerTabNavigator;
