import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TransporterHomeScreen,
  TransporterProfileScreen,
} from '../screens/transporter';
import { HomeTabIcon, ProfileTabIcon } from '../components/vendor/VendorIcons';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = {
  Home: { label: 'HOME', Icon: HomeTabIcon },
  Profile: { label: 'PROFILE', Icon: ProfileTabIcon },
};

const TransporterTabBar = ({ state, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tabBar,
        { paddingBottom: Math.max(insets.bottom, 10), paddingTop: 10 },
      ]}>
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

const TransporterTabNavigator = () => (
  <Tab.Navigator
    tabBar={props => <TransporterTabBar {...props} />}
    screenOptions={{ headerShown: false }}
    initialRouteName="Home">
    <Tab.Screen name="Home" component={TransporterHomeScreen} />
    <Tab.Screen name="Profile" component={TransporterProfileScreen} />
  </Tab.Navigator>
);

export default TransporterTabNavigator;
