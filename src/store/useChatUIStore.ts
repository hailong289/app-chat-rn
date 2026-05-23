import { create } from 'zustand';

type ImageViewerPayload = { messageId: string; index: number; images: any[] };
type VideoViewerPayload = { messageId: string; index: number; videos: any[]; getSource: (a: any) => string | undefined };
type ContextMenuPayload = { messageId: string; message: any };
type ReactionPickerPayload = { messageId: string; message: any; onReact: (emoji: string) => void };

interface ChatUIState {
  imageViewer: ImageViewerPayload | null;
  videoViewer: VideoViewerPayload | null;
  contextMenu: ContextMenuPayload | null;
  reactionPicker: ReactionPickerPayload | null;
  expandedMessages: Set<string>;

  openImageViewer: (payload: ImageViewerPayload) => void;
  openVideoViewer: (payload: VideoViewerPayload) => void;
  openContextMenu: (payload: ContextMenuPayload) => void;
  openReactionPicker: (payload: ReactionPickerPayload) => void;
  closeImageViewer: () => void;
  closeVideoViewer: () => void;
  closeContextMenu: () => void;
  closeReactionPicker: () => void;
  toggleExpanded: (messageId: string) => void;
}

const useChatUIStore = create<ChatUIState>((set) => ({
  imageViewer: null,
  videoViewer: null,
  contextMenu: null,
  reactionPicker: null,
  expandedMessages: new Set(),

  openImageViewer: (payload) => set({ imageViewer: payload }),
  openVideoViewer: (payload) => set({ videoViewer: payload }),
  openContextMenu: (payload) => set({ contextMenu: payload }),
  openReactionPicker: (payload) => set({ reactionPicker: payload }),

  closeImageViewer: () => set({ imageViewer: null }),
  closeVideoViewer: () => set({ videoViewer: null }),
  closeContextMenu: () => set({ contextMenu: null }),
  closeReactionPicker: () => set({ reactionPicker: null }),

  toggleExpanded: (messageId) =>
    set((state) => {
      const next = new Set(state.expandedMessages);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return { expandedMessages: next };
    }),
}));

export default useChatUIStore;
