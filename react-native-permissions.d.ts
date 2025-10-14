import 'react-native-permissions';

declare module 'react-native-permissions' {
  export namespace PERMISSIONS {
    export namespace ANDROID {
      export const POST_NOTIFICATIONS: import('react-native-permissions').Permission;
    }
    export namespace IOS {
      export const NOTIFICATIONS: import('react-native-permissions').Permission;
    }
  }
}
