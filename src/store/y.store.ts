/**
 * Yjs document store — tracks active Y.Doc instances for document collaboration.
 *
 * In React Native, the actual BlockNote editor runs inside a WebView which
 * manages its own Y.Doc + SocketIOProvider. This store provides the native
 * side with awareness user state for presence indicators and document list
 * updates.
 */
import { create } from "zustand";

export interface YjsUserState {
  name: string;
  color: string;
  avatar?: string;
}

interface YjsStoreState {
  /** Active document IDs being viewed/edited */
  activeDocIds: Set<string>;
  /** Current user info for awareness */
  localUser: YjsUserState | null;

  setLocalUser: (user: YjsUserState | null) => void;
  addActiveDoc: (docId: string) => void;
  removeActiveDoc: (docId: string) => void;
  clearActiveDocs: () => void;
}

const useYjsStore = create<YjsStoreState>((set) => ({
  activeDocIds: new Set(),
  localUser: null,

  setLocalUser: (user) => set({ localUser: user }),

  addActiveDoc: (docId) =>
    set((state) => {
      const next = new Set(state.activeDocIds);
      next.add(docId);
      return { activeDocIds: next };
    }),

  removeActiveDoc: (docId) =>
    set((state) => {
      const next = new Set(state.activeDocIds);
      next.delete(docId);
      return { activeDocIds: next };
    }),

  clearActiveDocs: () => set({ activeDocIds: new Set() }),
}));

export default useYjsStore;
