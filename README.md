# AppChatRN - React Native Chat ApplicationThis is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).



Ứng dụng chat được phát triển bằng React Native với UI hiện đại sử dụng GluestackUI và NativeWind.# Getting Started



## 🚀 Tính năng chính> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.



- **Xác thực người dùng**: Đăng nhập/Đăng ký với email hoặc số điện thoại## Step 1: Start Metro

- **UI hiện đại**: Sử dụng GluestackUI components với Tailwind CSS styling

- **Navigation**: React Navigation với Stack và Tab navigationFirst, you will need to run **Metro**, the JavaScript build tool for React Native.

- **Form validation**: Joi schema validation cho các form

- **Cross-platform**: Hỗ trợ cả iOS và AndroidTo start the Metro dev server, run the following command from the root of your React Native project:



## 🛠 Công nghệ sử dụng```sh

# Using npm

### Core Dependenciesnpm start

- **React Native**: 0.82.0

- **React**: 19.1.1# OR using Yarn

- **TypeScript**: 5.8.3yarn start

```

### UI & Styling

- **@gluestack-ui/core**: 3.0.10 - UI component library## Step 2: Build and run your app

- **NativeWind**: 4.1.23 - Tailwind CSS for React Native

- **TailwindCSS**: 3.4.17With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

- **React Native SVG**: 15.14.0 - SVG support

### Android

### Navigation

- **@react-navigation/native**: 7.1.18```sh

- **@react-navigation/stack**: 7.4.9# Using npm

- **@react-navigation/bottom-tabs**: 7.4.8npm run android

- **@react-navigation/native-stack**: 7.3.27

# OR using Yarn

### Animation & Gesturesyarn android

- **React Native Reanimated**: 4.1.0```

- **React Native Gesture Handler**: 2.28.0

- **@legendapp/motion**: 2.3.0### iOS



### Validation & UtilsFor iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

- **Joi**: 18.0.1 - Schema validation

- **React Native Safe Area Context**: 5.6.1The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

- **React Native Screens**: 4.16.0

```sh

## 📁 Cấu trúc dự ánbundle install

```

```

AppChatRN/Then, and every time you update your native dependencies, run:

├── src/

│   ├── assets/```sh

│   │   └── images/bundle exec pod install

│   │       └── logo.png```

│   ├── components/

│   │   └── home.component.tsxFor more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

│   ├── navigations/

│   │   ├── AppNavigator.tsx      # Root navigator```sh

│   │   ├── AuthNavigator.tsx     # Authentication screens# Using npm

│   │   └── MainNavigator.tsx     # Main app screensnpm run ios

│   ├── pages/

│   │   ├── auth/# OR using Yarn

│   │   │   ├── login.page.tsx    # Trang đăng nhậpyarn ios

│   │   │   └── register.page.tsx # Trang đăng ký```

│   │   ├── about.page.tsx

│   │   └── home.page.tsxIf everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

│   ├── providers/

│   └── schema/This is one way to run your app — you can also build it directly from Android Studio or Xcode.

│       └── login.schema.ts       # Joi validation schemas

├── components/## Step 3: Modify your app

│   └── ui/                       # GluestackUI components

│       ├── box/Now that you have successfully run the app, let's make changes!

│       ├── button/

│       ├── form-control/Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

│       ├── gluestack-ui-provider/

│       ├── icon/When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

│       ├── input/

│       └── vstack/- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).

├── android/                      # Android-specific files- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

├── ios/                         # iOS-specific files

├── App.tsx                      # App entry point## Congratulations! :tada:

├── global.css                   # Global styles

├── tailwind.config.js           # Tailwind configurationYou've successfully run and modified your React Native App. :partying_face:

└── package.json

```### Now what?



## 🔧 Cài đặt và chạy dự án- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).

- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

### Yêu cầu hệ thống

- Node.js >= 20# Troubleshooting

- React Native development environment

- Android Studio (cho Android)If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

- Xcode (cho iOS - chỉ trên macOS)

# Learn More

### Cài đặt dependencies

To learn more about React Native, take a look at the following resources:

```bash

# Clone project- [React Native Website](https://reactnative.dev) - learn more about React Native.

git clone <repository-url>- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.

cd AppChatRN- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.

- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.

# Cài đặt dependencies- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.

npm install

# iOS only - cài đặt pods
cd ios && pod install && cd ..
```

### Chạy ứng dụng

#### Khởi động Metro bundler
```bash
npm start
```

#### Chạy trên Android
```bash
npm run android
```

#### Chạy trên iOS
```bash
npm run ios
```

## 🎨 Theme và Styling

Dự án sử dụng hệ thống theme tùy chỉnh với các màu chính:

```javascript
colors: {
  primary: { 500: '#42A59F' },      // Màu chính
  secondary: { 500: '#51BEA1' },    // Màu phụ
  tertiary: { 500: '#A3F7B5' },     // Màu thứ ba
  error: { 500: '#f31261' },        // Màu lỗi
  success: { 500: '#17c964' },      // Màu thành công
  warning: { 500: '#FBBF24' },      // Màu cảnh báo
  info: { 500: '#3B82F6' },         // Màu thông tin
}
```

## 📱 Tính năng Authentication

### Đăng nhập
- Hỗ trợ đăng nhập bằng email hoặc số điện thoại Việt Nam
- Validation real-time với Joi schema
- Form validation với error messages tiếng Việt

### Đăng ký
- Form đăng ký với validation tương tự
- UI/UX nhất quán với trang đăng nhập

## 🛠 Scripts có sẵn

```bash
# Development
npm start                    # Khởi động Metro bundler
npm run android             # Chạy trên Android
npm run ios                 # Chạy trên iOS

# Maintenance
npm run android:clean       # Clean Android build
npm run android:remove:build # Xóa build folder Android
npm run android:remove:app  # Gỡ cài đặt app khỏi device

# Code Quality
npm run lint               # Chạy ESLint
npm run type-check        # Kiểm tra TypeScript
npm test                  # Chạy tests
```

## 🚧 Development

### Thêm màn hình mới
1. Tạo component trong `src/pages/`
2. Thêm route vào navigator tương ứng
3. Cập nhật type definitions nếu cần

### Tùy chỉnh theme
1. Chỉnh sửa `tailwind.config.js`
2. Cập nhật `components/ui/gluestack-ui-provider/config.ts`
3. Rebuild app để áp dụng thay đổi

## 📚 Tài liệu tham khảo

- [React Native Documentation](https://reactnative.dev)
- [GluestackUI Documentation](https://gluestack.io)
- [NativeWind Documentation](https://nativewind.dev)
- [React Navigation](https://reactnavigation.org)
- [Joi Validation](https://joi.dev)

## 🤝 Đóng góp

1. Fork dự án
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit thay đổi (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## 📄 License

Dự án này được phát triển cho mục đích học tập và nghiên cứu.