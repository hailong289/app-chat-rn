/**
 * Đổi mật khẩu — màn riêng trong menu Cài đặt
 */
import React, { useLayoutEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import FontAwesome from "@react-native-vector-icons/fontawesome";
import { Toast } from "toastify-react-native";
import useAuthStore from "../../store/useAuth";
import HeaderComponent from "../../components/headers/headers.component";

export default function SettingsPasswordPage() {
  const navigation = useNavigation();
  const { updatePassword, isLoading } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState({ current: false, new: false, confirm: false });

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <HeaderComponent
          title="Đổi mật khẩu"
          leftIcon="arrow-left"
          onLeftPress={() => navigation.goBack()}
        />
      ),
    });
  }, [navigation]);

  const handleSubmit = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Toast.show({ type: "error", text1: "Vui lòng nhập đầy đủ thông tin" });
      return;
    }
    if (newPassword !== confirmPassword) {
      Toast.show({ type: "error", text1: "Mật khẩu mới không khớp" });
      return;
    }

    updatePassword({
      oldPassword: currentPassword,
      newPassword,
      callback: (err: { response?: { data?: { message?: string } } }) => {
        if (err) {
          Toast.show({
            type: "error",
            text1: err?.response?.data?.message || "Đổi mật khẩu thất bại",
          });
        } else {
          Toast.show({ type: "success", text1: "Đổi mật khẩu thành công" });
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        }
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.desc}>
            Nhập mật khẩu hiện tại và mật khẩu mới để cập nhật bảo mật tài
            khoản.
          </Text>

          <PasswordField
            label="Mật khẩu hiện tại"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            visible={show.current}
            onToggle={() => setShow((s) => ({ ...s, current: !s.current }))}
            placeholder="Nhập mật khẩu hiện tại"
          />
          <PasswordField
            label="Mật khẩu mới"
            value={newPassword}
            onChangeText={setNewPassword}
            visible={show.new}
            onToggle={() => setShow((s) => ({ ...s, new: !s.new }))}
            placeholder="Nhập mật khẩu mới"
          />
          <PasswordField
            label="Xác nhận mật khẩu mới"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            visible={show.confirm}
            onToggle={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
            placeholder="Nhập lại mật khẩu mới"
          />

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Đổi mật khẩu</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PasswordField({
  label,
  value,
  onChangeText,
  visible,
  onToggle,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  visible: boolean;
  onToggle: () => void;
  placeholder: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={onToggle} style={styles.eyeBtn}>
          <FontAwesome
            name={visible ? "eye" : "eye-slash"}
            size={18}
            color="#9ca3af"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
  },
  desc: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    marginBottom: 20,
  },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  inputWrap: { position: "relative", justifyContent: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingRight: 44,
    fontSize: 15,
    color: "#111827",
  },
  eyeBtn: { position: "absolute", right: 12, padding: 4 },
  submitBtn: {
    backgroundColor: "#42A59F",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
