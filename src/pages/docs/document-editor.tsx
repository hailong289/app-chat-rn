/**
 * DocumentEditorPage — metadata native + editor WebView (app-chat-fe /docs/[id]).
 */
import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import BlockNoteEditor from "../../components/docs/blocknote-editor";
import ShareModal from "../../components/docs/share-document";
import useDocumentStore from "../../store/useDocumentStore";
import useAuthStore from "../../store/useAuth";
import { Document } from "../../types/document.type";
import {
  canAccessDocument,
  isDocumentOwner,
} from "../../libs/document-access";
import { getDocumentEditorWebUrl } from "../../libs/web-app-url";
import HeaderComponent from "../../components/headers/headers.component";
import FontAwesome from "@react-native-vector-icons/fontawesome";

const EDITOR_READY_TIMEOUT_MS = 20000;

export default function DocumentEditorPage() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const docId = route.params?.docId as string;

  const { getDocument, deleteDocument } = useDocumentStore();
  const documents = useDocumentStore((s) => s.documents);
  const currentUser = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.tokens?.accessToken) ?? "";

  const [document, setDocument] = useState<Document | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOwner = document ? isDocumentOwner(document, currentUser) : false;
  const hasAccess = document ? canAccessDocument(document, currentUser) : false;

  const clearReadyTimeout = useCallback(() => {
    if (readyTimeoutRef.current) {
      clearTimeout(readyTimeoutRef.current);
      readyTimeoutRef.current = null;
    }
  }, []);

  const markEditorReady = useCallback(() => {
    clearReadyTimeout();
    setEditorError(null);
    setEditorReady(true);
  }, [clearReadyTimeout]);

  useEffect(() => {
    setEditorReady(false);
    setEditorError(null);
    clearReadyTimeout();

    readyTimeoutRef.current = setTimeout(() => {
      setEditorError(
        "Không kết nối được trình soạn thảo. Kiểm tra app-chat-fe (npm run dev) và WEB_APP_URL.",
      );
    }, EDITOR_READY_TIMEOUT_MS);

    return clearReadyTimeout;
  }, [docId, clearReadyTimeout]);

  useEffect(() => {
    if (!docId) return;

    const fromCache = documents.find((d) => d._id === docId) ?? null;
    setDocument(fromCache);
    setMetaLoading(!fromCache);
    setMetaError(null);

    let cancelled = false;

    getDocument(docId)
      .then((doc) => {
        if (cancelled) return;
        if (doc) {
          setDocument(doc);
        } else if (!fromCache) {
          setMetaError("Không tìm thấy tài liệu");
        }
      })
      .catch((err) => {
        console.error("Failed to load document:", err);
        if (!cancelled && !fromCache) {
          setMetaError("Không tải được tài liệu");
        }
      })
      .finally(() => {
        if (!cancelled) setMetaLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [docId, documents]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => (
        <HeaderComponent
          title={document?.title || "Tài liệu"}
          leftIcon="arrow-left"
          onLeftPress={() => navigation.goBack()}
          rightComponent={
            document ? (
              <TouchableOpacity
                onPress={() => setShowShare(true)}
                hitSlop={8}
                style={styles.headerIconBtn}
              >
                <FontAwesome name="share-alt" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            ) : undefined
          }
        />
      ),
    });
  }, [navigation, document?.title, document]);

  const handleDelete = () => {
    if (!document) return;
    Alert.alert(
      "Xóa tài liệu",
      `Xóa "${document.title}"? Hành động này không thể hoàn tác.`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            await deleteDocument(docId);
            navigation.goBack();
          },
        },
      ],
    );
  };

  if (metaLoading && !document) {
    return (
      <SafeAreaView style={styles.center} edges={["bottom"]}>
        <ActivityIndicator size="large" color="#42A59F" />
        <Text style={styles.loadingText}>Đang tải tài liệu...</Text>
      </SafeAreaView>
    );
  }

  if (metaError || !document) {
    return (
      <SafeAreaView style={styles.center} edges={["bottom"]}>
        <Text style={styles.errorTitle}>{metaError || "Không tìm thấy tài liệu"}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (document && !hasAccess) {
    return (
      <SafeAreaView style={styles.center} edges={["bottom"]}>
        <Text style={styles.errorTitle}>Không có quyền truy cập</Text>
        <Text style={styles.errorSubtitle}>Bạn không có quyền xem tài liệu này.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!document) return null;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {editorError
            ? "Lỗi đồng bộ"
            : editorReady
              ? "Đã sẵn sàng"
              : metaLoading
                ? "Đang cập nhật..."
                : "Đang mở trình soạn thảo..."}
        </Text>
        {isOwner && (
          <TouchableOpacity onPress={handleDelete}>
            <Text style={styles.deleteBtn}>Xóa</Text>
          </TouchableOpacity>
        )}
      </View>

      {editorError ? (
        <View style={styles.editorErrorBox}>
          <Text style={styles.editorErrorText}>{editorError}</Text>
          <Text style={styles.editorErrorHint}>
            Chạy app-chat-fe: npm run dev{"\n"}
            {getDocumentEditorWebUrl(docId, accessToken)}
          </Text>
        </View>
      ) : null}

      <View style={styles.editorContainer}>
        {!editorReady && !editorError ? (
          <View style={styles.editorLoadingOverlay}>
            <ActivityIndicator size="large" color="#42A59F" />
            <Text style={styles.loadingText}>Đang tải nội dung...</Text>
          </View>
        ) : null}

        <BlockNoteEditor
          key={docId}
          docId={docId}
          onEditorReady={markEditorReady}
          onLoadEnd={markEditorReady}
          onError={(msg) => {
            clearReadyTimeout();
            setEditorReady(false);
            setEditorError(msg);
          }}
        />
      </View>

      <ShareModal
        visible={showShare}
        onClose={() => setShowShare(false)}
        document={document}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  errorSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 20,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#42A59F",
    marginTop: 12,
  },
  backBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  headerIconBtn: {
    padding: 4,
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  statusText: {
    fontSize: 12,
    color: "#6b7280",
  },
  deleteBtn: {
    fontSize: 13,
    color: "#dc2626",
    fontWeight: "500",
  },
  editorContainer: {
    flex: 1,
    position: "relative",
  },
  editorLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(249,250,251,0.92)",
  },
  editorErrorBox: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fef2f2",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#fecaca",
  },
  editorErrorText: {
    fontSize: 13,
    color: "#b91c1c",
    fontWeight: "600",
  },
  editorErrorHint: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 4,
    lineHeight: 16,
  },
});
