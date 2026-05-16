/**
 * TodoListPage — WebView nhúng app-chat-fe /todo?token=... hoặc /todo/[projectId]
 */
import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { useLayoutEffect } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import useAuthStore from "../../store/useAuth";
import { getTodoProjectWebUrl, getTodoWebUrl } from "../../libs/web-app-url";
import AppWebView from "../../components/webview/app-webview";
import HeaderComponent from "../../components/headers/headers.component";

export default function TodoListPage() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const projectId = route.params?.projectId as string | undefined;
  const accessToken = useAuthStore((s) => s.tokens?.accessToken) ?? "";

  const webUrl = useMemo(() => {
    if (projectId) {
      return getTodoProjectWebUrl(projectId, accessToken);
    }
    return getTodoWebUrl(accessToken);
  }, [projectId, accessToken]);

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <HeaderComponent
          title="Todo"
          leftIcon="arrow-left"
          onLeftPress={() => navigation.goBack()}
        />
      ),
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <AppWebView uri={webUrl} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
});
