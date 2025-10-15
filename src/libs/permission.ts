import { Platform } from "react-native";
import { check, PERMISSIONS, request, requestNotifications, RESULTS } from "react-native-permissions";


class Permission {
  /** Yêu cầu quyền thông báo */
  static async requestNotificationPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const status = await check(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
      if (status === RESULTS.GRANTED) {
        console.log('✅ Quyền thông báo đã được cấp');
        return true;
      }
      // Android 13 (API 33) trở lên mới cần quyền POST_NOTIFICATIONS
      const result = await request(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
      switch (result) {
        case RESULTS.GRANTED:
          console.log('✅ Quyền thông báo đã được cấp');
          break;
        case RESULTS.DENIED:
          console.log('⚠️ Người dùng từ chối quyền thông báo');
          break;
        case RESULTS.BLOCKED:
          console.log('🚫 Quyền bị chặn trong cài đặt hệ thống');
          break;
      }
    } else if (Platform.OS === 'ios') {
       const { status } = await requestNotifications(['alert', 'sound', 'badge']);
      console.log('Kết quả quyền thông báo iOS:', status);
    }
    return true;
  }
}

export default Permission;
