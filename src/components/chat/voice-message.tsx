import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { ObjectId } from 'bson';
import type { FilePreview } from '../../types/message.type';

type VoiceMessageProps = {
  visible: boolean;
  onClose: () => void;
  onSend: (filePreview: FilePreview) => void;
};

type RecordState = 'idle' | 'recording' | 'paused' | 'done';

function formatMMSS(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const audioRecorderPlayer = new AudioRecorderPlayer();

export const VoiceMessage: React.FC<VoiceMessageProps> = ({
  visible,
  onClose,
  onSend,
}) => {
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [durationMs, setDurationMs] = useState(0);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [playDuration, setPlayDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordPath, setRecordPath] = useState<string | null>(null);

  // Waveform animation
  const waveAnim = useRef<Animated.Value[]>(
    Array.from({ length: 20 }, () => new Animated.Value(4)),
  ).current;
  const waveLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const startWave = useCallback(() => {
    const animations = waveAnim.map((val, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 60),
          Animated.timing(val, {
            toValue: 4 + Math.random() * 20,
            duration: 250,
            useNativeDriver: false,
          }),
          Animated.timing(val, {
            toValue: 4,
            duration: 250,
            useNativeDriver: false,
          }),
        ]),
      ),
    );
    waveLoopRef.current = Animated.parallel(animations);
    waveLoopRef.current.start();
  }, [waveAnim]);

  const stopWave = useCallback(() => {
    waveLoopRef.current?.stop();
    waveAnim.forEach(v => v.setValue(4));
  }, [waveAnim]);

  const requestMicPermission = async (): Promise<boolean> => {
    const perm =
      Platform.OS === 'android'
        ? PERMISSIONS.ANDROID.RECORD_AUDIO
        : PERMISSIONS.IOS.MICROPHONE;
    const status = await check(perm);
    if (status === RESULTS.GRANTED) return true;
    const result = await request(perm);
    return result === RESULTS.GRANTED;
  };

  const handleStartRecord = async () => {
    const granted = await requestMicPermission();
    if (!granted) {
      Alert.alert('Quyền micro', 'Cần quyền micro để ghi âm.');
      return;
    }
    try {
      const path = `recording_${Date.now()}.m4a`;
      await audioRecorderPlayer.startRecorder(path);
      setRecordPath(path);
      setRecordState('recording');
      setDurationMs(0);
      audioRecorderPlayer.addRecordBackListener(e => {
        setDurationMs(e.currentPosition);
      });
      startWave();
    } catch (e) {
      console.warn('startRecorder error', e);
    }
  };

  const handlePauseRecord = async () => {
    await audioRecorderPlayer.pauseRecorder();
    setRecordState('paused');
    stopWave();
  };

  const handleResumeRecord = async () => {
    await audioRecorderPlayer.resumeRecorder();
    setRecordState('recording');
    startWave();
  };

  const handleStopRecord = async () => {
    try {
      await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      setRecordState('done');
      stopWave();
    } catch (e) {
      console.warn('stopRecorder error', e);
    }
  };

  const handlePlayPreview = async () => {
    if (!recordPath || isPlaying) return;
    setIsPlaying(true);
    await audioRecorderPlayer.startPlayer(recordPath);
    audioRecorderPlayer.addPlayBackListener(e => {
      setCurrentPosition(e.currentPosition);
      setPlayDuration(e.duration);
      if (e.currentPosition >= e.duration) {
        setIsPlaying(false);
        audioRecorderPlayer.removePlayBackListener();
      }
    });
  };

  const handleStopPlay = async () => {
    await audioRecorderPlayer.stopPlayer();
    audioRecorderPlayer.removePlayBackListener();
    setIsPlaying(false);
    setCurrentPosition(0);
  };

  const handleSend = () => {
    if (!recordPath) return;
    const filePreview: FilePreview = {
      _id: new ObjectId().toHexString(),
      kind: 'audio',
      url: recordPath,
      name: `voice_${Date.now()}.m4a`,
      size: 0,
      mimeType: 'audio/m4a',
      duration: durationMs,
      status: 'pending',
      uploadProgress: 0,
    };
    onSend(filePreview);
    handleReset();
  };

  const handleReset = () => {
    audioRecorderPlayer.removeRecordBackListener();
    audioRecorderPlayer.removePlayBackListener();
    setRecordState('idle');
    setDurationMs(0);
    setCurrentPosition(0);
    setPlayDuration(0);
    setIsPlaying(false);
    setRecordPath(null);
    stopWave();
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  useEffect(() => {
    if (!visible) handleReset();
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Ghi âm tin nhắn</Text>
            <TouchableOpacity onPress={handleClose}>
              <FontAwesome name="times" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Duration */}
          <Text style={styles.duration}>
            {recordState === 'done' && isPlaying
              ? `${formatMMSS(currentPosition)} / ${formatMMSS(playDuration || durationMs)}`
              : formatMMSS(durationMs)}
          </Text>

          {/* Waveform */}
          <View style={styles.waveContainer}>
            {waveAnim.map((val, i) => (
              <Animated.View
                key={i}
                style={[styles.wavebar, { height: val }]}
              />
            ))}
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            {recordState === 'idle' && (
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={handleStartRecord}
              >
                <FontAwesome name="microphone" size={22} color="#fff" />
                <Text style={styles.btnText}>Bắt đầu ghi</Text>
              </TouchableOpacity>
            )}

            {recordState === 'recording' && (
              <>
                <TouchableOpacity
                  style={[styles.btn, styles.btnWarning]}
                  onPress={handlePauseRecord}
                >
                  <FontAwesome name="pause" size={18} color="#fff" />
                  <Text style={styles.btnText}>Tạm dừng</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnDanger]}
                  onPress={handleStopRecord}
                >
                  <FontAwesome name="stop" size={18} color="#fff" />
                  <Text style={styles.btnText}>Dừng</Text>
                </TouchableOpacity>
              </>
            )}

            {recordState === 'paused' && (
              <>
                <TouchableOpacity
                  style={[styles.btn, styles.btnSuccess]}
                  onPress={handleResumeRecord}
                >
                  <FontAwesome name="play" size={18} color="#fff" />
                  <Text style={styles.btnText}>Tiếp tục</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnDanger]}
                  onPress={handleStopRecord}
                >
                  <FontAwesome name="stop" size={18} color="#fff" />
                  <Text style={styles.btnText}>Dừng</Text>
                </TouchableOpacity>
              </>
            )}

            {recordState === 'done' && (
              <>
                <TouchableOpacity
                  style={[styles.btn, isPlaying ? styles.btnWarning : styles.btnPrimary]}
                  onPress={isPlaying ? handleStopPlay : handlePlayPreview}
                >
                  <FontAwesome name={isPlaying ? 'pause' : 'play'} size={18} color="#fff" />
                  <Text style={styles.btnText}>{isPlaying ? 'Dừng nghe' : 'Nghe lại'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnGray]}
                  onPress={handleReset}
                >
                  <FontAwesome name="trash" size={18} color="#fff" />
                  <Text style={styles.btnText}>Xóa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnSuccess]}
                  onPress={handleSend}
                >
                  <FontAwesome name="send" size={18} color="#fff" />
                  <Text style={styles.btnText}>Gửi</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  duration: {
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
    color: '#111827',
    marginBottom: 20,
    fontVariant: ['tabular-nums'],
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    gap: 3,
    marginBottom: 28,
  },
  wavebar: {
    width: 4,
    backgroundColor: '#6366f1',
    borderRadius: 2,
    minHeight: 4,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 100,
    justifyContent: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  btnPrimary: { backgroundColor: '#6366f1' },
  btnWarning: { backgroundColor: '#f59e0b' },
  btnDanger: { backgroundColor: '#ef4444' },
  btnSuccess: { backgroundColor: '#22c55e' },
  btnGray: { backgroundColor: '#6b7280' },
});

export default VoiceMessage;
