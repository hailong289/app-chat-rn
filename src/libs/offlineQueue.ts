import AsyncStorage from "@react-native-async-storage/async-storage";
import networkListener from "./networkListener";

const QUEUE_KEY = "offline_message_queue";

export interface QueuedMessage {
  _id: string;
  roomId: string;
  content: string;
  type: string;
  attachments?: any[];
  replyTo?: string;
  createdAt: string;
}

class OfflineQueue {
  private queue: QueuedMessage[] = [];
  private flushHandler: ((msg: QueuedMessage) => Promise<boolean>) | null = null;
  private isFlushing = false;
  private unsubscribe: (() => void) | null = null;

  async init(flushFn: (msg: QueuedMessage) => Promise<boolean>) {
    this.flushHandler = flushFn;
    // Load persisted queue
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      if (raw) {
        this.queue = JSON.parse(raw);
      }
    } catch {}
    // Listen for network changes
    this.unsubscribe = networkListener.subscribe((isConnected) => {
      if (isConnected && this.queue.length > 0) {
        this.flush();
      }
    });
  }

  enqueue(msg: QueuedMessage) {
    this.queue.push(msg);
    this.persist();
    // Try flushing immediately if connected
    if (networkListener.isConnected) {
      this.flush();
    }
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  private async persist() {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch {}
  }

  async flush() {
    if (this.isFlushing || !this.flushHandler || this.queue.length === 0) return;
    this.isFlushing = true;

    const toFlush = [...this.queue];
    const remaining: QueuedMessage[] = [];

    for (const msg of toFlush) {
      try {
        const success = await this.flushHandler(msg);
        if (!success) {
          remaining.push(msg);
        }
      } catch {
        remaining.push(msg);
      }
    }

    this.queue = remaining;
    await this.persist();
    this.isFlushing = false;
  }

  clear() {
    this.queue = [];
    AsyncStorage.removeItem(QUEUE_KEY).catch(() => {});
  }

  destroy() {
    this.unsubscribe?.();
    this.flushHandler = null;
  }
}

export default new OfflineQueue();
