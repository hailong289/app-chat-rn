import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomePage from "../pages/home.page";
import AboutPage from "../pages/about.page";

export type MainTabParamList = {
    Home: undefined;
    About: undefined;
};


const MainTab = createBottomTabNavigator<MainTabParamList>();

// Main tab navigator
const MainNavigator = () => (
    <MainTab.Navigator>
        <MainTab.Screen name="Home" component={HomePage} />
        <MainTab.Screen name="About" component={AboutPage} />
    </MainTab.Navigator>
);

export default MainNavigator;