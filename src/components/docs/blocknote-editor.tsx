/**
 * BlockNoteEditor — WebView wrapper for BlockNote collaborative editor.
 *
 * The actual BlockNote editor runs in a hosted web app (e.g.
 * https://editor.appchat.com/doc/{docId}) which manages its own Y.Doc,
 * SocketIOProvider, and mediasoup-client for real-time collaboration.
 *
 * The WebView receives the access token via injected JS so the web editor
 * can authenticate socket and API calls.
 */
import React, { useRef, useCallback } from "react";
import { StyleSheet, ActivityIndicator, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import useAuthStore from "../../store/useAuth";
import { SharedWithItem } from "../../types/document.type";

const EDITOR_BASE_URL = "https://editor.appchat.com/doc/";

export interface BlockNoteEditorProps {
  docId: string;
  sharedWith?: SharedWithItem[];
  editable?: boolean;
  onEditorReady?: () => void;
  onChange?: () => void;
  onTitleChange?: (title: string) => void;
}

export default function BlockNoteEditor({
  docId,
  sharedWith = [],
  editable = true,
  onEditorReady,
  onChange,
  onTitleChange,
}: BlockNoteEditorProps) {
  const webViewRef = useRef<WebView>(null);
  const accessToken =
    useAuthStore((s) => s.tokens?.accessToken) ?? "";
  const currentUser = useAuthStore((s) => s.user);

  const editorUrl = `${EDITOR_BASE_URL}${docId}`;

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        switch (msg.type) {
          case "ready":
            onEditorReady?.();
            break;
          case "change":
            onChange?.();
            break;
          case "titleChange":
            onTitleChange?.(msg.title);
            break;
          default:
            break;
        }
      } catch {
        // Ignore non-JSON messages
      }
    },
    [onEditorReady, onChange, onTitleChange]
  );

  // JS injected before page loads — sets auth token so the web editor
  // can authenticate its own socket and API calls
  const injectedJavaScript = `
    window.__APPCHAT_AUTH__ = {
      token: "${accessToken}",
      userId: "${currentUser?._id ?? currentUser?.id ?? ""}",
      userName: "${currentUser?.fullname ?? "Anonymous"}",
      userAvatar: "${currentUser?.avatar ?? ""}",
      editable: ${editable},
      sharedWith: ${JSON.stringify(sharedWith)},
    };
    true;
  `;

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#42A59F" />
    </View>
  );

  return (
    <WebView
      ref={webViewRef}
      source={{ uri: editorUrl }}
      injectedJavaScript={injectedJavaScript}
      onMessage={handleMessage}
      renderLoading={renderLoading}
      startInLoadingState
      javaScriptEnabled
      domStorageEnabled
      allowFileAccess
      sharedCookiesEnabled
      style={styles.webview}
      containerStyle={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
});
