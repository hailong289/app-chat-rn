/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { StatusBar, useColorScheme } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import AppNavigator from './src/navigations/AppNavigator';
import { GluestackUIProvider } from '@/src/components/ui/gluestack-ui-provider';
import '@/global.css';
import ToastManager from 'toastify-react-native'
import { FirebaseProvider } from './src/providers/firebase.provider';
import { SQLiteProvider } from './src/providers/sqlite.provider';
import { SocketProvider } from './src/providers/socket.provider';
import { SocketEventGlobal } from './src/pages/event/socket.global';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <GluestackUIProvider mode="dark" >
      <SafeAreaProvider>
        <FirebaseProvider>
          <SQLiteProvider>
            <SocketProvider>
              <SocketEventGlobal />
              <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
              <AppNavigator />
            </SocketProvider>
          </SQLiteProvider>
          <ToastManager />
        </FirebaseProvider>
      </SafeAreaProvider>
    </GluestackUIProvider>
  );
}

export default App;