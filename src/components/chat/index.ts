/**
 * Chat Components - Phase 2 Exports
 * Import tập trung các components chat từ 1 chỗ
 */

// Core UI
export { default as MessageItem, groupMessagesWithSeparators } from './message.component';
export type { ChatMessageItem, DateSeparatorItem } from './message.component';

// Input & Recording
export { InputBar } from './input-bar';
export { FileUpload } from './file-upload';
export { VoiceMessage } from './voice-message';

// Message features
export { ReplyPreview } from './reply-preview';
export { TypingIndicator } from './typing-indicator';
export { ReactionsPicker } from './reactions-picker';
export { MessageContextMenu } from './message-context-menu';
export { MessageReactions } from './message-reactions';
export { OnlineDot } from './online-dot';

// Message type cards
export { FlashcardDeckMessageCard } from './flashcard-deck-message-card';

// Media viewers
export { ImageViewerModal } from './image-viewer-modal.component';
export { VideoViewerModal } from './video-viewer-modal.component';

// Drawer / Panel
export { ChatDrawer } from './chat-drawer';

// Constants
export { EMOJIS, MAX_MESSAGE_LENGTH, MESSAGES_PER_GROUP, RECALL_TIME_LIMIT_MINUTES } from './constants/messageConstants';
