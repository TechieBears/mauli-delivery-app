/**
 * @format
 */

// Must be the very first import — required by react-native-gesture-handler for
// correct gesture handling on Android.
import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
