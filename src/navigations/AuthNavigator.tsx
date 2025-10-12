import { createStackNavigator } from "@react-navigation/stack";
import LoginPage from "../pages/auth/login.page";
import RegisterPage from "../pages/auth/register.page";
import ForgotPasswordPage from "../pages/auth/forgot-password.page";
import ResetPasswordPage from "../pages/auth/reset-password.page";

export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
    ForgotPassword: undefined;
    ResetPassword: {
        token: { accessToken: string };
    };
};
const AuthStack = createStackNavigator<AuthStackParamList>();
const AuthNavigator = () => (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="Login" component={LoginPage} />
        <AuthStack.Screen name="Register" component={RegisterPage} />
        <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordPage} />
        <AuthStack.Screen name="ResetPassword" component={ResetPasswordPage} />
    </AuthStack.Navigator>
);

export default AuthNavigator;
