import React from 'react';
import { StatusBar , View, Text} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import RootNavigator from './src/navigation/RootNavigator';
import useAppPermissions from './src/hooks/useAppPermissions';
import usePushNotifications from './src/hooks/usePushNotifications';
import { toastConfig } from './src/utils/toastConfig';
import queryClient from './src/services/queryClient';

// Push setup lives in a child of QueryClientProvider so its cache invalidations
// resolve against the same client the rest of the tree uses.
const PushGate = () => {
  usePushNotifications();
  return null;
};

function App() {
  useAppPermissions();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <PushGate />
          <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
          <RootNavigator />
          <Toast config={toastConfig} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
