import { AppState, AppStateStatus } from "react-native";

type NetworkListenerCallback = (isConnected: boolean) => void;

class NetworkListener {
  private listeners = new Set<NetworkListenerCallback>();
  private _isConnected = true;
  private appStateSubscription: { remove: () => void } | null = null;

  get isConnected() {
    return this._isConnected;
  }

  subscribe(callback: NetworkListenerCallback): () => void {
    this.listeners.add(callback);
    // Immediately notify with current state
    callback(this._isConnected);

    if (this.listeners.size === 1) {
      this.startListening();
    }

    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0) {
        this.stopListening();
      }
    };
  }

  private startListening() {
    // Use AppState to detect when app returns to foreground (likely reconnected)
    this.appStateSubscription = AppState.addEventListener(
      "change",
      this.handleAppStateChange,
    );
  }

  private stopListening() {
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === "active") {
      // When app becomes active, assume connected (socket will re-verify)
      if (!this._isConnected) {
        this._isConnected = true;
        this.notifyListeners();
      }
    } else if (nextAppState === "background") {
      // Consider potentially disconnected in background
      // Don't set to false to avoid unnecessary reconnection storms
    }
  };

  setConnected(connected: boolean) {
    if (this._isConnected !== connected) {
      this._isConnected = connected;
      this.notifyListeners();
    }
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => {
      try {
        cb(this._isConnected);
      } catch {}
    });
  }
}

export default new NetworkListener();
