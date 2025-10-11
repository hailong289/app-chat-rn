import { createStackNavigator } from "@react-navigation/stack";
import LoginPage from "../pages/auth/login.page";
import RegisterPage from "../pages/auth/register.page";

export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
};
const AuthStack = createStackNavigator<AuthStackParamList>();
const AuthNavigator = () => (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="Login" component={LoginPage} />
        <AuthStack.Screen name="Register" component={RegisterPage} />
    </AuthStack.Navigator>
);

export default AuthNavigator;