/**
 * WebView nhúng app-chat-fe — auth qua `?token=` (EmbedTokenLayout trên web).
 */
import React, { useMemo } from "react";
import {
  StyleSheet,
  ActivityIndicator,
  View,
  Text,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import useAuthStore from "../../store/useAuth";

export interface AppWebViewProps {
  uri: string;
  onLoadEnd?: () => void;
  onError?: (message: string) => void;
}

export default function AppWebView({
  uri,
  onLoadEnd,
  onError,
}: AppWebViewProps) {
  const accessToken = useAuthStore((s) => s.tokens?.accessToken) ?? "";
  const source = useMemo(() => ({ uri }), [uri]);

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#42A59F" />
      <Text style={styles.loadingHint}>Đang tải...</Text>
    </View>
  );

  const renderError = (description?: string) => (
    <View style={styles.loadingContainer}>
      <Text style={styles.errorTitle}>Không tải được trang</Text>
      <Text style={styles.errorHint}>
        {description ||
          "Kiểm tra app-chat-fe đang chạy và WEB_APP_URL trong env.json."}
      </Text>
    </View>
  );

  if (!accessToken) {
    return renderError("Chưa đăng nhập — không thể mở trang.");
  }

  return (
    <WebView
      source={source}
      onLoadEnd={() => onLoadEnd?.()}
      renderLoading={renderLoading}
      startInLoadingState
      javaScriptEnabled
      domStorageEnabled
      allowFileAccess
      sharedCookiesEnabled
      mixedContentMode="always"
      originWhitelist={["*"]}
      setSupportMultipleWindows={false}
      style={styles.webview}
      containerStyle={styles.container}
      onError={(e) => onError?.(e.nativeEvent.description)}
      onHttpError={(e) =>
        onError?.(`HTTP ${e.nativeEvent.statusCode}: ${e.nativeEvent.url}`)
      }
      renderError={(_domain, _code, description) => renderError(description)}
      {...(Platform.OS === "android"
        ? { androidLayerType: "hardware" as const }
        : {})}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1, backgroundColor: "#f9fafb" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    paddingHorizontal: 24,
  },
  loadingHint: { marginTop: 12, fontSize: 14, color: "#6b7280" },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  errorHint: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
});
