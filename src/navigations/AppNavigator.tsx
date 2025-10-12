import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import useAuthStore from '../store/useAuth';

// Placeholder screens - replace these with your actual screens
const HomeScreen = () => <></>;
const ChatScreen = () => <></>;
const ProfileScreen = () => <></>;

// Define types for our navigation
export type RootStackParamList = {
    Auth: undefined;
    Main: undefined;
};

const RootStack = createStackNavigator<RootStackParamList>();
// Root navigator
const AppNavigator = () => {
    const { isAuthenticated } = useAuthStore(); 

    return (
        <NavigationContainer>
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
                {isAuthenticated ? (
                    <RootStack.Screen name="Main" component={MainNavigator} />
                ) : (
                    <RootStack.Screen name="Auth" component={AuthNavigator} />
                )}
            </RootStack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;