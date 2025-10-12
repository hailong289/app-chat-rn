import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomePage from "../pages/home.page";
import AboutPage from "../pages/about.page";
import { FontAwesome } from "@react-native-vector-icons/fontawesome";
import SettingsPage from "../pages/settings.page";

export type MainTabParamList = {
    Home: undefined;
    About: undefined;
    SettingsPage: undefined;
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
            name="About" component={AboutPage}
            options={{
                tabBarIcon: ({ color, size }) => <FontAwesome name="info" size={size} color={color} />,
                tabBarLabel: 'Giới thiệu',
            }} />
        <MainTab.Screen
            name="SettingsPage" component={SettingsPage}
            options={{
                headerTitle: 'Cài đặt',
                tabBarIcon: ({ color, size }) => <FontAwesome name="cog" size={size} color={color} />,
                tabBarLabel: 'Cài đặt',
            }} />
    </MainTab.Navigator>
);

export default MainNavigator;
