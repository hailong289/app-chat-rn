/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

if (__DEV__) {
  require("./ReactotronConfig.js");
}

AppRegistry.registerComponent(appName, () => App);
