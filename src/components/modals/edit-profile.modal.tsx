import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import { Toast } from 'toastify-react-native';
import useAuthStore from '@/src/store/useAuth';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
}) => {
  const { user, updateProfile, isLoading } = useAuthStore();
  const [fullname, setFullname] = useState(user?.fullname || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(
    (user?.gender as any) || 'other'
  );

  useEffect(() => {
    if (visible && user) {
      setFullname(user.fullname || '');
      setPhone(user.phone || '');
      setGender((user.gender as any) || 'other');
    }
  }, [visible, user]);

  const handleSave = () => {
    if (!fullname.trim()) {
      Toast.show({ type: 'error', text1: 'Vui lòng nhập họ tên' });
      return;
    }

    updateProfile({
      fullname,
      phone,
      gender,
      callback: (error: any) => {
        if (error) {
          Toast.show({ type: 'error', text1: 'Cập nhật thất bại' });
        } else {
          Toast.show({ type: 'success', text1: 'Cập nhật thành công' });
          onClose();
        }
      },
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <FontAwesome name="times" size={20} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Cập nhật hồ sơ</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Họ và tên</Text>
              <TextInput
                style={styles.input}
                value={fullname}
                onChangeText={setFullname}
                placeholder="Nhập họ và tên"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Số điện thoại</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Nhập số điện thoại"
                keyboardType="phone-pad"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Giới tính</Text>
              <View style={styles.genderContainer}>
                {['male', 'female', 'other'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderBtn,
                      gender === g && styles.genderBtnActive,
                    ]}
                    onPress={() => setGender(g as any)}
                  >
                    <Text
                      style={[
                        styles.genderText,
                        gender === g && styles.genderTextActive,
                      ]}
                    >
                      {g === 'male' ? 'Nam' : g === 'female' ? 'Nữ' : 'Khác'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
    maxHeight: '90%',
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
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    alignItems: 'center',
  },
  genderBtnActive: {
    backgroundColor: '#42A59F',
    borderColor: '#42A59F',
  },
  genderText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  genderTextActive: {
    color: '#fff',
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  saveBtn: {
    backgroundColor: '#42A59F',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
