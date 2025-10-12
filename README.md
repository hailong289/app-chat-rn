# AppChatRN

Ứng dụng chat mobile bằng React Native, sử dụng GluestackUI + NativeWind cho UI hiện đại và React Navigation cho điều hướng.

---

## Tổng quan
- Mục tiêu: Ứng dụng chat nhẹ, đa nền tảng (iOS & Android) với UI đẹp, dễ mở rộng.
- UI: GluestackUI (component primitives) + NativeWind (Tailwind cho React Native).
- Ngôn ngữ: TypeScript.

---

## Tính năng chính
- Danh sách tin nhắn, trạng thái (stories)
- Mục cài đặt / profile
- Xác thực người dùng (email / số điện thoại)
- Validation form với Joi
- Phong cách theme sẵn sàng tuỳ chỉnh

---

## Thư viện chính
- React Native
- React (18+/19+)
- TypeScript
- @gluestack-ui/core
- nativewind
- @react-navigation/native, bottom-tabs, native-stack
- react-native-safe-area-context
- react-native-reanimated, react-native-gesture-handler
- joi

---

## Yêu cầu môi trường
- Node.js >= 20
- Android Studio (Android)
- Xcode (iOS, macOS)
- Ruby + CocoaPods (iOS)

---

## Cài đặt & chạy

1. Cài dependencies
```bash
npm install
# hoặc
yarn
```

2. (iOS) cài pods
```bash
cd ios
bundle install # nếu cần
pod install
cd ..
```

3. Chạy Metro
```bash
npm start
```

4. Chạy app trên device/emulator
```bash
npm run android
# hoặc
npm run ios

## Scripts hữu ích
- npm start — khởi Metro
- npm run android — build & chạy Android
- npm run ios — build & chạy iOS
- npm run lint — ESLint
- npm run type-check — TypeScript check
- npm test — chạy unit tests

---

## Cấu trúc dự án (tóm tắt)
- src/
  - assets/ — hình ảnh, icon
  - components/ — UI primitives (Box, HStack, VStack, Icon, ...)
  - navigations/ — AppNavigator, MainNavigator, AuthNavigator
  - pages/ — home.page.tsx, home, profile, about, auth
  - providers/ — gluestack / theme provider
  - schema/ — Joi schemas
- ios/, android/, App.tsx, tailwind.config.js

---

## Ghi chú phát triển
- Dùng GluestackUI component primitives kết hợp className (Tailwind) để nhất quán.
- Theme colors nằm trong `tailwind.config.js` và `src/components/ui/gluestack-ui-provider/config.ts`.
- Luôn dùng SafeAreaView với `flex-1` và edges phù hợp để tránh UI chồng status bar.
- Danh sách map phải có key duy nhất (sử dụng id ổn định).

---

## Thực hành tốt
- Sử dụng id duy nhất cho list items để tránh warning React.
- Tách layout (UI) và logic (API/service).
- Viết unit tests cho validator và các util.

---

## Đóng góp
1. Fork repository
2. Tạo branch feature: `git checkout -b feature/ABC`
3. Commit, push và mở Pull Request

---
