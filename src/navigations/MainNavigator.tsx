import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomePage from "../pages/home.page";
import AboutPage from "../pages/about.page";
import { FontAwesome } from "@react-native-vector-icons/fontawesome";
import SettingsPage from "../pages/settings.page";
import NotificationPage from "../pages/notification.page";
import ContactPage from "../pages/contact/contact.page";
import HeaderComponent from "../components/headers/headers.component";
import HeaderSearchComponent from "../components/headers/headers-search.component";

export type MainTabParamList = {
    Home: undefined;
    SettingsPage: undefined;
    Notification: undefined;
    Contact: undefined;
};


const MainTab = createBottomTabNavigator<MainTabParamList>();

// Main tab navigator
const MainNavigator = () => (
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
                flex: 1
            },
            tabBarActiveTintColor: '#E0F2F1',
            tabBarActiveBackgroundColor: '#42A59F',
            tabBarInactiveTintColor: 'gray',
        }}
    >
        <MainTab.Screen
            name="Home" component={HomePage}
            options={{
                headerShown: false,
                tabBarIcon: ({ color, size }) => <FontAwesome name="home" size={size} color={color} />,
                tabBarLabel: 'Trang chủ',
            }} />
        <MainTab.Screen
            name="Contact" component={ContactPage}
            options={{
                header(props) {
                    return <HeaderSearchComponent 
                    rightIcon="user-plus"
                    onRightPress={() => {
                        props.navigation.navigate('AddContact');
                    }}
                    searchPlaceholder="Tìm kiếm người dùng..."
                    autoFocus={true}
                    backgroundColor="#42A59F"
                    statusBarStyle="light-content"
                    height={60}
                    searchHeight={44}
                    showStatusBar={true}
                    className=""
                    searchInputClassName="text-gray-700 text-[16px]"
                    {...props} />
                },
                tabBarIcon: ({ color, size }) => <FontAwesome name="users" size={size} color={color} />,
                tabBarLabel: 'Danh bạ',
            }} />
        <MainTab.Screen
            name="Notification" component={NotificationPage}
            options={{
                headerShown: false,
                tabBarIcon: ({ color, size }) => <FontAwesome name="bell" size={size} color={color} />,
                tabBarLabel: 'Thông báo',
            }} />
        <MainTab.Screen
            name="SettingsPage" component={SettingsPage}
            options={{
                header(props) {
                    return <HeaderComponent title="Cài đặt" {...props} />
                },
                tabBarIcon: ({ color, size }) => <FontAwesome name="cog" size={size} color={color} />,
                tabBarLabel: 'Cài đặt',
            }} />
        
    </MainTab.Navigator>
);

export default MainNavigator;
