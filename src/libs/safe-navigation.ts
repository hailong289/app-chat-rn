import type { NavigationProp, ParamListBase } from '@react-navigation/native';

/**
 * Leave Call screen safely — avoids "GO_BACK was not handled" when stack is empty.
 */
export function exitCallScreen(
  navigation: NavigationProp<ParamListBase>,
): void {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }
  // Fallback: main tab (home) when Call was opened without stack history
  navigation.navigate('Main' as never);
}

/** Root ref: open Call inside MainStack */
export function navigateToCallScreen(
  navigationRef: { navigate: (name: string, params?: object) => void } | null,
  params: Record<string, unknown>,
): void {
  if (!navigationRef?.navigate) return;
  navigationRef.navigate('MainStack', {
    screen: 'Call',
    params,
  });
}
