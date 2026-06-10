# Ke hoach fix SFU video lan dau join

## Pham vi

- Chi sua React Native app trong `app-chat-rn`.
- Khong sua `app-chat-fe` vi ban web dang hoat dong binh thuong.
- Khong sua backend/SFU tru khi sau khi fix RN van con bang chung loi tu server.

## Trieu chung

- Khi tao/goi SFU moi lan dau, nguoi tham gia khong thay video remote.
- Thoat ra hoac tham gia lai thi video hien duoc.
- Web client khong gap loi tuong tu, nen kha nang cao la race/render issue o RN.

## Nhan dinh chinh

1. `RTCView` tren RN co the mount qua som voi stream chi co audio.
   - `src/components/call/call-ui.tsx` hien dang render `RTCView` neu `RTCView` ton tai va peer khong tat camera.
   - Dieu kien nay chua kiem tra `remoteStream.getVideoTracks()`.
   - Voi SFU, audio producer thuong duoc consume truoc video producer. Neu `RTCView` mount tren stream audio-only, sau do add video track vao cung `MediaStream`, native view co the khong rebind khung hinh.
   - Rejoin co the work vi luc render lai stream da co video track san.

2. Caller RN dang emit SFU qua som va bi trung.
   - `src/store/useCallStore.ts` trong `openCall` dang emit `call:request` va `signal join` truoc khi navigate sang Call screen.
   - `updateCallState` lai emit `call:request` va `signal join` them mot lan nua.
   - Backend SFU khi cung user join lai se cleanup participant/transports/producers cu, nen double join co the lam mat producer/video trong lan dau.

3. Server khong tao consumer paused.
   - Backend dang `transport.consume({ paused: false })`, nen huong fix chinh khong phai them `resumeConsumer`.

## Ke hoach fix

### 1. Fix render video trong RN

- Trong `ParticipantTile`, tinh `videoTracks = stream?.getVideoTracks?.() ?? []`.
- Chi render `RTCView` khi:
  - peer khong tat camera,
  - `RTCView` ton tai,
  - `videoTracks.length > 0`.
- Them `key` cho `RTCView` dua tren `streamKey` va `videoTracks[0].id` de force remount khi video track xuat hien sau audio.
- Khi chua co video track, render avatar/loading thay vi mount `RTCView` audio-only.

### 2. Don gian hoa bootstrap SFU caller

- Bo emit `call:request` va `signal join` khoi `openCall` cho SFU.
- `openCall` chi set state can thiet va navigate sang Call screen.
- De `CallPage -> updateCallState({ status: "calling" })` la single source:
  - emit `call:request` co ack,
  - lay `canonicalRoomId`,
  - `initSFU`,
  - emit `signal join` mot lan voi canonical room id.

### 3. Chong mat producer event

- Khi nhan `produce` broadcast ma `recvTransport` chua ready, khong bo mat producer.
- Lua chon nho gon:
  - luu pending producer ids trong SFU store, hoac
  - trigger `getProducers` sau khi `recvTransport` duoc set.
- Van giu dedupe theo `producerId` de tranh consume trung khi ca `produce` broadcast va `getProducers` cung ve.

### 4. Log tam de verify

Them log tam trong qua trinh test:

- Khi nhan `getProducers`: count, kind, userId, producerId.
- Khi consume thanh cong: kind, producerId, userId, consumerId.
- Sau khi add track vao remote stream: audio/video track count.
- Trong `ParticipantTile`: streamKey va videoTrack id dang render.

## Test can chay

1. Tao group/SFU video call moi tu RN caller, RN callee accept lan dau.
2. Tao group/SFU video call moi tu RN caller, web callee accept de dam bao khong regression cross-client.
3. Tao group/SFU video call moi tu web caller, RN callee accept lan dau.
4. RN callee leave/rejoin de xac nhan van hoat dong.
5. Camera off/on trong SFU call de dam bao `RTCView` remount dung khi video track moi duoc produce.

## Tieu chi hoan thanh

- Lan dau tham gia SFU call tren RN nhan duoc video remote ma khong can rejoin.
- Khong con double `call:request`/`signal join` tu caller RN.
- Remote tile khong mount `RTCView` khi stream chua co video track.
- Web client khong bi thay doi.
