import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { navigationRef } from './navigationRef';
import SplashScreen from '../screens/SplashScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import OtpScreen from '../screens/OtpScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import VerificationPendingScreen from '../screens/onboarding/VerificationPendingScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';

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
        name="VerificationPending"
        component={VerificationPendingScreen}
        options={{ title: 'Mauli Transporter', headerBackVisible: false }}
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
