import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MainNavigator from './MainNavigator';
import SearchPage from '../pages/search.page';
import ChatPage from '../pages/chat.page';
import HeaderSearchComponent from '../components/headers/headers-search.component';
import HeaderChatComponent from '../components/headers/headers-chat.component';

export type MainStackParamList = {
    Main: undefined;
    Search: undefined;
    Chat: {
        roomId: string;
    };
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
            <MainStack.Screen 
                name="Chat" 
                component={ChatPage} 
                options={{ 
                    headerShown: true,
                    header: (props) => <HeaderChatComponent {...props} />
                }}
            />
        </MainStack.Navigator>
    );
};

export default MainStackNavigator;
