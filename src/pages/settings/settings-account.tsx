/**
 * Cài đặt tài khoản — khớp app-chat-fe /settings/account
 */
import React, { useEffect, useState, useLayoutEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { launchImageLibrary } from "react-native-image-picker";
import FontAwesome from "@react-native-vector-icons/fontawesome";
import { Toast } from "toastify-react-native";
import useAuthStore from "../../store/useAuth";
import HeaderComponent from "../../components/headers/headers.component";
import { userToProfileForm } from "../../libs/normalize-auth-user";
import { resolveMediaUrl, MAIN_TAB_BAR_HEIGHT } from "../../libs/resolve-media-url";
import { ImageAvatar } from "../../components/chat/image-avatar.component";

export default function SettingsAccountPage() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scrollBottomPad = MAIN_TAB_BAR_HEIGHT + insets.bottom + 24;
  const { user, updateProfile, updateAvatar, isLoading, fetchMe } =
    useAuthStore();

  const [form, setForm] = useState({
    fullname: "",
    email: "",
    phone: "",
    address: "",
    gender: "other" as "male" | "female" | "other",
    dateOfBirth: "",
  });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <HeaderComponent
          title="Cài đặt tài khoản"
          leftIcon="arrow-left"
          onLeftPress={() => navigation.goBack()}
        />
      ),
    });
  }, [navigation]);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    setLoadError(null);
    try {
      const fresh = await fetchMe();
      if (fresh) {
        setForm(userToProfileForm(fresh));
      } else if (useAuthStore.getState().user) {
        setForm(userToProfileForm(useAuthStore.getState().user!));
      } else {
        setLoadError("Không tải được thông tin tài khoản");
      }
    } catch {
      const cached = useAuthStore.getState().user;
      if (cached) {
        setForm(userToProfileForm(cached));
      } else {
        setLoadError("Không tải được thông tin tài khoản");
      }
    } finally {
      setProfileLoading(false);
    }
  }, [fetchMe]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  useEffect(() => {
    if (!user || profileLoading) return;
    setForm(userToProfileForm(user));
  }, [user, profileLoading]);

  const handlePickAvatar = useCallback(async () => {
    const result = await launchImageLibrary({
      mediaType: "photo",
      selectionLimit: 1,
    });
    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    setAvatarUploading(true);
    updateAvatar({
      file: {
        uri: asset.uri,
        name: asset.fileName || "avatar.jpg",
        type: asset.type || "image/jpeg",
      },
      callback: (err) => {
        setAvatarUploading(false);
        if (err) Toast.show({ type: "error", text1: "Cập nhật ảnh thất bại" });
        else Toast.show({ type: "success", text1: "Cập nhật ảnh thành công" });
      },
    });
  }, [updateAvatar]);

  const handleSaveProfile = () => {
    if (!form.fullname.trim() || !form.gender || !form.dateOfBirth) {
      Toast.show({ type: "error", text1: "Vui lòng điền đầy đủ thông tin" });
      return;
    }
    updateProfile({
      fullname: form.fullname.trim(),
      gender: form.gender,
      dateOfBirth: form.dateOfBirth,
      address: form.address,
      callback: (err) => {
        if (err) Toast.show({ type: "error", text1: "Cập nhật thất bại" });
        else Toast.show({ type: "success", text1: "Cập nhật thành công" });
      },
    });
  };

  if (profileLoading && !user) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#42A59F" />
        <Text style={styles.loadingText}>Đang tải thông tin...</Text>
      </View>
    );
  }

  const avatarUri = resolveMediaUrl(user?.avatar);
  const avatarKey = user?.id || user?._id || "me";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: scrollBottomPad }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {loadError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => void loadProfile()}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={styles.card}>
        <View style={styles.avatarBlock}>
          <ImageAvatar
            src={avatarUri}
            id={avatarKey}
            size={96}
            style={styles.avatarImage}
          />
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={handlePickAvatar}
            disabled={avatarUploading || isLoading}
          >
            {avatarUploading ? (
              <ActivityIndicator color="#42A59F" />
            ) : (
              <>
                <FontAwesome name="upload" size={16} color="#42A59F" />
                <Text style={styles.avatarBtnText}>Cập nhật ảnh</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.displayName}>{user?.fullname || "User"}</Text>
        </View>
      </View>

      <View style={[styles.card, styles.lastCard]}>
        <Text style={styles.sectionTitle}>Thông tin tài khoản</Text>
        <Field label="Tên đầy đủ" value={form.fullname} onChange={(v) => setForm((f) => ({ ...f, fullname: v }))} />
        <Field label="Email" value={form.email} editable={false} />
        <Field label="Số điện thoại" value={form.phone} editable={false} />
        <Text style={styles.label}>Giới tính</Text>
        <View style={styles.genderRow}>
          {(["male", "female", "other"] as const).map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.genderBtn, form.gender === g && styles.genderActive]}
              onPress={() => setForm((f) => ({ ...f, gender: g }))}
            >
              <Text
                style={[
                  styles.genderText,
                  form.gender === g && styles.genderTextActive,
                ]}
              >
                {g === "male" ? "Nam" : g === "female" ? "Nữ" : "Khác"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Field
          label="Ngày sinh (YYYY-MM-DD)"
          value={form.dateOfBirth}
          onChange={(v) => setForm((f) => ({ ...f, dateOfBirth: v }))}
          placeholder="1990-01-01"
        />
        <Field
          label="Địa chỉ"
          value={form.address}
          onChange={(v) => setForm((f) => ({ ...f, address: v }))}
        />
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleSaveProfile}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Cập nhật thông tin</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChange,
  editable = true,
  secure,
  placeholder,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  editable?: boolean;
  secure?: boolean;
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, !editable && styles.inputDisabled]}
        value={value}
        onChangeText={onChange}
        editable={editable}
        secureTextEntry={secure}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  loadingText: { marginTop: 12, fontSize: 14, color: "#6b7280" },
  errorBox: {
    margin: 16,
    marginBottom: 0,
    padding: 14,
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: { color: "#b91c1c", fontSize: 14, marginBottom: 10 },
  retryBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#42A59F",
    borderRadius: 8,
  },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  card: {
    margin: 16,
    marginBottom: 0,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
  },
  avatarBlock: { alignItems: "center", paddingVertical: 8 },
  avatarImage: { marginBottom: 4 },
  lastCard: { marginBottom: 16 },
  avatarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  avatarBtnText: { color: "#42A59F", fontWeight: "600", fontSize: 13 },
  displayName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#42A59F",
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
  },
  inputDisabled: { backgroundColor: "#f3f4f6", color: "#6b7280" },
  genderRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  genderBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
  },
  genderActive: { backgroundColor: "#42A59F", borderColor: "#42A59F" },
  genderText: { fontSize: 14, color: "#374151", fontWeight: "500" },
  genderTextActive: { color: "#fff" },
  primaryBtn: {
    backgroundColor: "#42A59F",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
