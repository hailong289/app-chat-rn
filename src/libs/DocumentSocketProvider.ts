/**
 * DocumentSocketProvider — manages document-room socket events on the native side.
 *
 * In React Native, the BlockNote editor runs inside a WebView which creates its
 * own Y.Doc + SocketIOProvider. This native-side provider handles:
 *  - Document metadata updates (title, visibility, sharing)
 *  - User presence tracking (who's viewing/editing)
 *  - Document room join/leave lifecycle
 */
import { Socket } from "socket.io-client";
import useDocumentStore from "../store/useDocumentStore";
import useAuthStore from "../store/useAuth";

export interface UserPresence {
  userId: string;
  fullname: string;
  avatar?: string;
  color?: string;
  cursorPosition?: Record<string, unknown>;
  isTyping?: boolean;
}

export class DocumentSocketProvider {
  private socket: Socket;
  private docId: string;
  private typingTimeout: ReturnType<typeof setTimeout> | null = null;
  private _isActive = false;

  /** Callback when document metadata updates from server */
  onDocumentUpdate?: (doc: any) => void;
  /** Callback when user presence changes */
  onPresenceChange?: (users: Map<string, UserPresence>) => void;

  constructor(docId: string, socket: Socket) {
    this.docId = docId;
    this.socket = socket;
    this._isActive = true;

    this.joinRoom();
    this.setupListeners();
  }

  get isActive(): boolean {
    return this._isActive;
  }

  // ── Room lifecycle ──────────────────────────────────────────────────

  private joinRoom() {
    this.socket.emit("doc:open", { docId: this.docId });
  }

  private leaveRoom() {
    this.socket.emit("doc:close", { docId: this.docId });
  }

  // ── Socket listeners ─────────────────────────────────────────────────

  private setupListeners() {
    // Document opened — initial metadata + snapshot
    this.socket.on("doc:opened", (data: any) => {
      this.onDocumentUpdate?.(data);
    });

    // Document metadata changed (title, visibility, sharing)
    this.socket.on("doc:changed", (data: any) => {
      if (data.clientId !== this.socket.id) {
        // Refresh document from API to get latest metadata
        useDocumentStore.getState().getDocument(this.docId);
      }
    });

    // User joined the document
    this.socket.on(
      "user:joined",
      (data: { userId: string; fullname: string; avatar?: string }) => {
        // Presence tracking handled by the page component
      }
    );

    // User left the document
    this.socket.on(
      "user:left",
      (data: { userId: string; fullname: string }) => {
        // Presence tracking handled by the page component
      }
    );

    // User cursor moved
    this.socket.on(
      "user:cursor",
      (data: {
        userId: string;
        fullname: string;
        cursorPosition: Record<string, unknown>;
        color: string;
        avatar?: string;
      }) => {
        // Relay to WebView or handle in native UI
      }
    );

    // User typing indicator
    this.socket.on(
      "user:typing",
      (data: { userId: string; fullname: string; isTyping: boolean }) => {
        // Relay to WebView or handle in native UI
      }
    );
  }

  // ── Typing indicator ─────────────────────────────────────────────────

  sendTyping(isTyping: boolean) {
    this.socket.emit("doc:typing", {
      docId: this.docId,
      isTyping,
    });
  }

  // ── Cleanup ──────────────────────────────────────────────────────────

  destroy() {
    this._isActive = false;

    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }

    this.leaveRoom();

    this.socket.off("doc:opened");
    this.socket.off("doc:changed");
    this.socket.off("user:joined");
    this.socket.off("user:left");
    this.socket.off("user:cursor");
    this.socket.off("user:typing");
  }
}
