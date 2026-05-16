import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Image,
  FlatList,
  Alert,
  ActivityIndicator,
  Dimensions,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import FontAwesome from '@react-native-vector-icons/fontawesome';

import useRoomStore from '../../store/useRoom';
import useAuthStore from '../../store/useAuth';
import UploadService from '../../service/upload.service';
import type { Room, RoomMembers } from '../../types/room.type';
import { ImageViewerModal } from './image-viewer-modal.component';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_W * 0.85, 400);

type DrawerTab = 'media' | 'file' | 'link';

type ChatDrawerProps = {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  onScrollToMessage?: (msgId: string) => void;
};

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  visible,
  onClose,
  roomId,
  onScrollToMessage,
}) => {
  const insets = useSafeAreaInsets();
  const { room, leaveRoom, changeRoomName, deleteMember, addMembers, clearHistory } =
    useRoomStore();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<DrawerTab>('media');
  const [files, setFiles] = useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // Image preview
  const [previewImages, setPreviewImages] = useState<any[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);

  // Section expand
  const [sectionsOpen, setSectionsOpen] = useState({
    customize: false,
    members: true,
    media: false,
    privacy: false,
  });

  const translateX = useSharedValue(DRAWER_WIDTH);
  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  useEffect(() => {
    if (visible) {
      translateX.value = withTiming(0, { duration: 280 });
      fetchFiles(1, activeTab);
    } else {
      translateX.value = withTiming(DRAWER_WIDTH, { duration: 220 });
    }
  }, [visible, activeTab]);

  const fetchFiles = useCallback(
    async (p: number, tab: DrawerTab) => {
      if (!roomId) return;
      setIsLoadingFiles(true);
      try {
        const result = await UploadService.getAttachments({
          roomId,
          type: tab === 'media' ? 'media' : tab === 'file' ? 'file' : 'link',
          page: p,
          limit: 20,
        });
        const items = (result as any[]) || [];
        if (items.length < 20) setHasMore(false);
        setFiles(prev => (p === 1 ? items : [...prev, ...items]));
      } catch {
        // silent fail
      } finally {
        setIsLoadingFiles(false);
      }
    },
    [roomId],
  );

  const handleTabChange = (tab: DrawerTab) => {
    setActiveTab(tab);
    setFiles([]);
    setPage(1);
    setHasMore(true);
    fetchFiles(1, tab);
  };

  const handleLoadMore = () => {
    if (isLoadingFiles || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFiles(nextPage, activeTab);
  };

  const toggleSection = (key: keyof typeof sectionsOpen) => {
    setSectionsOpen(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isAdmin = room?.members?.some(
    m => m.id === user?.id && m.role === 'admin',
  );
  const isGroup = room?.type === 'group' || room?.type === 'channel';

  const handleLeave = () => {
    Alert.alert(
      'Rời nhóm',
      'Bạn có chắc muốn rời khỏi nhóm chat này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Rời',
          style: 'destructive',
          onPress: async () => {
            await leaveRoom(roomId);
            onClose();
          },
        },
      ],
    );
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Xóa lịch sử',
      'Toàn bộ tin nhắn trong phòng này sẽ bị xóa. Tiếp tục?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => await clearHistory(roomId),
        },
      ],
    );
  };

  const handleRemoveMember = (member: RoomMembers) => {
    Alert.alert(
      'Xóa thành viên',
      `Xóa ${member.name} khỏi nhóm?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => deleteMember(roomId, member.id),
        },
      ],
    );
  };

  const mediaFiles = files.filter(
    f => f.kind === 'image' || f.kind === 'photo' || f.mimeType?.startsWith('image/'),
  );

  const SectionHeader = ({
    title,
    sectionKey,
  }: {
    title: string;
    sectionKey: keyof typeof sectionsOpen;
  }) => (
    <TouchableOpacity
      style={styles.sectionHeader}
      onPress={() => toggleSection(sectionKey)}
    >
      <Text style={styles.sectionTitle}>{title}</Text>
      <FontAwesome
        name={sectionsOpen[sectionKey] ? 'chevron-up' : 'chevron-down'}
        size={13}
        color="#6b7280"
      />
    </TouchableOpacity>
  );

  return (
    <>
      {/* Backdrop */}
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={onClose}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.drawer,
            drawerStyle,
            { paddingBottom: insets.bottom },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity onPress={onClose}>
              <FontAwesome name="arrow-left" size={18} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Thông tin phòng chat</Text>
          </View>

          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Room info */}
            <View style={styles.roomInfo}>
              {room?.avatar ? (
                <Image source={{ uri: room.avatar }} style={styles.roomAvatar} />
              ) : (
                <View style={[styles.roomAvatar, styles.avatarFallback]}>
                  <Text style={styles.avatarFallbackText}>
                    {room?.name?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
              )}
              <Text style={styles.roomName}>{room?.name || 'Chat'}</Text>
              {isGroup && (
                <Text style={styles.roomSubtitle}>
                  {room?.members?.length || 0} thành viên
                </Text>
              )}
            </View>

            {/* ── Customize section ─────────────────────────────────── */}
            <SectionHeader title="Tùy chỉnh" sectionKey="customize" />
            {sectionsOpen.customize && (
              <View style={styles.sectionBody}>
                <ActionRow
                  icon="pencil"
                  label="Đổi tên phòng"
                  onPress={() =>
                    Alert.prompt(
                      'Đổi tên',
                      'Nhập tên mới',
                      name => name && changeRoomName(roomId, name),
                    )
                  }
                />
              </View>
            )}

            {/* ── Members section ───────────────────────────────────── */}
            {isGroup && (
              <>
                <SectionHeader title="Thành viên" sectionKey="members" />
                {sectionsOpen.members && (
                  <View style={styles.sectionBody}>
                    {(room?.members || []).map(member => (
                      <View key={member.id} style={styles.memberRow}>
                        {member.avatar ? (
                          <Image
                            source={{ uri: member.avatar }}
                            style={styles.memberAvatar}
                          />
                        ) : (
                          <View
                            style={[styles.memberAvatar, styles.avatarFallback]}
                          >
                            <Text style={styles.avatarFallbackTextSm}>
                              {member.name?.charAt(0)?.toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View style={styles.memberInfo}>
                          <Text style={styles.memberName}>{member.name}</Text>
                          <Text style={styles.memberRole}>
                            {member.role === 'admin'
                              ? '👑 Admin'
                              : member.role === 'owner'
                              ? '⭐ Chủ nhóm'
                              : 'Thành viên'}
                          </Text>
                        </View>
                        {isAdmin && member.id !== user?.id && (
                          <TouchableOpacity
                            onPress={() => handleRemoveMember(member as RoomMembers)}
                            style={styles.removeMemberBtn}
                          >
                            <FontAwesome
                              name="user-times"
                              size={14}
                              color="#ef4444"
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            {/* ── Media section ─────────────────────────────────────── */}
            <SectionHeader title="File & Phương tiện" sectionKey="media" />
            {sectionsOpen.media && (
              <View style={styles.sectionBody}>
                {/* Tab bar */}
                <View style={styles.tabBar}>
                  {(['media', 'file', 'link'] as DrawerTab[]).map(tab => (
                    <TouchableOpacity
                      key={tab}
                      style={[
                        styles.tabItem,
                        activeTab === tab && styles.tabItemActive,
                      ]}
                      onPress={() => handleTabChange(tab)}
                    >
                      <Text
                        style={[
                          styles.tabLabel,
                          activeTab === tab && styles.tabLabelActive,
                        ]}
                      >
                        {tab === 'media'
                          ? 'Media'
                          : tab === 'file'
                          ? 'File'
                          : 'Link'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {activeTab === 'media' ? (
                  <View style={styles.mediaGrid}>
                    {mediaFiles.map((item, idx) => (
                      <TouchableOpacity
                        key={item._id || idx}
                        onPress={() => {
                          setPreviewImages(mediaFiles);
                          setPreviewIndex(idx);
                          setPreviewVisible(true);
                        }}
                        style={styles.mediaThumb}
                      >
                        <Image
                          source={{ uri: item.url }}
                          style={styles.mediaThumbImg}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ))}
                    {isLoadingFiles && (
                      <View style={styles.loadingBox}>
                        <ActivityIndicator color="#6366f1" />
                      </View>
                    )}
                    {!isLoadingFiles && files.length === 0 && (
                      <Text style={styles.emptyText}>Chưa có phương tiện</Text>
                    )}
                  </View>
                ) : (
                  <View>
                    {files.map((item, idx) => (
                      <TouchableOpacity
                        key={item._id || idx}
                        style={styles.fileRow}
                        onPress={() =>
                          item.url && Linking.openURL(item.url)
                        }
                      >
                        <FontAwesome
                          name={activeTab === 'link' ? 'link' : 'file-o'}
                          size={18}
                          color="#6366f1"
                          style={styles.fileIcon}
                        />
                        <View style={styles.fileInfo}>
                          <Text style={styles.fileName} numberOfLines={1}>
                            {item.name || item.url}
                          </Text>
                          <Text style={styles.fileDate}>
                            {item.createdAt
                              ? new Date(item.createdAt).toLocaleDateString(
                                  'vi-VN',
                                )
                              : ''}
                          </Text>
                        </View>
                        <FontAwesome
                          name="external-link"
                          size={14}
                          color="#9ca3af"
                        />
                      </TouchableOpacity>
                    ))}
                    {!isLoadingFiles && files.length === 0 && (
                      <Text style={styles.emptyText}>Chưa có file</Text>
                    )}
                  </View>
                )}

                {hasMore && !isLoadingFiles && (
                  <TouchableOpacity
                    style={styles.loadMoreBtn}
                    onPress={handleLoadMore}
                  >
                    <Text style={styles.loadMoreText}>Xem thêm</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* ── Privacy section ───────────────────────────────────── */}
            <SectionHeader title="Quyền riêng tư" sectionKey="privacy" />
            {sectionsOpen.privacy && (
              <View style={styles.sectionBody}>
                <ActionRow
                  icon="trash"
                  label="Xóa lịch sử trò chuyện"
                  danger
                  onPress={handleClearHistory}
                />
                {isGroup && (
                  <ActionRow
                    icon="sign-out"
                    label="Rời nhóm"
                    danger
                    onPress={handleLeave}
                  />
                )}
              </View>
            )}

            <View style={{ height: 32 }} />
          </ScrollView>
        </Animated.View>
      </Modal>

      {/* Image viewer */}
      <ImageViewerModal
        visible={previewVisible}
        images={previewImages}
        initialIndex={previewIndex}
        onClose={() => setPreviewVisible(false)}
      />
    </>
  );
};

const ActionRow: React.FC<{
  icon: string;
  label: string;
  onPress?: () => void;
  danger?: boolean;
}> = ({ icon, label, onPress, danger }) => (
  <TouchableOpacity style={styles.actionRow} onPress={onPress}>
    <FontAwesome
      name={icon as any}
      size={16}
      color={danger ? '#ef4444' : '#374151'}
      style={styles.actionIcon}
    />
    <Text style={[styles.actionLabel, danger && styles.actionLabelDanger]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  drawer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  scroll: {
    flex: 1,
  },
  roomInfo: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  roomAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 12,
  },
  avatarFallback: {
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  avatarFallbackTextSm: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  roomName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  roomSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#f9fafb',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.2,
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionIcon: {
    width: 24,
  },
  actionLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  actionLabelDanger: {
    color: '#ef4444',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  memberRole: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 1,
  },
  removeMemberBtn: {
    padding: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: '#6366f1',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabLabelActive: {
    color: '#fff',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  mediaThumb: {
    width: (DRAWER_WIDTH - 32 - 8) / 3,
    height: (DRAWER_WIDTH - 32 - 8) / 3,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  mediaThumbImg: {
    width: '100%',
    height: '100%',
  },
  loadingBox: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 20,
    width: '100%',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  fileIcon: {
    width: 24,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  fileDate: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  loadMoreBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '600',
  },
});

export default ChatDrawer;
