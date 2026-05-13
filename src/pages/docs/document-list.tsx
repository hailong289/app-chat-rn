/**
 * DocumentListPage — browse, create, and manage collaborative documents.
 */
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import useDocumentStore from "../../store/useDocumentStore";
import useAuthStore from "../../store/useAuth";
import { Document, CreateDocumentDto } from "../../types/document.type";

export default function DocumentListPage() {
  const navigation = useNavigation<any>();
  const {
    documents,
    loading,
    creating,
    loadDocuments,
    createDocument,
    deleteDocument,
    duplicateDocument,
  } = useDocumentStore();
  const currentUser = useAuthStore((s) => s.user);

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDocuments();
    setRefreshing(false);
  }, [loadDocuments]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const dto: CreateDocumentDto = { title: newTitle.trim() };
    const doc = await createDocument(dto);
    if (doc) {
      setNewTitle("");
      setShowCreate(false);
      navigation.navigate("DocumentEditor", { docId: doc._id });
    }
  };

  const handleDelete = (doc: Document) => {
    Alert.alert(
      "Delete Document",
      `Are you sure you want to delete "${doc.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteDocument(doc._id),
        },
      ]
    );
  };

  const handleDuplicate = async (doc: Document) => {
    const newDoc = await duplicateDocument(doc._id);
    if (newDoc) {
      Alert.alert("Copied", `"${newDoc.title}" created.`);
    }
  };

  const isOwner = (doc: Document) => doc.ownerId === currentUser?._id;

  const renderDocument = ({ item }: { item: Document }) => {
    const owner = item.owner;
    const sharedCount = item.sharedWith?.length || 0;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate("DocumentEditor", { docId: item._id })
        }
        onLongPress={() => {
          Alert.alert(item.title, "", [
            ...(isOwner(item)
              ? [
                  {
                    text: "Duplicate",
                    onPress: () => handleDuplicate(item),
                  },
                  {
                    text: "Delete",
                    style: "destructive" as const,
                    onPress: () => handleDelete(item),
                  },
                ]
              : []),
            { text: "Cancel", style: "cancel" },
          ]);
        }}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardLeft}>
            <View style={styles.docIcon}>
              <Text style={styles.docIconText}>
                {item.title[0]?.toUpperCase() || "D"}
              </Text>
            </View>
          </View>
          <View style={styles.cardCenter}>
            <Text style={styles.docTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.docMeta} numberOfLines={1}>
              {owner?.usr_fullname || "Unknown"}
              {sharedCount > 0 ? ` · ${sharedCount} member${sharedCount !== 1 ? "s" : ""}` : ""}
            </Text>
            {item.plainText ? (
              <Text style={styles.docPreview} numberOfLines={2}>
                {item.plainText}
              </Text>
            ) : null}
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.visibilityBadge}>
              {item.visibility === "public"
                ? "Public"
                : item.visibility === "shared"
                ? "Shared"
                : "Private"}
            </Text>
            {item.updatedAt ? (
              <Text style={styles.docDate}>
                {formatRelativeDate(item.updatedAt)}
              </Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No documents yet</Text>
        <Text style={styles.emptySubtitle}>
          Create a collaborative document to get started
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Documents</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => setShowCreate(!showCreate)}
        >
          <Text style={styles.createBtnText}>
            {showCreate ? "Cancel" : "+ New"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Create form */}
      {showCreate && (
        <View style={styles.createForm}>
          <TextInput
            style={styles.createInput}
            placeholder="Document title..."
            placeholderTextColor="#9ca3af"
            value={newTitle}
            onChangeText={setNewTitle}
            onSubmitEditing={handleCreate}
            autoFocus
          />
          <TouchableOpacity
            style={[
              styles.createSubmit,
              (!newTitle.trim() || creating) && styles.createSubmitDisabled,
            ]}
            onPress={handleCreate}
            disabled={!newTitle.trim() || creating}
          >
            {creating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.createSubmitText}>Create</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* List */}
      {loading && documents.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#42A59F" />
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item._id}
          renderItem={renderDocument}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#42A59F"
            />
          }
          contentContainerStyle={
            documents.length === 0 ? styles.listEmpty : styles.listContent
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

function formatRelativeDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return "";
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  createBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#42A59F",
  },
  createBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  // Create form
  createForm: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
    gap: 10,
  },
  createInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#f9fafb",
  },
  createSubmit: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#42A59F",
    justifyContent: "center",
    alignItems: "center",
  },
  createSubmitDisabled: {
    opacity: 0.5,
  },
  createSubmitText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  // List
  listContent: {
    paddingVertical: 8,
  },
  listEmpty: {
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#e5e7eb",
    marginLeft: 72,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // Card
  card: {
    backgroundColor: "#ffffff",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardLeft: {
    marginRight: 12,
  },
  docIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#e6f7f6",
    justifyContent: "center",
    alignItems: "center",
  },
  docIconText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#42A59F",
  },
  cardCenter: {
    flex: 1,
    marginRight: 10,
  },
  docTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  docMeta: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },
  docPreview: {
    fontSize: 12,
    color: "#9ca3af",
    lineHeight: 16,
  },
  cardRight: {
    alignItems: "flex-end",
  },
  visibilityBadge: {
    fontSize: 11,
    color: "#42A59F",
    fontWeight: "500",
    backgroundColor: "#e6f7f6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  docDate: {
    fontSize: 11,
    color: "#9ca3af",
  },
  // Empty
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
  },
});
