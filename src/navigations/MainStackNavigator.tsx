import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigatorScreenParams } from '@react-navigation/native';
import MainNavigator, { MainTabParamList } from './MainNavigator';
import SearchPage from '../pages/search.page';
import ChatPage from '../pages/chat.page';
import AddContactPage from '../pages/add-contact.page';
import CallPage from '../pages/call.page';
import DocumentListPage from '../pages/docs/document-list';
import DocumentEditorPage from '../pages/docs/document-editor';
import HeaderSearchComponent from '../components/headers/headers-search.component';
import HeaderChatComponent from '../components/headers/headers-chat.component';

export type MainStackParamList = {
    Main: NavigatorScreenParams<MainTabParamList> | undefined;
    Search: undefined;
    Chat: {
        roomId: string;
    };
    AddContact: undefined;
    Call: {
        roomId: string;
        members: string;
        callType: 'audio' | 'video';
        callMode: 'p2p' | 'sfu';
        status: string;
        callId?: string;
        isCaller?: boolean;
    };
    DocumentList: undefined;
    DocumentEditor: {
        docId: string;
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
            <MainStack.Screen 
                name="AddContact" 
                component={AddContactPage} 
                options={{ 
                    headerShown: false
                }}
            />
            <MainStack.Screen
                name="Call"
                component={CallPage}
                options={{
                    headerShown: false,
                    gestureEnabled: false,
                    presentation: 'modal',
                }}
            />
            <MainStack.Screen
                name="DocumentList"
                component={DocumentListPage}
                options={{
                    headerShown: false,
                }}
            />
            <MainStack.Screen
                name="DocumentEditor"
                component={DocumentEditorPage}
                options={{
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
        </MainStack.Navigator>
    );
};

export default MainStackNavigator;
