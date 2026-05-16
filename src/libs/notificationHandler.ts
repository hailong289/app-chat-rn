import messaging, {
  FirebaseMessagingTypes,
} from "@react-native-firebase/messaging";
import { NavigationContainerRef } from "@react-navigation/native";

let navigationRef: NavigationContainerRef<any> | null = null;
let isReady = false;

export function setNotificationNavRef(ref: NavigationContainerRef<any> | null) {
  navigationRef = ref;
  // Process any pending notification that arrived before nav was ready
  if (ref) {
    isReady = true;
    processPendingNotification();
  }
}

let pendingNotification: FirebaseMessagingTypes.RemoteMessage | null = null;

function processPendingNotification() {
  if (pendingNotification && navigationRef && isReady) {
    handleNotificationOpen(pendingNotification);
    pendingNotification = null;
  }
}

function handleNotificationOpen(
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
) {
  if (!navigationRef) {
    pendingNotification = remoteMessage;
    return;
  }

  const data = remoteMessage.data || {};
  const type = data.push_type || data.type;

  try {
    switch (type) {
      case "message":
      case "chat": {
        const roomId = data.roomId || data.room_id;
        if (roomId) {
          navigationRef.navigate("MainStack", {
            screen: "Chat",
            params: { roomId },
          });
        }
        break;
      }
      case "call":
      case "call_request": {
        const roomId = data.roomId || data.room_id;
        const callType = data.call_type || "audio";
        const callMode = data.call_mode || "p2p";
        const members = data.members || "[]";
        if (roomId) {
          navigationRef.navigate("MainStack", {
            screen: "Call",
            params: {
              roomId,
              members,
              callType,
              callMode: callMode as "p2p" | "sfu",
              status: "ringing",
              isCaller: false,
            },
          });
        }
        break;
      }
      case "friend_request": {
        navigationRef.navigate("MainStack", {
          screen: "Main",
          params: { screen: "Contact" },
        });
        break;
      }
      default:
        // Navigate to home as fallback
        break;
    }
  } catch (e) {
    console.warn("[NotificationHandler] Navigation failed:", e);
  }
}

export function setupNotificationHandlers() {
  // Handle notification tap when app is in background
  messaging().onNotificationOpenedApp((remoteMessage) => {
    handleNotificationOpen(remoteMessage);
  });

  // Handle notification that opened the app from quit state
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        // Small delay to ensure navigation is ready
        setTimeout(() => {
          handleNotificationOpen(remoteMessage);
        }, 1000);
      }
    });
}

export default {
  setNotificationNavRef,
  setupNotificationHandlers,
};
