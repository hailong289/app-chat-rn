import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import SettingsMenuPage from "../pages/settings/settings-menu";
import SettingsAccountPage from "../pages/settings/settings-account";
import SettingsChatPage from "../pages/settings/settings-chat";
import SettingsDevicesPage from "../pages/settings/settings-devices";
import SettingsUsagePage from "../pages/settings/settings-usage";
import SettingsPasswordPage from "../pages/settings/settings-password";

export type SettingsStackParamList = {
  SettingsMenu: undefined;
  SettingsAccount: undefined;
  SettingsPassword: undefined;
  SettingsChat: undefined;
  SettingsDevices: undefined;
  SettingsUsage: undefined;
};

const Stack = createStackNavigator<SettingsStackParamList>();

export default function SettingsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="SettingsMenu" component={SettingsMenuPage} />
      <Stack.Screen name="SettingsAccount" component={SettingsAccountPage} />
      <Stack.Screen name="SettingsPassword" component={SettingsPasswordPage} />
      <Stack.Screen name="SettingsChat" component={SettingsChatPage} />
      <Stack.Screen name="SettingsDevices" component={SettingsDevicesPage} />
      <Stack.Screen name="SettingsUsage" component={SettingsUsagePage} />
    </Stack.Navigator>
  );
}
