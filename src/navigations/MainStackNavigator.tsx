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
import TodoListPage from '../pages/todo/todo-list';
import DeckListPage from '../pages/flashcard/deck-list';
import HeaderSearchComponent from '../components/headers/headers-search.component';
import HeaderChatComponent from '../components/headers/headers-chat.component';
import HeaderComponent from '../components/headers/headers.component';
import { AppMenuProvider } from '../providers/app-menu.provider';
import type { CallMember } from '../types/call.state';

export type MainStackParamList = {
    Main: NavigatorScreenParams<MainTabParamList> | undefined;
    Search: undefined;
    Chat: {
        roomId: string;
    };
    AddContact: undefined;
    Call: {
        roomId: string;
        /** In-app navigation passes `CallMember[]`; legacy/web may pass encrypted string. */
        members: CallMember[] | string;
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
    TodoList: { projectId?: string } | undefined;
    DeckList: undefined;
};

const MainStack = createStackNavigator<MainStackParamList>();

const MainStackNavigator = () => {

    return (
        <AppMenuProvider>
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
                    headerShown: true,
                }}
            />
            <MainStack.Screen
                name="DocumentEditor"
                component={DocumentEditorPage}
                options={{
                    headerShown: true,
                    gestureEnabled: true,
                }}
            />
            <MainStack.Screen
                name="TodoList"
                component={TodoListPage}
                options={{ headerShown: true }}
            />
            <MainStack.Screen
                name="DeckList"
                component={DeckListPage}
                options={{ headerShown: true }}
            />
        </MainStack.Navigator>
        </AppMenuProvider>
    );
};

export default MainStackNavigator;
