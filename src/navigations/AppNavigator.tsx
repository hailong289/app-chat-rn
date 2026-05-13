import React, { useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AuthNavigator from './AuthNavigator';
import MainStackNavigator from './MainStackNavigator';
import useAuthStore from '../store/useAuth';
import { setCallNavigationRef } from '../store/useCallStore';
import IncomingCallOverlay from '../components/call/incoming-call';

export type RootStackParamList = {
    Auth: undefined;
    MainStack: undefined;
};

const RootStack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
    const { isAuthenticated } = useAuthStore();
    const navigationRef = useRef<NavigationContainerRef<any>>(null);

    return (
        <NavigationContainer
            ref={navigationRef}
            onReady={() => {
                setCallNavigationRef(navigationRef.current);
            }}
        >
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
                {isAuthenticated ? (
                    <RootStack.Screen name="MainStack" component={MainStackNavigator} />
                ) : (
                    <RootStack.Screen name="Auth" component={AuthNavigator} />
                )}
            </RootStack.Navigator>
            {/* Incoming call overlay — mounted globally so it shows on any screen */}
            <IncomingCallOverlay />
        </NavigationContainer>
    );
};

export default AppNavigator;