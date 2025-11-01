import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AuthNavigator from './AuthNavigator';
import MainStackNavigator from './MainStackNavigator';
import useAuthStore from '../store/useAuth';

export type RootStackParamList = {
    Auth: undefined;
    MainStack: undefined;
};

const RootStack = createStackNavigator<RootStackParamList>();
// Root navigator
const AppNavigator = () => {
    const { isAuthenticated } = useAuthStore(); 

    return (
        <NavigationContainer>
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
                {isAuthenticated ? (
                    <RootStack.Screen name="MainStack" component={MainStackNavigator} />
                ) : (
                    <RootStack.Screen name="Auth" component={AuthNavigator} />
                )}
            </RootStack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;