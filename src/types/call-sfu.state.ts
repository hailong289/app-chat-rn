/**
 * SFU (mediasoup) Call sub-store state types.
 * Uses `any` for mediasoup-client types to keep the dependency optional
 * and avoid compile errors when the native binding is not yet linked.
 */

export interface SfuRemoteProducerInfo {
  producerId: string;
  userId?: string;
  kind?: string;
  appData?: { source?: string };
}

export interface SfuSessionState {
  /** mediasoup-client Device */
  device: any | null;
  /** Transport for sending local tracks to the SFU */
  sendTransport: any | null;
  /** Transport for receiving remote tracks from the SFU */
  recvTransport: any | null;
  /** Active producers keyed by producer.id */
  producers: Map<string, any>;
  /** Active consumers keyed by consumer.id */
  consumers: Map<string, any>;
  /** Pending produce callbacks waiting for the SFU 'produce' ack */
  pendingProduceCallbacks: Map<string, (params: { id: string }) => void>;
  /** Remote producers announced before the receive transport is ready */
  pendingRemoteProducers: Map<string, SfuRemoteProducerInfo>;
  /** Local screen-share producer (separate from camera/mic producers) */
  screenProducer: any | null;
  /**
   * IDs of remote producers known to be screen-share sources.
   * Populated by `call:share-screen` socket event before the broadcast
   * `consume` arrives so the consume handler routes to remoteScreenStreams.
   */
  screenProducerIds: Set<string>;
}

export interface SfuStoreState {
  sfu: SfuSessionState;
  initSFU: () => Promise<void>;
  handleSFUSignal: (payload: any) => Promise<void>;
  replaceTracksInProducers: (newStream: any) => Promise<void>;
  teardownSfu: (options?: { emitLeave?: boolean }) => void;
  produceLocalStream: (localStream: any) => Promise<void>;
}
