/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { Suspense } from 'react';
import { StatusBar, useColorScheme, View, Text, ActivityIndicator } from 'react-native';
import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import { GluestackUIProvider } from '@/src/components/ui/gluestack-ui-provider';
import '@/global.css';
import ToastManager from 'toastify-react-native';
import { FirebaseProvider } from './src/providers/firebase.provider';
import { SQLiteProvider } from './src/providers/sqlite.provider';
import { SocketProvider } from './src/providers/socket.provider';
import { SocketEventGlobal } from './src/pages/event/socket.global';
import ErrorBoundary from './src/components/ui/ErrorBoundary';

const AppNavigator = React.lazy(() => import('./src/navigations/AppNavigator'));

function Fallback() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
      <ActivityIndicator size="large" color="#42A59F" />
      <Text className="text-gray-500 mt-4 text-sm">Đang tải...</Text>
    </View>
  );
}

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <ErrorBoundary fallbackName="App">
      <GluestackUIProvider mode="dark">
        <SafeAreaProvider>
          <FirebaseProvider>
            <SQLiteProvider>
              <SocketProvider>
                <SocketEventGlobal />
                <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
                <Suspense fallback={<Fallback />}>
                  <AppNavigator />
                </Suspense>
              </SocketProvider>
            </SQLiteProvider>
            <ToastManager />
          </FirebaseProvider>
        </SafeAreaProvider>
      </GluestackUIProvider>
    </ErrorBoundary>
  );
}

export default App;
