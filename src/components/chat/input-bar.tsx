import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Keyboard,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import { ObjectId } from 'bson';
import { launchImageLibrary } from 'react-native-image-picker';

import type { FilePreview, MessageType } from '../../types/message.type';
import { ReplyPreview } from './reply-preview';
import { TypingIndicator } from './typing-indicator';
import { FileUpload } from './file-upload';
import { VoiceMessage } from './voice-message';

// Quick emoji reactions
const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

type InputBarProps = {
  roomId: string;
  replyingTo?: MessageType | null;
  typingUsers?: Array<{ userId: string; fullname: string; avatar?: string }>;
  currentUserId?: string;
  onSend: (payload: {
    content: string;
    attachments: FilePreview[];
    type: string;
    replyTo?: string;
  }) => void;
  onClearReply?: () => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  keyboardVisible?: boolean;
  disabled?: boolean;
  disabledMessage?: string;
};

export const InputBar: React.FC<InputBarProps> = ({
  roomId,
  replyingTo,
  typingUsers = [],
  currentUserId,
  onSend,
  onClearReply,
  onTypingStart,
  onTypingStop,
  keyboardVisible = false,
  disabled = false,
  disabledMessage,
}) => {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<FilePreview[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [showEmojiRow, setShowEmojiRow] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasAttachments = attachments.length > 0;
  const canSend = message.trim().length > 0 || hasAttachments;

  // ── Typing events ─────────────────────────────────────────────
  const handleTextChange = useCallback(
    (text: string) => {
      setMessage(text);
      if (text.length > 0) {
        onTypingStart?.();
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          onTypingStop?.();
        }, 2000);
      } else {
        onTypingStop?.();
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      }
    },
    [onTypingStart, onTypingStop],
  );

  // ── Send ──────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    if (!canSend) return;
    const type =
      hasAttachments
        ? attachments[0].mimeType?.startsWith('video/')
          ? 'video'
          : attachments[0].mimeType?.startsWith('audio/')
          ? 'audio'
          : 'image'
        : 'text';

    onSend({
      content: message.trim(),
      attachments,
      type,
      replyTo: replyingTo?.id,
    });
    setMessage('');
    setAttachments([]);
    onClearReply?.();
    onTypingStop?.();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }, [canSend, message, attachments, hasAttachments, replyingTo, onSend, onClearReply, onTypingStop]);

  // ── Quick image attach ────────────────────────────────────────
  const handleQuickImage = useCallback(async () => {
    const result = await launchImageLibrary({
      mediaType: 'mixed',
      selectionLimit: 10,
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
        status: 'pending',
        uploadProgress: 0,
        file: a as any,
      }));
    setAttachments(prev => [...prev, ...mapped]);
  }, []);

  // ── Emoji pick ────────────────────────────────────────────────
  const handleEmojiPick = (emoji: string) => {
    setMessage(prev => prev + emoji);
  };

  // ── Voice send ────────────────────────────────────────────────
  const handleVoiceSend = (fp: FilePreview) => {
    setShowVoice(false);
    onSend({ content: '', attachments: [fp], type: 'audio' });
  };

  if (disabled) {
    return (
      <View style={[styles.disabledContainer, { paddingBottom: insets.bottom + 8 }]}>
        <Text style={styles.disabledText}>
          {disabledMessage || 'Bạn không có quyền gửi tin nhắn'}
        </Text>
      </View>
    );
  }

  return (
    <>
      {/* File Upload Sheet */}
      <FileUpload
        visible={showFileUpload}
        attachments={attachments}
        onAttachmentsChange={setAttachments}
        onClose={() => setShowFileUpload(false)}
      />

      {/* Voice Message Sheet */}
      <VoiceMessage
        visible={showVoice}
        onClose={() => setShowVoice(false)}
        onSend={handleVoiceSend}
      />

      <View style={styles.wrapper}>
        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <TypingIndicator users={typingUsers} currentUserId={currentUserId} />
        )}

        {/* Reply Preview */}
        {replyingTo && (
          <View style={styles.replyContainer}>
            <ReplyPreview
              reply={{
                _id: replyingTo.id,
                type: replyingTo.type,
                content: replyingTo.content,
                isMine: replyingTo.isMine,
                isDeleted: replyingTo.isDeleted,
                hiddenByMe: replyingTo.hiddenByMe,
                sender: replyingTo.sender,
                attachments: replyingTo.attachments,
              }}
              onClose={onClearReply}
              showCloseButton
            />
          </View>
        )}

        {/* Attachment Thumbnails */}
        {hasAttachments && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.attachRow}
          >
            {attachments.map(att => (
              <View key={att._id} style={styles.thumbWrap}>
                <Image
                  source={{ uri: att.thumbUrl || att.url }}
                  style={styles.thumb}
                />
                {att.uploadProgress !== undefined && att.uploadProgress < 100 && att.status === 'uploading' && (
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${att.uploadProgress}%` }]} />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeThumb}
                  onPress={() => setAttachments(prev => prev.filter(a => a._id !== att._id))}
                >
                  <FontAwesome name="times" size={10} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Quick Emoji Row */}
        {showEmojiRow && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.emojiRow}
          >
            {QUICK_EMOJIS.map(em => (
              <TouchableOpacity key={em} onPress={() => handleEmojiPick(em)} style={styles.emojiBtn}>
                <Text style={styles.emoji}>{em}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Main Input Row */}
        <View style={[styles.inputRow, { paddingBottom: keyboardVisible ? 6 : insets.bottom + 4 }]}>
          {/* Plus Button */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              Keyboard.dismiss();
              setShowFileUpload(true);
            }}
          >
            <FontAwesome name="plus" size={20} color="#6366f1" />
          </TouchableOpacity>

          {/* Text input */}
          <View style={styles.textWrap}>
            <TextInput
              style={styles.input}
              placeholder="Nhập tin nhắn..."
              placeholderTextColor="#9ca3af"
              value={message}
              onChangeText={handleTextChange}
              multiline
              maxLength={4000}
              returnKeyType="default"
            />
          </View>

          {/* Emoji toggle */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setShowEmojiRow(v => !v)}
          >
            <FontAwesome
              name="smile-o"
              size={20}
              color={showEmojiRow ? '#6366f1' : '#9ca3af'}
            />
          </TouchableOpacity>

          {/* Voice or Send */}
          {canSend ? (
            <TouchableOpacity style={[styles.iconBtn, styles.sendBtn]} onPress={handleSend}>
              <FontAwesome name="paper-plane" size={16} color="#fff" />
            </TouchableOpacity>
          ) : (
            <>
              {/* Quick image */}
              <TouchableOpacity style={styles.iconBtn} onPress={handleQuickImage}>
                <FontAwesome name="image" size={20} color="#9ca3af" />
              </TouchableOpacity>
              {/* Voice */}
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => {
                  Keyboard.dismiss();
                  setShowVoice(true);
                }}
              >
                <FontAwesome name="microphone" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#f9fafb',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  disabledContainer: {
    backgroundColor: '#f9fafb',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingTop: 12,
    alignItems: 'center',
  },
  disabledText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  replyContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  attachRow: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
  },
  thumbWrap: {
    position: 'relative',
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  thumb: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#e5e7eb',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
  },
  removeThumb: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiRow: {
    paddingHorizontal: 12,
    paddingTop: 6,
    gap: 6,
  },
  emojiBtn: {
    padding: 4,
  },
  emoji: {
    fontSize: 22,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 6,
    gap: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  sendBtn: {
    backgroundColor: '#6366f1',
  },
  textWrap: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    maxHeight: 120,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 20,
    maxHeight: 100,
  },
});

export default InputBar;
