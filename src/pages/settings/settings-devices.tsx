/**
 * Quản lý thiết bị — khớp app-chat-fe /settings/devices
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import FontAwesome from "@react-native-vector-icons/fontawesome";
import { Toast } from "toastify-react-native";
import AuthService from "../../service/auth.service";
import HeaderComponent from "../../components/headers/headers.component";
import { DeviceSession } from "../../types/device-session.type";
import {
  deriveDeviceFromUA,
  formatDateTime,
  formatRelativeTime,
} from "../../libs/device-session";

type TabKey = "active" | "history";

function parseSessions(res: unknown): DeviceSession[] {
  const root = res as { data?: { metadata?: DeviceSession[] } };
  return root?.data?.metadata ?? [];
}

export default function SettingsDevicesPage() {
  const navigation = useNavigation();
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("active");
  const [pendingClient, setPendingClient] = useState<string | null>(null);
  const [pendingAll, setPendingAll] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <HeaderComponent
          title="Quản lý thiết bị"
          leftIcon="arrow-left"
          onLeftPress={() => navigation.goBack()}
        />
      ),
    });
  }, [navigation]);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await AuthService.listSessions();
      setSessions(parseSessions(res));
    } catch {
      Toast.show({ type: "error", text1: "Không tải được danh sách thiết bị" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const { active, history } = useMemo(() => {
    const a: DeviceSession[] = [];
    const h: DeviceSession[] = [];
    for (const s of sessions) {
      (s.revokedAt ? h : a).push(s);
    }
    return { active: a, history: h };
  }, [sessions]);

  const list = tab === "active" ? active : history;

  const confirmLogoutDevice = (session: DeviceSession) => {
    Alert.alert(
      "Đăng xuất thiết bị",
      "Phiên đăng nhập trên thiết bị này sẽ bị thu hồi.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đăng xuất",
          style: "destructive",
          onPress: async () => {
            try {
              setPendingClient(session.clientId);
              await AuthService.logoutDevice(session.clientId);
              Toast.show({ type: "success", text1: "Đã đăng xuất thiết bị" });
              await loadSessions();
            } catch {
              Toast.show({ type: "error", text1: "Thao tác thất bại" });
            } finally {
              setPendingClient(null);
            }
          },
        },
      ],
    );
  };

  const confirmLogoutAll = () => {
    Alert.alert(
      "Đăng xuất tất cả",
      "Các thiết bị khác (trừ thiết bị hiện tại) sẽ bị đăng xuất.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đăng xuất tất cả",
          style: "destructive",
          onPress: async () => {
            try {
              setPendingAll(true);
              await AuthService.logoutAllDevices();
              Toast.show({ type: "success", text1: "Đã đăng xuất các thiết bị" });
              await loadSessions();
            } catch {
              Toast.show({ type: "error", text1: "Thao tác thất bại" });
            } finally {
              setPendingAll(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.pageSubtitle}>
        Xem và quản lý các phiên đăng nhập trên thiết bị của bạn
      </Text>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "active" && styles.tabActive]}
          onPress={() => setTab("active")}
        >
          <Text style={[styles.tabText, tab === "active" && styles.tabTextActive]}>
            Đang hoạt động
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "history" && styles.tabActive]}
          onPress={() => setTab("history")}
        >
          <Text style={[styles.tabText, tab === "history" && styles.tabTextActive]}>
            Lịch sử
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#42A59F" />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {list.length === 0 ? (
            <Text style={styles.empty}>
              {tab === "active" ? "Không có phiên hoạt động" : "Chưa có lịch sử"}
            </Text>
          ) : (
            list.map((s) => (
              <SessionCard
                key={s.clientId}
                session={s}
                history={tab === "history"}
                pending={pendingClient === s.clientId}
                onLogout={() => confirmLogoutDevice(s)}
              />
            ))
          )}
          {tab === "active" && active.some((s) => !s.isCurrent) ? (
            <TouchableOpacity
              style={styles.logoutAllBtn}
              onPress={confirmLogoutAll}
              disabled={pendingAll}
            >
              {pendingAll ? (
                <ActivityIndicator color="#b91c1c" />
              ) : (
                <Text style={styles.logoutAllText}>Đăng xuất tất cả thiết bị khác</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function SessionCard({
  session: s,
  history,
  pending,
  onLogout,
}: {
  session: DeviceSession;
  history: boolean;
  pending: boolean;
  onLogout: () => void;
}) {
  const ua = deriveDeviceFromUA(s.userAgent);
  const browser = s.deviceInfo?.browser ?? ua.browser;
  const os = s.deviceInfo?.os ?? ua.os;
  const label = [browser, os].filter(Boolean).join(" • ") || "Thiết bị không xác định";
  const location =
    [s.location?.city, s.location?.country].filter(Boolean).join(", ") ||
    "Vị trí không xác định";

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <FontAwesome
          name={
            ua.deviceType === "mobile"
              ? "mobile"
              : ua.deviceType === "tablet"
                ? "tablet"
                : "desktop"
          }
          size={22}
          color="#6b7280"
        />
        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <Text style={styles.deviceName}>{label}</Text>
            {s.isCurrent && !history ? (
              <View style={styles.badgeCurrent}>
                <Text style={styles.badgeCurrentText}>Hiện tại</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.meta}>📍 {location}</Text>
          {s.ip ? <Text style={styles.meta}>IP: {s.ip}</Text> : null}
          <Text style={styles.meta}>
            {history
              ? `Đăng xuất: ${formatDateTime(s.revokedAt)}`
              : `Hoạt động: ${formatRelativeTime(s.lastSeenAt)}`}
          </Text>
        </View>
      </View>
      {!history && !s.isCurrent ? (
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={onLogout}
          disabled={pending}
        >
          {pending ? (
            <ActivityIndicator size="small" color="#b91c1c" />
          ) : (
            <Text style={styles.logoutBtnText}>Đăng xuất thiết bị</Text>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  pageSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  tabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 10,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  tabActive: { backgroundColor: "#fff" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  tabTextActive: { color: "#42A59F" },
  loader: { marginTop: 40 },
  list: { padding: 16, paddingBottom: 32 },
  empty: { textAlign: "center", color: "#9ca3af", marginTop: 24 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
  },
  cardTop: { flexDirection: "row", gap: 12 },
  cardBody: { flex: 1 },
  titleRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  deviceName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  badgeCurrent: {
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeCurrentText: { fontSize: 11, color: "#047857", fontWeight: "600" },
  meta: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  logoutBtn: {
    marginTop: 12,
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
  },
  logoutBtnText: { color: "#b91c1c", fontWeight: "600", fontSize: 13 },
  logoutAllBtn: {
    marginTop: 8,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  logoutAllText: { color: "#b91c1c", fontWeight: "600" },
});
