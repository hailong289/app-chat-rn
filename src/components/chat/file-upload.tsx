import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
  Dimensions,
  Alert,
} from 'react-native';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { pick, types } from '@react-native-documents/picker';
import { ObjectId } from 'bson';
import type { FilePreview } from '../../types/message.type';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THUMB_SIZE = (SCREEN_WIDTH - 48 - 12 * 2) / 3;

type FileUploadProps = {
  attachments: FilePreview[];
  onAttachmentsChange: (files: FilePreview[]) => void;
  onClose: () => void;
  visible: boolean;
};

const QUICK_ACTIONS = [
  { id: 'camera', icon: 'camera', label: 'Camera', color: '#6366f1' },
  { id: 'gallery', icon: 'image', label: 'Thư viện', color: '#0ea5e9' },
  { id: 'document', icon: 'file-text-o', label: 'Tài liệu', color: '#f59e0b' },
  { id: 'audio', icon: 'music', label: 'Âm thanh', color: '#22c55e' },
];

export const FileUpload: React.FC<FileUploadProps> = ({
  attachments,
  onAttachmentsChange,
  onClose,
  visible,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleCamera = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await launchCamera({
        mediaType: 'mixed',
        saveToPhotos: true,
      });
      if (result.didCancel || !result.assets?.length) return;
      const mapped: FilePreview[] = result.assets
        .filter(a => a.uri)
        .map(a => ({
          _id: new ObjectId().toHexString(),
          kind: a.type?.startsWith('video/') ? 'video' : 'image',
          url: a.uri!,
          name: a.fileName || `photo_${Date.now()}.jpg`,
          size: a.fileSize || 0,
          mimeType: a.type || 'image/jpeg',
          width: a.width,
          height: a.height,
          status: 'pending',
          uploadProgress: 0,
          file: a as any,
        }));
      onAttachmentsChange([...attachments, ...mapped]);
    } catch (e) {
      console.warn('Camera error', e);
    } finally {
      setIsLoading(false);
    }
  }, [attachments, onAttachmentsChange]);

  const handleGallery = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await launchImageLibrary({
        mediaType: 'mixed',
        selectionLimit: 20,
        includeBase64: false,
      });
      if (result.didCancel || !result.assets?.length) return;
      const mapped: FilePreview[] = result.assets
        .filter(a => a.uri)
        .map(a => ({
          _id: new ObjectId().toHexString(),
          kind: a.type?.startsWith('video/') ? 'video' : 'image',
          url: a.uri!,
          name: a.fileName || `media_${Date.now()}.jpg`,
          size: a.fileSize || 0,
          mimeType: a.type || 'image/jpeg',
          width: a.width,
          height: a.height,
          status: 'pending',
          uploadProgress: 0,
          file: a as any,
        }));
      onAttachmentsChange([...attachments, ...mapped]);
    } catch (e) {
      console.warn('Gallery error', e);
    } finally {
      setIsLoading(false);
    }
  }, [attachments, onAttachmentsChange]);

  const handleDocument = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await pick({
        allowMultiSelection: true,
        type: [types.allFiles],
      });
      const mapped: FilePreview[] = result.map(r => ({
        _id: new ObjectId().toHexString(),
        kind: 'file',
        url: r.uri,
        name: r.name || `file_${Date.now()}`,
        size: r.size || 0,
        mimeType: r.type || 'application/octet-stream',
        status: 'pending',
        uploadProgress: 0,
        file: r as any,
      }));
      onAttachmentsChange([...attachments, ...mapped]);
    } catch (e: any) {
      if (e?.code !== 'DOCUMENT_PICKER_CANCELED') {
        console.warn('Document picker error', e);
      }
    } finally {
      setIsLoading(false);
    }
  }, [attachments, onAttachmentsChange]);

  const handleAction = (id: string) => {
    switch (id) {
      case 'camera': handleCamera(); break;
      case 'gallery': handleGallery(); break;
      case 'document': handleDocument(); break;
      case 'audio':
        Alert.alert('Âm thanh', 'Chọn file audio từ thiết bị.');
        break;
    }
  };

  const handleRemove = (fileId: string) => {
    onAttachmentsChange(attachments.filter(a => a._id !== fileId));
  };

  const getProgressColor = (status?: string) => {
    switch (status) {
      case 'uploading': return '#6366f1';
      case 'uploaded': return '#22c55e';
      case 'failed': return '#ef4444';
      default: return '#9ca3af';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              Đính kèm {attachments.length > 0 ? `(${attachments.length})` : ''}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <FontAwesome name="times" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Quick actions */}
          <View style={styles.actionsRow}>
            {QUICK_ACTIONS.map(action => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionBtn}
                onPress={() => handleAction(action.id)}
                disabled={isLoading}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color + '22' }]}>
                  <FontAwesome name={action.icon as any} size={22} color={action.color} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Attachment preview grid */}
          {attachments.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Đã chọn</Text>
              <FlatList
                data={attachments}
                keyExtractor={item => item._id}
                numColumns={3}
                columnWrapperStyle={styles.grid}
                renderItem={({ item }) => (
                  <View style={styles.thumbContainer}>
                    {/* Progress bar */}
                    {(item.status === 'uploading' || item.status === 'uploaded') && (
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${item.uploadProgress || 0}%`,
                              backgroundColor: getProgressColor(item.status),
                            },
                          ]}
                        />
                      </View>
                    )}

                    {/* File icon for non-images */}
                    <View style={[styles.thumb, styles.thumbFile]}>
                      <FontAwesome
                        name={
                          item.kind === 'image' ? 'file-image-o'
                          : item.kind === 'video' ? 'file-video-o'
                          : item.kind === 'audio' ? 'file-audio-o'
                          : 'file-o'
                        }
                        size={28}
                        color="#6366f1"
                      />
                      <Text style={styles.thumbName} numberOfLines={2}>
                        {item.name}
                      </Text>
                    </View>

                    {/* Remove button */}
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => handleRemove(item._id)}
                    >
                      <FontAwesome name="times" size={10} color="#fff" />
                    </TouchableOpacity>

                    {/* Status indicator */}
                    {item.status === 'failed' && (
                      <View style={styles.errorBadge}>
                        <FontAwesome name="exclamation-triangle" size={10} color="#fff" />
                      </View>
                    )}
                  </View>
                )}
                style={styles.gridContainer}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 10,
  },
  gridContainer: {
    maxHeight: 260,
  },
  grid: {
    gap: 8,
    marginBottom: 8,
  },
  thumbContainer: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  thumbFile: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    gap: 4,
  },
  thumbName: {
    fontSize: 10,
    color: '#374151',
    textAlign: 'center',
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#e5e7eb',
    zIndex: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  errorBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    padding: 3,
  },
});

export default FileUpload;
