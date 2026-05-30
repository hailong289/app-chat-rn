import useMessageStore from "../store/useMessage";
import useRoomStore from "../store/useRoom";

/**
 * Delta-sync the open room + refresh the room list. Called on socket connect,
 * app foreground, and room focus. Uses fetchNewMessages keyed on the last local
 * message id to fill gaps missed while offline.
 */
export async function syncOnOpen(roomId?: string): Promise<void> {
  try {
    if (roomId) {
      const room = useMessageStore.getState().messagesRoom[roomId];
      const msgs = room?.messages ?? [];
      const lastLocalId = msgs.length ? msgs[msgs.length - 1].id : undefined;
      if (lastLocalId) {
        await useMessageStore.getState().fetchNewMessages(roomId, lastLocalId);
      } else {
        await useMessageStore.getState().loadRoomFromCache(roomId, 20);
      }
    }
    const getRooms = useRoomStore.getState().getRooms;
    if (typeof getRooms === "function") {
      await getRooms({
        limit: 20,
        offset: 0,
        type: "all",
        success: () => {},
        error: () => {},
      });
    }
  } catch {
    /* best-effort; live events still flow */
  }
}
