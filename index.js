/**
 * @format
 */

// Required for crypto-js (AES) in React Native — must be first import.
import 'react-native-get-random-values';

import { ensureWebRtcGlobals } from './src/libs/webrtc-globals';
ensureWebRtcGlobals();

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

if (__DEV__) {
  require("./ReactotronConfig.js");
}

AppRegistry.registerComponent(appName, () => App);
