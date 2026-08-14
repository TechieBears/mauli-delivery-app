/**
 * @format
 */

// Must be the very first import — required by react-native-gesture-handler for
// correct gesture handling on Android.
import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Must be registered at module scope, outside any component: Firebase runs this
// in a short-lived headless JS task when a push arrives with the app killed or
// backgrounded, at which point no React tree exists. Registering it inside
// App.jsx would be too late and the handler would never fire.
//
// Deliberately minimal — the OS already displays the notification itself. This
// only exists so the handler is registered; doing real work here risks the task
// being killed mid-flight.
//
// Wrapped because this runs before anything else in the app: if the native
// module is missing (a binary built before `pod install` linked RNFBMessaging,
// or a stale release build), an unguarded call throws at module scope and takes
// down the entire bundle with "[runtime not ready]" before React can mount —
// which looks like a total app failure rather than "push isn't set up".
try {
  // v26 exposes a modular API (getMessaging + standalone functions) and no
  // longer has a default export — see the note in services/pushNotifications.js.
  const fb = require('@react-native-firebase/messaging');
  fb.setBackgroundMessageHandler(fb.getMessaging(), async () => {});
} catch (err) {
  console.warn(
    '[push] background handler not registered — @react-native-firebase/messaging ' +
      'native module unavailable. Rebuild the app after `pod install`.',
    err?.message,
  );
}

AppRegistry.registerComponent(appName, () => App);
