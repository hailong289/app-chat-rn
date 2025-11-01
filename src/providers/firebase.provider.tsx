import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
} from 'react';
import messaging from '@react-native-firebase/messaging';
import { Alert } from 'react-native';
import Permission from '../libs/permission';
import { FirebaseContextType } from '../types/firebase.type';
import notifee, { AndroidStyle } from '@notifee/react-native';

export const FirebaseContext = createContext<FirebaseContextType>({
  fcmToken: null,
});
export const FirebaseProvider = ({ children }: { children: ReactNode }) => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    const initFirebase = async () => {
      try {
        // Xin quyền thông báo
        await Permission.requestNotificationPermission();
        // Lấy token FCM
        const token = await messaging().getToken();
        setFcmToken(token);
        console.log('📱 FCM Token:', token);
        // Lắng nghe token refresh
        const unsubscribeToken = messaging().onTokenRefresh(setFcmToken);
        // Lắng nghe thông báo foreground
        const unsubscribeMessage = messaging().onMessage(async remoteMessage => {
          const { title, body } = remoteMessage.notification || {};
          console.log('📩 Foreground message:', remoteMessage);
          await notifee.displayNotification({
            title: title || 'Thông báo',
            body: body || '',
            android: {
              channelId: 'default',
              smallIcon: 'ic_launcher',
              color: '#0E1AFA',
              pressAction: { id: 'open-chat' },
              style: {
                type: AndroidStyle.BIGPICTURE,
                picture: require('@/src/assets/images/logo.png'), // Đường dẫn đến ảnh
              },
            },
            data: remoteMessage.data || {}, // có thể dùng để điều hướng khi click
          });
        });

        return () => {
          unsubscribeToken();
          unsubscribeMessage();
        };
      } catch (err) {
        console.error('Firebase init error:', err);
      }
    };

    initFirebase();
  }, []);

  return (
    <FirebaseContext.Provider value={{ fcmToken }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => useContext(FirebaseContext);
