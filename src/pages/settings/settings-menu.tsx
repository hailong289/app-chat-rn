/**
 * Menu cài đặt — khớp app-chat-fe left-page/settings.tsx
 */
import React, { useLayoutEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MAIN_TAB_BAR_HEIGHT } from "../../libs/resolve-media-url";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import useAuthStore from "../../store/useAuth";
import { Toast } from "toastify-react-native";
import HeaderComponent from "../../components/headers/headers.component";
import SettingsListRow from "../../components/settings/settings-list-row";
import type { SettingsStackParamList } from "../../navigations/SettingsStackNavigator";
import { clearAppCache } from "../../libs/clear-app-cache";

const MENU_ITEMS: Array<{
  screen: keyof SettingsStackParamList;
  title: string;
  subtitle: string;
}> = [
  {
    screen: "SettingsAccount",
    title: "Cài đặt tài khoản",
    subtitle: "Cập nhật thông tin cá nhân",
  },
  {
    screen: "SettingsPassword",
    title: "Đổi mật khẩu",
    subtitle: "Thay đổi mật khẩu đăng nhập",
  },
  {
    screen: "SettingsChat",
    title: "Cài đặt tin nhắn",
    subtitle: "Thiết lập thông báo, âm thanh, quyền riêng tư",
  },
  {
    screen: "SettingsDevices",
    title: "Quản lý thiết bị",
    subtitle: "Xem và đăng xuất các phiên đăng nhập",
  },
  {
    screen: "SettingsUsage",
    title: "Thống kê AI",
    subtitle: "Xem báo cáo sử dụng các tính năng AI",
  },
];

export default function SettingsMenuPage() {
  const navigation =
    useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const insets = useSafeAreaInsets();
  const { isLoading, logout } = useAuthStore();
  const [clearingCache, setClearingCache] = useState(false);
  const scrollBottomPad = MAIN_TAB_BAR_HEIGHT + insets.bottom + 24;

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => <HeaderComponent title="Cài đặt" />,
    });
  }, [navigation]);

  const handleLogout = () => {
    logout({
      success: () => {
        Toast.show({ type: "success", text1: "Đăng xuất thành công" });
      },
      error: () => {
        Toast.show({ type: "error", text1: "Đăng xuất thất bại" });
      },
    });
  };

  const handleClearCache = () => {
    Alert.alert(
      "Xóa dữ liệu cache",
      "Xóa tin nhắn và danh sách phòng đã lưu trên máy? Dữ liệu trên server không bị ảnh hưởng.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => {
            setClearingCache(true);
            clearAppCache()
              .then(() => {
                Toast.show({ type: "success", text1: "Đã xóa dữ liệu cache" });
              })
              .catch(() => {
                Toast.show({ type: "error", text1: "Xóa cache thất bại" });
              })
              .finally(() => setClearingCache(false));
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPad }]}
    >
      <View style={styles.headerBlock}>
        <Text style={styles.headerTitle}>Cài đặt</Text>
        <Text style={styles.headerSubtitle}>
          Quản lý tài khoản và trải nghiệm chat của bạn
        </Text>
      </View>

      <View style={styles.list}>
        {MENU_ITEMS.map((item) => (
          <SettingsListRow
            key={item.screen}
            title={item.title}
            subtitle={item.subtitle}
            onPress={() => navigation.navigate(item.screen)}
          />
        ))}
      </View>

      <View style={styles.cacheSection}>
        <TouchableOpacity
          style={styles.cacheBtn}
          onPress={handleClearCache}
          disabled={clearingCache || isLoading}
        >
          {clearingCache ? (
            <ActivityIndicator color="#b45309" />
          ) : (
            <Text style={styles.cacheBtnText}>Xóa dữ liệu cache</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.cacheHint}>
          Xóa tin nhắn và phòng đã lưu cục bộ (SQLite). Tài khoản đăng nhập
          vẫn được giữ.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.logoutText}>Đăng xuất</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: {},
  headerBlock: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  headerSubtitle: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  list: { marginTop: 8, backgroundColor: "#fff" },
  cacheSection: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
  },
  cacheBtn: {
    backgroundColor: "#fffbeb",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  cacheBtnText: { color: "#b45309", fontSize: 16, fontWeight: "600" },
  cacheHint: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 8,
    lineHeight: 18,
  },
  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: "#dc2626",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
