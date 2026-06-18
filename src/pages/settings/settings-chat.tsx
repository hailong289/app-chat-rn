/**
 * Cài đặt tin nhắn — khớp app-chat-fe /settings/chat
 */
import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Linking,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import messaging from "@react-native-firebase/messaging";
import { Toast } from "toastify-react-native";
import HeaderComponent from "../../components/headers/headers.component";
import Permission from "../../libs/permission";
import { clearAppCache } from "../../libs/clear-app-cache";

export default function SettingsChatPage() {
  const navigation = useNavigation();
  const [enabled, setEnabled] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <HeaderComponent
          title="Cài đặt tin nhắn"
          leftIcon="arrow-left"
          onLeftPress={() => navigation.goBack()}
        />
      ),
    });
  }, [navigation]);

  const refreshStatus = useCallback(async () => {
    setChecking(true);
    try {
      const status = await messaging().hasPermission();
      const on =
        status === messaging.AuthorizationStatus.AUTHORIZED ||
        status === messaging.AuthorizationStatus.PROVISIONAL;
      setEnabled(on);
    } catch {
      setEnabled(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const handleToggle = async (value: boolean) => {
    if (!value) {
      Toast.show({
        type: "info",
        text1: "Tắt thông báo",
        text2: "Vào Cài đặt hệ thống > Ứng dụng để tắt quyền thông báo",
      });
      if (Platform.OS === "android") {
        Linking.openSettings();
      }
      return;
    }
    setBusy(true);
    try {
      await Permission.requestNotificationPermission();
      const status = await messaging().hasPermission();
      const on =
        status === messaging.AuthorizationStatus.AUTHORIZED ||
        status === messaging.AuthorizationStatus.PROVISIONAL;
      setEnabled(on);
      if (on) {
        Toast.show({ type: "success", text1: "Đã bật thông báo push" });
      } else {
        Toast.show({
          type: "info",
          text1: "Chưa được cấp quyền",
          text2: "Kiểm tra Cài đặt hệ thống",
        });
      }
    } catch {
      Toast.show({ type: "error", text1: "Không thể bật thông báo" });
    } finally {
      setBusy(false);
    }
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
            setBusy(true);
            clearAppCache()
              .then(() =>
                Toast.show({ type: "success", text1: "Đã xóa cache cục bộ" }),
              )
              .catch(() =>
                Toast.show({ type: "error", text1: "Xóa cache thất bại" }),
              )
              .finally(() => setBusy(false));
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Cài đặt trò chuyện</Text>
        <Text style={styles.subtitle}>
          Tuỳ chỉnh thông báo đẩy cho tin nhắn mới trên thiết bị.
        </Text>

        <Text style={styles.sectionLabel}>Thông báo</Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Thông báo đẩy</Text>
            <Text style={styles.rowDesc}>
              Nhận thông báo khi có tin nhắn hoặc cuộc gọi mới
            </Text>
          </View>
          {checking || busy ? (
            <ActivityIndicator color="#42A59F" />
          ) : (
            <Switch
              value={enabled}
              onValueChange={handleToggle}
              trackColor={{ false: "#d1d5db", true: "#a7d9d6" }}
              thumbColor={enabled ? "#42A59F" : "#f4f4f5"}
            />
          )}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Dữ liệu cục bộ</Text>
        <TouchableOpacity
          style={styles.clearBtn}
          onPress={handleClearCache}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#b91c1c" />
          ) : (
            <Text style={styles.clearBtnText}>Xóa dữ liệu cache</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.hint}>
          Xóa dữ liệu chat đã lưu trên máy. Tin nhắn trên server không bị ảnh
          hưởng.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
  },
  title: { fontSize: 18, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 6, marginBottom: 16 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fafafa",
  },
  rowText: { flex: 1, marginRight: 12 },
  rowTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  rowDesc: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  clearBtn: {
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  clearBtnText: { color: "#b91c1c", fontWeight: "600" },
  hint: { fontSize: 12, color: "#9ca3af", marginTop: 8, lineHeight: 18 },
});
