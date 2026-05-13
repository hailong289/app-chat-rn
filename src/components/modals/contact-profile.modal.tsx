import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import { User } from '@/src/types/user.type';
import useContactStore from '@/src/store/useContact';
import { Toast } from 'toastify-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '@/src/navigations/MainStackNavigator';

interface ContactProfileModalProps {
  visible: boolean;
  onClose: () => void;
  user: User | null;
}

export const ContactProfileModal: React.FC<ContactProfileModalProps> = ({
  visible,
  onClose,
  user,
}) => {
  const { blockFriend, unblockFriend } = useContactStore();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  if (!user) return null;

  const isFriend = user.friendship?.status === 'ACCEPTED';
  const isBlocked = user.friendship?.status === 'BLOCKED';

  const handleMessage = () => {
    onClose();
    // Navigate to Chat, you will need a function to get or create direct room.
    // For now we assume we can pass userId to Chat screen to create room if not exists
    navigation.navigate('Chat', { receiverId: user.id } as any);
  };



  const handleToggleBlock = async () => {
    if (isBlocked) {
      await unblockFriend(user.id);
      Toast.show({ type: 'success', text1: 'Đã bỏ chặn' });
    } else {
      await blockFriend(user.id);
      Toast.show({ type: 'success', text1: 'Đã chặn người dùng' });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <FontAwesome name="times" size={20} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Thông tin liên hệ</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.avatarSection}>
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <FontAwesome name="user" size={40} color="#42A59F" />
                </View>
              )}
              <Text style={styles.fullname}>{user.fullname}</Text>
              {user.slug && <Text style={styles.slug}>@{user.slug}</Text>}
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleMessage}>
                <View style={styles.actionIconWrapper}>
                  <FontAwesome name="comment" size={20} color="#42A59F" />
                </View>
                <Text style={styles.actionText}>Nhắn tin</Text>
              </TouchableOpacity>
              


              <TouchableOpacity style={styles.actionBtn} onPress={handleToggleBlock}>
                <View style={[styles.actionIconWrapper, { backgroundColor: '#fef2f2' }]}>
                  <FontAwesome name="ban" size={20} color="#ef4444" />
                </View>
                <Text style={[styles.actionText, { color: '#ef4444' }]}>
                  {isBlocked ? 'Bỏ chặn' : 'Chặn'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
              {user.email && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{user.email}</Text>
                </View>
              )}
              {user.phone && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Điện thoại</Text>
                  <Text style={styles.infoValue}>{user.phone}</Text>
                </View>
              )}
              {user.gender && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Giới tính</Text>
                  <Text style={styles.infoValue}>
                    {user.gender === 'male' ? 'Nam' : user.gender === 'female' ? 'Nữ' : 'Khác'}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeBtn: {
    padding: 8,
    width: 40,
    alignItems: 'flex-start',
  },
  content: {
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e6f3f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  fullname: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  slug: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 30,
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  actionBtn: {
    alignItems: 'center',
  },
  actionIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e6f3f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  infoSection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
});
