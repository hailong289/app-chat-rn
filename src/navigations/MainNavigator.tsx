import { createBottomTabNavigator, BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { TouchableOpacity } from "react-native";
import { useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import HomePage from "../pages/home.page";
import { FontAwesome } from "@react-native-vector-icons/fontawesome";
import SettingsStackNavigator from "./SettingsStackNavigator";
import NotificationPage from "../pages/notification.page";
import ContactPage from "../pages/contact/contact.page";
import MoreMenuPage from "../pages/more-menu.page";
import { useAppMenu } from "../providers/app-menu.provider";
import { MainStackParamList } from "./MainStackNavigator";

export type MainTabParamList = {
    Home: undefined;
    Contact: {
        activeTab?: 'friends' | 'groups' | 'requests' | 'pending';
    } | undefined;
    MoreMenu: undefined;
    Notification: undefined;
    SettingsPage: undefined;
};

const MainTab = createBottomTabNavigator<MainTabParamList>();

const MoreMenuTabButton = ({
    openMenu,
    ...props
}: BottomTabBarButtonProps & { openMenu: () => void }) => (
    <TouchableOpacity
        {...props}
        onPress={openMenu}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Mở menu tiện ích"
    />
);

const MainNavigator = () => {
    const { openMenu, registerStackNavigation } = useAppMenu();
    const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

    useEffect(() => {
        registerStackNavigation(navigation);
    }, [navigation, registerStackNavigation]);

    return (
        <MainTab.Navigator
            screenOptions={{
                tabBarStyle: {
                    backgroundColor: '#fff',
                    height: 90,
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    shadowColor: '#999999',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                },
                tabBarLabelStyle: {
                    fontSize: 14,
                    fontWeight: '600',
                    textAlign: 'center',
                },
                tabBarItemStyle: {
                    width: '100%',
                    flex: 1,
                },
                tabBarActiveTintColor: '#E0F2F1',
                tabBarActiveBackgroundColor: '#42A59F',
                tabBarInactiveTintColor: 'gray',
            }}
        >
            <MainTab.Screen
                name="Home"
                component={HomePage}
                options={{
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => <FontAwesome name="home" size={size} color={color} />,
                    tabBarLabel: 'Trang chủ',
                }}
            />
            <MainTab.Screen
                name="Contact"
                component={ContactPage}
                options={{
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => <FontAwesome name="users" size={size} color={color} />,
                    tabBarLabel: 'Danh bạ',
                }}
            />
            <MainTab.Screen
                name="MoreMenu"
                component={MoreMenuPage}
                options={{
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => <FontAwesome name="th-large" size={size} color={color} />,
                    tabBarLabel: 'Thêm',
                    tabBarButton: (props) => <MoreMenuTabButton {...props} openMenu={openMenu} />,
                }}
            />
            <MainTab.Screen
                name="Notification"
                component={NotificationPage}
                options={{
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => <FontAwesome name="bell" size={size} color={color} />,
                    tabBarLabel: 'Thông báo',
                }}
            />
            <MainTab.Screen
                name="SettingsPage"
                component={SettingsStackNavigator}
                options={{
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => <FontAwesome name="cog" size={size} color={color} />,
                    tabBarLabel: 'Cài đặt',
                }}
            />
        </MainTab.Navigator>
    );
};

export default MainNavigator;
