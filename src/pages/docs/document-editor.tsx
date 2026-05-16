/**
 * DocumentEditorPage — full-screen collaborative document editor.
 *
 * Uses a WebView to load the web-based BlockNote editor. Manages document
 * metadata (title, sharing, visibility) on the native side.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import BlockNoteEditor from "../../components/docs/blocknote-editor";
import ShareModal from "../../components/docs/share-document";
import { DocumentSocketProvider } from "../../libs/DocumentSocketProvider";
import useDocumentStore from "../../store/useDocumentStore";
import useAuthStore from "../../store/useAuth";
import { Document } from "../../types/document.type";
import { useSocket } from "../../providers/socket.provider";

export default function DocumentEditorPage() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const docId = route.params?.docId as string;

  const { getDocument, deleteDocument, duplicateDocument, updateTitle } =
    useDocumentStore();
  const currentUser = useAuthStore((s) => s.user);
  const { socket, status } = useSocket();

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [showShare, setShowShare] = useState(false);
  const [editorReady, setEditorReady] = useState(false);

  const docSocketRef = useRef<DocumentSocketProvider | null>(null);
  const titleInputRef = useRef<TextInput>(null);

  const isOwner = document?.ownerId === currentUser?._id;
  const userPermission = document?.sharedWith?.find(
    (u) => u.userId === currentUser?._id
  );
  const canEdit = isOwner || userPermission?.role === "editor";
  const hasAccess =
    isOwner ||
    !!userPermission ||
    document?.visibility === "public" ||
    document?.visibility === "shared";

  // Load document metadata
  useEffect(() => {
    if (!docId) return;
    setLoading(true);
    setError(null);

    getDocument(docId)
      .then((doc) => {
        if (doc) {
          setDocument(doc);
          setTitleInput(doc.title);
        } else {
          setError("Document not found");
        }
      })
      .catch((err) => {
        console.error("Failed to load document:", err);
        setError("Failed to load document");
      })
      .finally(() => setLoading(false));
  }, [docId, getDocument]);

  // Setup document socket for presence/metadata
  useEffect(() => {
    if (!socket || !docId || status !== "connected" || !currentUser) return;

    const provider = new DocumentSocketProvider(docId, socket);
    provider.onDocumentUpdate = (data) => {
      if (data) {
        setDocument((prev) => (prev ? { ...prev, ...data } : data));
        if (data.title) setTitleInput(data.title);
      }
    };
    docSocketRef.current = provider;

    return () => {
      provider.destroy();
      docSocketRef.current = null;
    };
  }, [socket, docId, status, currentUser]);

  // Header config
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handleTitleSave = async () => {
    if (!isOwner) return;
    const trimmed = titleInput.trim();
    if (!trimmed || trimmed === document?.title) {
      setIsEditingTitle(false);
      setTitleInput(document?.title || "");
      return;
    }
    try {
      const updated = await updateTitle(docId, trimmed);
      if (updated) {
        setDocument((prev) => (prev ? { ...prev, title: updated.title } : null));
      }
    } catch (err) {
      console.error("Failed to rename:", err);
      setTitleInput(document?.title || "");
    } finally {
      setIsEditingTitle(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Document",
      `Delete "${document?.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteDocument(docId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleDuplicate = async () => {
    const newDoc = await duplicateDocument(docId);
    if (newDoc) {
      Alert.alert("Copied", `"${newDoc.title}" created.`, [
        {
          text: "Open",
          onPress: () =>
            navigation.replace("DocumentEditor", { docId: newDoc._id }),
        },
        { text: "OK" },
      ]);
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#42A59F" />
        <Text style={styles.loadingText}>Loading document...</Text>
      </View>
    );
  }

  // Error state
  if (error || !document) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>
          {error || "Document not found"}
        </Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Access denied
  if (!hasAccess) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Access Denied</Text>
        <Text style={styles.errorSubtitle}>
          You don't have permission to view this document.
        </Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backBtnText}>Back to Documents</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBack}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.headerBackText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          {isEditingTitle ? (
            <TextInput
              ref={titleInputRef}
              style={styles.titleInput}
              value={titleInput}
              onChangeText={setTitleInput}
              onBlur={handleTitleSave}
              onSubmitEditing={handleTitleSave}
              autoFocus
              selectTextOnFocus
            />
          ) : (
            <TouchableOpacity
              onPress={() => isOwner && setIsEditingTitle(true)}
              disabled={!isOwner}
            >
              <Text style={styles.headerTitle} numberOfLines={1}>
                {document.title}
              </Text>
            </TouchableOpacity>
          )}
          <Text style={styles.headerStatus}>
            {editorReady ? "Saved" : "Loading..."}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setShowShare(true)}
          >
            <Text style={styles.headerBtnText}>
              {isOwner ? "Share" : canEdit ? "Members" : "Viewer"}
            </Text>
          </TouchableOpacity>
          {isOwner && (
            <TouchableOpacity onPress={handleDelete}>
              <Text style={styles.deleteBtn}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Editor WebView */}
      <View style={styles.editorContainer}>
        <BlockNoteEditor
          docId={docId}
          sharedWith={document.sharedWith}
          editable={canEdit}
          onEditorReady={() => setEditorReady(true)}
          onTitleChange={(title) => {
            setTitleInput(title);
            setDocument((prev) => (prev ? { ...prev, title } : null));
          }}
        />
      </View>

      {/* Share modal */}
      {document && (
        <ShareModal
          visible={showShare}
          onClose={() => setShowShare(false)}
          document={document}
        />
      )}
    </KeyboardAvoidingView>
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
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "ios" ? 50 : 12,
    paddingBottom: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  headerBack: {
    paddingRight: 10,
  },
  headerBackText: {
    fontSize: 15,
    color: "#42A59F",
    fontWeight: "500",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    maxWidth: 200,
  },
  titleInput: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    borderBottomWidth: 1,
    borderBottomColor: "#42A59F",
    paddingVertical: 2,
    minWidth: 150,
    textAlign: "center",
  },
  headerStatus: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#e6f7f6",
  },
  headerBtnText: {
    fontSize: 13,
    color: "#42A59F",
    fontWeight: "600",
  },
  deleteBtn: {
    fontSize: 13,
    color: "#dc2626",
    fontWeight: "500",
  },
  // Editor
  editorContainer: {
    flex: 1,
  },
});
