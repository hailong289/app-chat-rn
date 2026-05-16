/**
 * Registers react-native-webrtc globals required by mediasoup-client (ReactNative106).
 * Must run once before `new Device()` from mediasoup-client.
 */
let registered = false;

export function ensureWebRtcGlobals(): void {
  if (registered) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { registerGlobals } = require('react-native-webrtc');
    registerGlobals();
    registered = true;
  } catch (error) {
    console.warn('[WebRTC] registerGlobals failed:', error);
  }
}

/** mediasoup-client handler for React Native + react-native-webrtc */
export const MEDIASOUP_HANDLER_NAME = 'ReactNative106' as const;
