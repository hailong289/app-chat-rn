/**
 * DocumentListPage — WebView nhúng app-chat-fe /docs?token=...
 */
import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { useLayoutEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import useAuthStore from "../../store/useAuth";
import { getDocsListWebUrl } from "../../libs/web-app-url";
import DocsWebView from "../../components/docs/docs-webview";
import HeaderComponent from "../../components/headers/headers.component";

export default function DocumentListPage() {
  const navigation = useNavigation<any>();
  const accessToken = useAuthStore((s) => s.tokens?.accessToken) ?? "";

  const listUrl = useMemo(
    () => getDocsListWebUrl(accessToken),
    [accessToken],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <HeaderComponent
          title="Tài liệu"
          leftIcon="arrow-left"
          onLeftPress={() => navigation.goBack()}
        />
      ),
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <DocsWebView uri={listUrl} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
});
