import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { navigationRef } from './navigationRef';
import SplashScreen from '../screens/SplashScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import OtpScreen from '../screens/OtpScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import TransporterKycScreen from '../screens/onboarding/TransporterKycScreen';
import VerificationPendingScreen from '../screens/onboarding/VerificationPendingScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import TransporterTabNavigator from './TransporterTabNavigator';
import {
  TransporterProfileDetailsScreen,
  TransporterDeliveryHistoryScreen,
  TransporterOrderDetailScreen,
  TransporterVendorDetailScreen,
  PickupScannerScreen,
  TransporterMyOrdersScreen,
} from '../screens/transporter';

const Stack = createNativeStackNavigator();

const HEADER = {
  headerStyle: { backgroundColor: '#fff' },
  headerTintColor: '#2e7d32',
  headerTitleStyle: { fontWeight: '800', fontSize: 18, color: '#2e7d32' },
  headerShadowVisible: false,
};

const RootNavigator = () => (
  <NavigationContainer ref={navigationRef}>
    <Stack.Navigator initialRouteName="Splash" screenOptions={HEADER}>
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{ title: 'Mauli Transporter', headerBackVisible: false }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: 'Mauli Transporter', headerBackTitle: '' }}
      />
      <Stack.Screen
        name="Otp"
        component={OtpScreen}
        options={{ title: 'Verify Number', headerBackTitle: '' }}
      />
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{
          title: 'Transporter Registration',
          headerBackTitle: '',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="TransporterKyc"
        component={TransporterKycScreen}
        options={{
          title: 'Transporter Registration',
          headerBackTitle: '',
          gestureEnabled: false,
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="VerificationPending"
        component={VerificationPendingScreen}
        options={{ title: 'Mauli Transporter', headerBackVisible: false }}
      />
      {/* Post-approval landing: Orders + Profile tabs. */}
      <Stack.Screen
        name="TransporterApp"
        component={TransporterTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TransporterProfileDetails"
        component={TransporterProfileDetailsScreen}
        options={{ title: 'Profile Details', headerBackTitle: '' }}
      />
      <Stack.Screen
        name="TransporterDeliveryHistory"
        component={TransporterDeliveryHistoryScreen}
        options={{ title: 'Delivery History', headerBackTitle: '' }}
      />
      <Stack.Screen
        name="TransporterOrderDetail"
        component={TransporterOrderDetailScreen}
        options={{ title: 'Order Details', headerBackTitle: '' }}
      />
      <Stack.Screen
        name="TransporterMyOrders"
        component={TransporterMyOrdersScreen}
        options={{ title: 'My Orders', headerBackTitle: '' }}
      />
      <Stack.Screen
        name="TransporterVendorDetail"
        component={TransporterVendorDetailScreen}
        options={({ route }) => ({
          title: route?.params?.vendor?.vendorName ?? 'Vendor',
          headerBackTitle: '',
        })}
      />
      {/* Full-bleed camera: its own dark header would fight the preview. */}
      <Stack.Screen
        name="PickupScanner"
        component={PickupScannerScreen}
        options={{ title: 'Scan Pickup QR', headerBackTitle: '', headerTransparent: true }}
      />
      <Stack.Screen
        name="HelpSupport"
        component={HelpSupportScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  </NavigationContainer>
);

export default RootNavigator;
