import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MainNavigator from './MainNavigator';
import SearchPage from '../pages/search.page';
import HeaderSearchComponent from '../components/headers/headers-search.component';

export type MainStackParamList = {
    Main: undefined;
    Search: undefined;
};

const MainStack = createStackNavigator<MainStackParamList>();

const MainStackNavigator = () => {

    return (
        <MainStack.Navigator screenOptions={{ headerShown: false }}>
            <MainStack.Screen name="Main" component={MainNavigator} />
            <MainStack.Screen 
                name="Search" 
                component={SearchPage} 
                options={{ 
                    headerShown: true,
                    header: (props) => (
                        <HeaderSearchComponent
                            leftIcon="arrow-left"
                            onLeftPress={() => props.navigation.goBack()}
                            searchPlaceholder="Tìm kiếm người dùng..."
                            autoFocus={true}
                            backgroundColor="#42A59F"
                            statusBarStyle="light-content"
                            height={56}
                            searchHeight={44}
                            showStatusBar={true}
                        />
                    )
                }} 
            />
        </MainStack.Navigator>
    );
};

export default MainStackNavigator;

