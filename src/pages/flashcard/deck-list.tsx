/**
 * DeckListPage — WebView nhúng app-chat-fe /flash-card?token=...
 */
import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { useLayoutEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import useAuthStore from "../../store/useAuth";
import { getFlashCardWebUrl } from "../../libs/web-app-url";
import AppWebView from "../../components/webview/app-webview";
import HeaderComponent from "../../components/headers/headers.component";

export default function DeckListPage() {
  const navigation = useNavigation<any>();
  const accessToken = useAuthStore((s) => s.tokens?.accessToken) ?? "";

  const webUrl = useMemo(
    () => getFlashCardWebUrl(accessToken),
    [accessToken],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <HeaderComponent
          title="Flashcard"
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
