/**
 * ChatModals — renders the 4 heavy modals once at page level.
 * Previously each MessageBubble mounted all 4 even when invisible.
 * Now they live here, driven by useChatUIStore.
 */
import React, { useCallback, useContext } from 'react';
import ImageViewerModal from './image-viewer-modal.component';
import VideoViewerModal from './video-viewer-modal.component';
import { MessageContextMenu } from './message-context-menu';
import { ReactionsPicker } from './reactions-picker';
import useChatUIStore from '../../store/useChatUIStore';
import useMessageStore from '../../store/useMessage';
import useAuthStore from '../../store/useAuth';
import { useSocket } from '../../providers/socket.provider';
import { OnReplyContext } from './message.component';

export const ChatModals: React.FC = () => {
  const { socket } = useSocket();
  const { user } = useAuthStore();
  const onReply = useContext(OnReplyContext);

  const {
    imageViewer,
    videoViewer,
    contextMenu,
    reactionPicker,
    closeImageViewer,
    closeVideoViewer,
    closeContextMenu,
    closeReactionPicker,
    openReactionPicker,
  } = useChatUIStore();

  const handleReact = useCallback(
    (emoji: string) => {
      if (!contextMenu?.message) return;
      const msg = contextMenu.message;
      const store = useMessageStore.getState();
      const userId = user?._id || user?.id || '';
      const hasReacted = (msg.reactions || []).some(
        (r: any) => r.emoji === emoji && (r.users || []).some((u: any) => u._id === userId || u.usr_id === userId),
      );
      if (hasReacted) {
        store.removeReaction(msg.roomId, msg.id, emoji, userId);
      } else {
        store.addReaction(msg.roomId, msg.id, emoji, userId);
      }
      const snapshot = {
        id: msg.id,
        roomId: msg.roomId,
        reactions: msg.reactions ? msg.reactions.map((r: any) => ({ ...r, users: [...(r.users ?? [])] })) : [],
      };
      socket?.emit('message:emoji', { messageId: msg.id, roomId: msg.roomId, emoji }, (ack: any) => {
        if (!ack || ack?.ok === false) {
          useMessageStore.getState().upsetMsg({ ...msg, ...snapshot });
        }
      });
    },
    [socket, contextMenu, user],
  );

  const handlePickerReact = useCallback(
    (emoji: string) => {
      if (!reactionPicker) return;
      reactionPicker.onReact(emoji);
      closeReactionPicker();
    },
    [reactionPicker, closeReactionPicker],
  );

  const handleDelete = useCallback(() => {
    if (!contextMenu?.message) return;
    const msg = contextMenu.message;
    const snapshot = { id: msg.id, roomId: msg.roomId, isDeleted: msg.isDeleted };
    useMessageStore.getState().deleteMessage(msg.roomId, msg.id);
    socket?.emit('message:delete', { messageId: msg.id, roomId: msg.roomId }, (ack: any) => {
      if (!ack || ack?.ok === false) {
        useMessageStore.getState().upsetMsg({ ...msg, ...snapshot });
      }
    });
    closeContextMenu();
  }, [socket, contextMenu, closeContextMenu]);

  const handleRecall = useCallback(() => {
    if (!contextMenu?.message) return;
    const msg = contextMenu.message;
    const snapshot = { id: msg.id, roomId: msg.roomId, isDeleted: msg.isDeleted };
    useMessageStore.getState().recallMessage(msg.roomId, msg.id);
    socket?.emit('message:recall', { messageId: msg.id, roomId: msg.roomId }, (ack: any) => {
      if (!ack || ack?.ok === false) {
        useMessageStore.getState().upsetMsg({ ...msg, ...snapshot });
      }
    });
    closeContextMenu();
  }, [socket, contextMenu, closeContextMenu]);

  const handlePin = useCallback(() => {
    if (!contextMenu?.message) return;
    const msg = contextMenu.message;
    const newPinned = !msg.pinned;
    const snapshot = { id: msg.id, roomId: msg.roomId, pinned: msg.pinned };
    useMessageStore.getState().togglePin(msg.roomId, msg.id, newPinned);
    socket?.emit('message:pinned', { messageId: msg.id, roomId: msg.roomId, pinned: newPinned }, (ack: any) => {
      if (!ack || ack?.ok === false) {
        useMessageStore.getState().upsetMsg({ ...msg, ...snapshot });
      }
    });
    closeContextMenu();
  }, [socket, contextMenu, closeContextMenu]);

  return (
    <>
      {/* Image Viewer */}
      <ImageViewerModal
        visible={!!imageViewer}
        images={imageViewer?.images ?? []}
        initialIndex={imageViewer?.index ?? 0}
        onClose={closeImageViewer}
        getAttachmentSource={(a: any) => {
          if (a?.mimeType?.startsWith('video/')) return a.uploadedUrl || a.url || a.thumbUrl;
          return a?.thumbUrl || a?.uploadedUrl || a?.url;
        }}
      />

      {/* Video Viewer */}
      <VideoViewerModal
        visible={!!videoViewer}
        videos={videoViewer?.videos ?? []}
        initialIndex={videoViewer?.index ?? 0}
        onClose={closeVideoViewer}
        getAttachmentSource={videoViewer?.getSource ?? ((a: any) => a?.uploadedUrl || a?.url)}
      />

      {/* Context Menu */}
      <MessageContextMenu
        visible={!!contextMenu}
        message={contextMenu?.message ?? null}
        isMine={contextMenu?.message?.isMine ?? false}
        onClose={closeContextMenu}
        onReply={() => {
          if (contextMenu?.message && onReply) onReply(contextMenu.message);
          closeContextMenu();
        }}
        onReact={handleReact}
        onOpenReactionPicker={() => {
          if (!contextMenu?.message) return;
          closeContextMenu();
          openReactionPicker({
            messageId: contextMenu.message.id,
            message: contextMenu.message,
            onReact: (emoji) => {
              const store = useMessageStore.getState();
              const msg = contextMenu.message;
              const userId = user?._id || user?.id || '';
              const hasReacted = (msg.reactions || []).some(
                (r: any) => r.emoji === emoji && (r.users || []).some((u: any) => u._id === userId || u.usr_id === userId),
              );
              if (hasReacted) store.removeReaction(msg.roomId, msg.id, emoji, userId);
              else store.addReaction(msg.roomId, msg.id, emoji, userId);
              socket?.emit('message:emoji', { messageId: msg.id, roomId: msg.roomId, emoji });
            },
          });
        }}
        onCopy={() => { closeContextMenu(); }}
        onPin={handlePin}
        onDelete={handleDelete}
        onRecall={contextMenu?.message?.isMine ? handleRecall : undefined}
        onTranslate={
          contextMenu?.message?.type === 'text' && !!contextMenu?.message?.content
            ? () => { closeContextMenu(); }
            : undefined
        }
        onSummarize={
          (contextMenu?.message?.type === 'file' || (contextMenu?.message?.attachments?.length ?? 0) > 0)
            ? () => { closeContextMenu(); }
            : undefined
        }
      />

      {/* Reaction Picker */}
      <ReactionsPicker
        visible={!!reactionPicker}
        message={reactionPicker?.message ?? null}
        onReact={handlePickerReact}
        onClose={closeReactionPicker}
      />
    </>
  );
};
