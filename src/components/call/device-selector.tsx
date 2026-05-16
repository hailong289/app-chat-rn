import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import useCallStore from '../../store/useCallStore';

interface DeviceSelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

type DeviceType = 'audioInput' | 'audioOutput' | 'videoInput';

export function DeviceSelectorModal({ visible, onClose }: DeviceSelectorModalProps) {
  const { devices, getDevices, setDevice } = useCallStore();

  useEffect(() => {
    if (visible) void getDevices();
  }, [visible, getDevices]);

  const sections: Array<{ title: string; type: DeviceType; items: any[] }> = [
    { title: 'Microphone', type: 'audioInput', items: devices.audioInputs },
    { title: 'Loa (Đầu ra)', type: 'audioOutput', items: devices.audioOutputs },
    { title: 'Camera', type: 'videoInput', items: devices.videoInputs },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Thiết bị âm thanh / video</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {sections.map((section) => (
            <View key={section.type} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.items.length === 0 ? (
                <Text style={styles.emptyText}>Không có thiết bị</Text>
              ) : (
                <FlatList
                  data={section.items}
                  keyExtractor={(item) => item.deviceId}
                  scrollEnabled={false}
                  renderItem={({ item }) => {
                    const selectedKey =
                      section.type === 'audioInput'
                        ? 'selectedAudioInput'
                        : section.type === 'audioOutput'
                        ? 'selectedAudioOutput'
                        : 'selectedVideoInput';
                    const isSelected = devices[selectedKey] === item.deviceId;
                    return (
                      <TouchableOpacity
                        style={[styles.deviceItem, isSelected && styles.deviceItemSelected]}
                        onPress={() => {
                          void setDevice(section.type, item.deviceId);
                        }}
                      >
                        <Text style={styles.deviceLabel} numberOfLines={1}>
                          {item.label || item.deviceId}
                        </Text>
                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
            </View>
          ))}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1C1C2E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A3E',
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    color: '#AAB0BD',
    fontSize: 18,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    color: '#42A59F',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyText: {
    color: '#AAB0BD',
    fontSize: 13,
    paddingLeft: 8,
    paddingBottom: 8,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  deviceItemSelected: {
    backgroundColor: '#2A2A3E',
  },
  deviceLabel: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  checkmark: {
    color: '#42A59F',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
});
