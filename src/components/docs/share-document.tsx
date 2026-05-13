/**
 * ShareModal — share/unshare document with users and manage visibility.
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import useDocumentStore from "../../store/useDocumentStore";
import useAuthStore from "../../store/useAuth";
import { Document, SharedWithItem } from "../../types/document.type";
import AuthService from "../../service/auth.service";

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  document: Document;
}

export default function ShareModal({
  visible,
  onClose,
  document: doc,
}: ShareModalProps) {
  const { shareDocument, unshareDocument, updateVisibility } =
    useDocumentStore();
  const currentUser = useAuthStore((s) => s.user);
  const isOwner = doc.ownerId === currentUser?._id;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("editor");
  const [visibility, setVisibility] = useState(doc.visibility || "private");
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [localDoc, setLocalDoc] = useState<Document>(doc);

  useEffect(() => {
    if (visible) {
      setVisibility(doc.visibility || "private");
      setSearchQuery("");
      setSearchResults([]);
      setLocalDoc(doc);
    }
  }, [visible, doc]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response: any = await AuthService.searchUser({
          keyword: searchQuery,
          limit: 5,
        });
        setSearchResults(response.data?.metadata || []);
      } catch (error) {
        console.error("Search failed", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleVisibilityChange = async (newVis: string) => {
    setLoading(true);
    try {
      const updated = await updateVisibility(doc._id, newVis);
      if (updated) {
        setVisibility(newVis);
        setLocalDoc(updated);
      }
    } catch (err) {
      console.error("Failed to update visibility", err);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (userId: string) => {
    setLoading(true);
    try {
      const updated = await shareDocument(doc._id, userId, selectedRole);
      if (updated) {
        setLocalDoc(updated);
      }
    } catch (err) {
      console.error("Failed to share", err);
    } finally {
      setLoading(false);
      setSearchQuery("");
    }
  };

  const handleUnshare = async (userId: string) => {
    setLoading(true);
    try {
      const updated = await unshareDocument(doc._id, userId);
      if (updated) {
        setLocalDoc(updated);
      }
    } catch (err) {
      console.error("Failed to unshare", err);
    } finally {
      setLoading(false);
    }
  };

  const sharedUsers: SharedWithItem[] = localDoc.sharedWith || [];
  // Deduplicate by userId
  const uniqueShared = sharedUsers.filter(
    (s, i, arr) => arr.findIndex((t) => t.userId === s.userId) === i
  );
  const docOwner = localDoc.owner;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.modalContainer}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {localDoc.title}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.doneBtn}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Visibility */}
          <Text style={styles.sectionTitle}>General Access</Text>
          <View style={styles.visibilityRow}>
            <TouchableOpacity
              style={[
                styles.visBtn,
                visibility === "private" && styles.visBtnActive,
              ]}
              onPress={() => handleVisibilityChange("private")}
              disabled={!isOwner || loading}
            >
              <Text
                style={[
                  styles.visText,
                  visibility === "private" && styles.visTextActive,
                ]}
              >
                Private
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.visBtn,
                visibility === "shared" && styles.visBtnActive,
              ]}
              onPress={() => handleVisibilityChange("shared")}
              disabled={!isOwner || loading}
            >
              <Text
                style={[
                  styles.visText,
                  visibility === "shared" && styles.visTextActive,
                ]}
              >
                Shared
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.visBtn,
                visibility === "public" && styles.visBtnActive,
              ]}
              onPress={() => handleVisibilityChange("public")}
              disabled={!isOwner || loading}
            >
              <Text
                style={[
                  styles.visText,
                  visibility === "public" && styles.visTextActive,
                ]}
              >
                Public
              </Text>
            </TouchableOpacity>
          </View>

          {/* Add People (owner only) */}
          {isOwner && (
            <>
              <Text style={styles.sectionTitle}>Add People</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name or email..."
                  placeholderTextColor="#9ca3af"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {/* Role selector */}
              <View style={styles.roleRow}>
                <TouchableOpacity
                  style={[
                    styles.roleBtn,
                    selectedRole === "editor" && styles.roleBtnActive,
                  ]}
                  onPress={() => setSelectedRole("editor")}
                >
                  <Text
                    style={[
                      styles.roleText,
                      selectedRole === "editor" && styles.roleTextActive,
                    ]}
                  >
                    Editor
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleBtn,
                    selectedRole === "viewer" && styles.roleBtnActive,
                  ]}
                  onPress={() => setSelectedRole("viewer")}
                >
                  <Text
                    style={[
                      styles.roleText,
                      selectedRole === "viewer" && styles.roleTextActive,
                    ]}
                  >
                    Viewer
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Search results */}
              {searchQuery.trim() !== "" && (
                <View style={styles.resultsContainer}>
                  {isSearching ? (
                    <ActivityIndicator
                      style={styles.spinner}
                      color="#42A59F"
                    />
                  ) : searchResults.length > 0 ? (
                    searchResults.map((user: any) => (
                      <View key={user._id} style={styles.userRow}>
                        <View style={styles.userInfo}>
                          <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                              {user.fullname?.[0]?.toUpperCase() || "?"}
                            </Text>
                          </View>
                          <View>
                            <Text style={styles.userName}>
                              {user.fullname}
                            </Text>
                            <Text style={styles.userEmail}>
                              {user.email || user.phone || ""}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.addBtn}
                          onPress={() => handleShare(user._id)}
                        >
                          <Text style={styles.addBtnText}>Add</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noResults}>
                      No users found
                    </Text>
                  )}
                </View>
              )}
            </>
          )}

          {/* People with access */}
          <Text style={styles.sectionTitle}>People with Access</Text>

          {/* Owner */}
          <View style={styles.userRow}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {docOwner?.usr_fullname?.[0]?.toUpperCase() || "?"}
                </Text>
              </View>
              <View>
                <Text style={styles.userName}>
                  {docOwner?.usr_fullname || "Owner"}
                  {doc.ownerId === currentUser?._id ? " (you)" : ""}
                </Text>
                <Text style={styles.userEmail}>
                  {docOwner?.usr_email || ""}
                </Text>
              </View>
            </View>
            <View style={styles.ownerBadge}>
              <Text style={styles.ownerBadgeText}>Owner</Text>
            </View>
          </View>

          {/* Shared users */}
          {uniqueShared.map((share: SharedWithItem) => (
            <View key={share.userId} style={styles.userRow}>
              <View style={styles.userInfo}>
                <View style={[styles.avatar, styles.sharedAvatar]}>
                  <Text style={styles.avatarText}>
                    {share.user?.usr_fullname?.[0]?.toUpperCase() || "?"}
                  </Text>
                </View>
                <View>
                  <Text style={styles.userName}>
                    {share.user?.usr_fullname ||
                      `User ${share.userId.slice(0, 8)}...`}
                  </Text>
                  <Text style={styles.userEmail}>
                    {share.user?.usr_email || ""}
                  </Text>
                  <Text style={styles.role}>{share.role}</Text>
                </View>
              </View>
              {isOwner && (
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleUnshare(share.userId)}
                >
                  <Text style={styles.removeBtnText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {loading && (
            <ActivityIndicator
              style={styles.spinner}
              color="#42A59F"
            />
          )}
        </ScrollView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    marginRight: 12,
  },
  doneBtn: {
    fontSize: 16,
    color: "#42A59F",
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8,
    marginTop: 16,
  },
  // Visibility buttons
  visibilityRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  visBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
  },
  visBtnActive: {
    borderColor: "#42A59F",
    backgroundColor: "#e6f7f6",
  },
  visText: {
    fontSize: 13,
    color: "#6b7280",
  },
  visTextActive: {
    color: "#42A59F",
    fontWeight: "600",
  },
  // Search
  searchRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  searchInput: {
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
  // Role selector
  roleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  roleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
  },
  roleBtnActive: {
    borderColor: "#42A59F",
    backgroundColor: "#e6f7f6",
  },
  roleText: {
    fontSize: 13,
    color: "#6b7280",
  },
  roleTextActive: {
    color: "#42A59F",
    fontWeight: "600",
  },
  // Results
  resultsContainer: {
    marginBottom: 12,
    maxHeight: 200,
  },
  spinner: {
    paddingVertical: 16,
  },
  // User row
  userRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#42A59F",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  sharedAvatar: {
    backgroundColor: "#6366f1",
  },
  avatarText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  userName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  userEmail: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 1,
  },
  role: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 1,
    textTransform: "capitalize",
  },
  // Buttons
  addBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#42A59F",
  },
  addBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  removeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#fee2e2",
  },
  removeBtnText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "500",
  },
  ownerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#dcfce7",
  },
  ownerBadgeText: {
    color: "#16a34a",
    fontSize: 12,
    fontWeight: "600",
  },
  noResults: {
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 13,
    paddingVertical: 16,
  },
});
