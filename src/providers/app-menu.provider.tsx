import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigations/MainStackNavigator';

/** Khớp tabBarStyle.height trong MainNavigator */
export const TAB_BAR_HEIGHT = 90;

type StackScreen = 'DocumentList' | 'TodoList' | 'DeckList';

type AppMenuContextValue = {
  openMenu: () => void;
  closeMenu: () => void;
  registerStackNavigation: (nav: NativeStackNavigationProp<MainStackParamList>) => void;
};

const AppMenuContext = createContext<AppMenuContextValue | null>(null);

export const useAppMenu = () => {
  const ctx = useContext(AppMenuContext);
  if (!ctx) {
    throw new Error('useAppMenu must be used within AppMenuProvider');
  }
  return ctx;
};

type MenuItem = {
  id: string;
  label: string;
  subtitle: string;
  icon: string;
  screen: StackScreen;
};

const MENU_ITEMS: MenuItem[] = [
  { id: 'docs', label: 'Tài liệu', subtitle: 'Tài liệu cộng tác', icon: 'book', screen: 'DocumentList' },
  { id: 'todo', label: 'Todo', subtitle: 'Quản lý công việc', icon: 'list-alt', screen: 'TodoList' },
  { id: 'flashcard', label: 'Flashcard', subtitle: 'Học từ vựng', icon: 'clone', screen: 'DeckList' },
];

export const AppMenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const stackNavigationRef = useRef<NativeStackNavigationProp<MainStackParamList> | null>(null);

  const closeMenu = useCallback(() => setVisible(false), []);

  const openMenu = useCallback(() => setVisible(true), []);

  const registerStackNavigation = useCallback(
    (nav: NativeStackNavigationProp<MainStackParamList>) => {
      stackNavigationRef.current = nav;
    },
    [],
  );

  const navigateTo = useCallback(
    (screen: StackScreen) => {
      closeMenu();
      const stackNav = stackNavigationRef.current;
      if (!stackNav) {
        console.warn('[AppMenu] Stack navigator chưa được đăng ký');
        return;
      }
      stackNav.navigate(screen);
    },
    [closeMenu],
  );

  const value = useMemo(
    () => ({ openMenu, closeMenu, registerStackNavigation }),
    [openMenu, closeMenu, registerStackNavigation],
  );

  const dropdownBottom = TAB_BAR_HEIGHT + insets.bottom;

  return (
    <AppMenuContext.Provider value={value}>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={closeMenu}>
        <Pressable style={styles.backdrop} onPress={closeMenu}>
          <Pressable
            style={[styles.dropdown, { bottom: dropdownBottom }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Tiện ích</Text>
              <TouchableOpacity onPress={closeMenu} hitSlop={12}>
                <FontAwesome name="times" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {MENU_ITEMS.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuItem, index < MENU_ITEMS.length - 1 && styles.menuItemBorder]}
                activeOpacity={0.7}
                onPress={() => navigateTo(item.screen)}
              >
                <View style={styles.menuIconWrap}>
                  <FontAwesome name={item.icon as any} size={20} color="#42A59F" />
                </View>
                <View style={styles.menuTextWrap}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <FontAwesome name="chevron-right" size={14} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </AppMenuContext.Provider>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  dropdown: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  menuIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E0F2F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
});
