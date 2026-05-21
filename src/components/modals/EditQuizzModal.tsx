import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  StyleSheet,
} from 'react-native';
import QuizzService from '../../service/quizz.service';
import { QuizzQuestion, QuizzResponse } from '../../types/quizz.type';
import QuizQuestionsList from './QuizQuestionsList';
import { getQuizApiId } from '../../libs/helpers';
import { useSocket } from '../../providers/socket.provider';
import useMessageStore from '../../store/useMessage';
import { resolveCanonicalRoomId } from '../../libs/normalize-socket-message';
import QuizDateTimeField, {
  getDefaultQuizEndTime,
  getDefaultQuizStartTime,
  parseQuizDateTime,
} from '../ui/quiz-datetime-field';

interface EditQuizzModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: QuizzResponse;
  onUpdated?: (updated: QuizzResponse) => void;
  roomId?: string;
}

export default function EditQuizzModal({
  isOpen,
  onClose,
  quiz,
  onUpdated,
  roomId,
}: EditQuizzModalProps) {
  const { socket } = useSocket('/chat');
  const { updateQuizInMessages } = useMessageStore();
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDesc, setQuizDesc] = useState('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [allowRetake, setAllowRetake] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState('1');
  const [questions, setQuestions] = useState<QuizzQuestion[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Populate form when quiz changes or modal opens
  useEffect(() => {
    if (isOpen && quiz) {
      setQuizTitle(quiz.quiz_title || '');
      setQuizDesc(quiz.quiz_description || '');
      const parsedStart = parseQuizDateTime(quiz.quiz_startTime);
      const parsedEnd = parseQuizDateTime(quiz.quiz_endTime);
      const defaultStart = parsedStart ?? getDefaultQuizStartTime();
      setStartTime(defaultStart);
      setEndTime(parsedEnd ?? getDefaultQuizEndTime(defaultStart));
      setAllowRetake(quiz.quiz_allowRetake ?? false);
      setMaxAttempts(String(quiz.quiz_maxAttempts ?? 1));
      setQuestions(quiz.quiz_questions || []);
    }
  }, [isOpen, quiz]);

  const handleSave = useCallback(async () => {
    if (!quizTitle.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề quiz');
      return;
    }
    if (questions.length === 0) {
      Alert.alert('Lỗi', 'Quiz cần ít nhất 1 câu hỏi');
      return;
    }
    if (startTime && endTime && startTime >= endTime) {
      Alert.alert('Lỗi', 'Thời gian bắt đầu phải trước thời gian kết thúc');
      return;
    }

    setIsSaving(true);
    try {
      const quizApiId = getQuizApiId(quiz);
      const payload: any = {
        quiz_title: quizTitle.trim(),
        quiz_description: quizDesc.trim(),
        quiz_questions: questions,
        quiz_allowRetake: allowRetake,
        quiz_maxAttempts: allowRetake ? parseInt(maxAttempts) || 1 : undefined,
      };
      if (startTime) payload.quiz_startTime = startTime.toISOString();
      if (endTime) payload.quiz_endTime = endTime.toISOString();

      const res = await QuizzService.updateQuizz(quizApiId, payload);
      const updated: QuizzResponse = (res as any)?.data?.metadata || { ...quiz, ...payload };
      // Sync to messages and other clients
      if (roomId) {
        const canonicalRoomId = resolveCanonicalRoomId(roomId);
        const quizMongoId = quiz._id || quiz.id || quizApiId;
        updateQuizInMessages(canonicalRoomId, quizMongoId, payload);
        socket?.emit('update:quiz', { roomId: canonicalRoomId, quizId: quizMongoId, payload });
      }
      onUpdated?.(updated);
      onClose();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể cập nhật quiz');
    } finally {
      setIsSaving(false);
    }
  }, [
    quizTitle, quizDesc, questions, startTime, endTime,
    allowRetake, maxAttempts, quiz, onUpdated, onClose,
  ]);

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="slide">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.cancelText}>Hủy</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chỉnh sửa Quiz</Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving} style={styles.headerBtn}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#42A59F" />
            ) : (
              <Text style={styles.saveText}>Lưu</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Title */}
          <Text style={styles.label}>Tiêu đề</Text>
          <TextInput
            style={styles.input}
            placeholder="Tiêu đề quiz"
            placeholderTextColor="#9CA3AF"
            value={quizTitle}
            onChangeText={setQuizTitle}
          />

          {/* Description */}
          <Text style={styles.label}>Mô tả</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Mô tả (tuỳ chọn)"
            placeholderTextColor="#9CA3AF"
            value={quizDesc}
            onChangeText={setQuizDesc}
            multiline
          />

          {/* Start / End time */}
          <View style={styles.row}>
            <QuizDateTimeField
              label="Bắt đầu"
              value={startTime}
              onChange={(date) => {
                setStartTime(date);
                if (date && endTime && endTime <= date) {
                  setEndTime(getDefaultQuizEndTime(date));
                }
              }}
              placeholder="Chọn thời gian bắt đầu"
              compact
            />
            <View style={styles.spacer} />
            <QuizDateTimeField
              label="Kết thúc"
              value={endTime}
              onChange={setEndTime}
              minimumDate={startTime ?? undefined}
              placeholder="Chọn thời gian kết thúc"
              compact
            />
          </View>

          {/* Allow retake */}
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Cho phép làm lại</Text>
            <Switch value={allowRetake} onValueChange={setAllowRetake} />
          </View>
          {allowRetake && (
            <View style={styles.maxAttemptsRow}>
              <Text style={styles.label}>Số lần tối đa</Text>
              <TextInput
                style={[styles.input, styles.narrowInput]}
                keyboardType="numeric"
                value={maxAttempts}
                onChangeText={setMaxAttempts}
              />
            </View>
          )}

          {/* Questions */}
          <Text style={[styles.label, styles.questionsLabel]}>
            Câu hỏi ({questions.length})
          </Text>
          <QuizQuestionsList questions={questions} onChange={setQuestions} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  headerBtn: {
    minWidth: 50,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  cancelText: {
    fontSize: 15,
    color: '#6b7280',
  },
  saveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#42A59F',
    textAlign: 'right',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  multiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  narrowInput: {
    width: 80,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  flex1: {
    flex: 1,
  },
  spacer: {
    width: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginTop: 4,
  },
  switchLabel: {
    fontSize: 14,
    color: '#374151',
  },
  maxAttemptsRow: {
    marginBottom: 8,
  },
  questionsLabel: {
    fontSize: 15,
    marginTop: 16,
    marginBottom: 8,
  },
});
