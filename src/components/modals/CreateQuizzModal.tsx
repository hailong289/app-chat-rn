import React, { useState, useCallback } from "react";
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
} from "react-native";
import { launchImageLibrary } from "react-native-image-picker";
import QuizzService from "../../service/quizz.service";
import { QuizzQuestion, QuizzResponse, QuizzType } from "../../types/quizz.type";
import QuizQuestionsList from "./QuizQuestionsList";

interface CreateQuizzModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId?: string;
  userId?: string;
}

type Phase = "config" | "preview";

export default function CreateQuizzModal({ isOpen, onClose, roomId, userId }: CreateQuizzModalProps) {
  const [phase, setPhase] = useState<Phase>("config");
  const [inputType, setInputType] = useState<"text" | "file">("text");
  const [questionType, setQuestionType] = useState<QuizzType>("single_choice");
  const [textContent, setTextContent] = useState("");
  const [fileAsset, setFileAsset] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [numberOfQuestions, setNumberOfQuestions] = useState("5");
  const [totalScore, setTotalScore] = useState("10");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState("");

  // Preview state
  const [questions, setQuestions] = useState<QuizzQuestion[]>([]);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDesc, setQuizDesc] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [allowRetake, setAllowRetake] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState("1");
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setPhase("config");
    setInputType("text");
    setTextContent("");
    setFileAsset(null);
    setNumberOfQuestions("5");
    setTotalScore("10");
    setGenProgress("");
    setQuestions([]);
    setQuizTitle("");
    setQuizDesc("");
    setStartTime("");
    setEndTime("");
    setAllowRetake(false);
    setMaxAttempts("1");
  };

  const handlePickFile = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: "mixed",
        selectionLimit: 1,
      });
      if (result.assets?.[0]) {
        const a = result.assets[0];
        setFileAsset({
          uri: a.uri || "",
          name: a.fileName || "file",
          type: a.type || "application/octet-stream",
        });
      }
    } catch {
      Alert.alert("Lỗi", "Không thể chọn file");
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (inputType === "text" && !textContent.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập nội dung");
      return;
    }
    if (inputType === "file" && !fileAsset) {
      Alert.alert("Lỗi", "Vui lòng chọn file");
      return;
    }

    setIsGenerating(true);
    setGenProgress("Đang tạo quiz...");
    try {
      const payload: any = {
        type: "document",
        question_type: questionType,
        question_max_points: parseInt(totalScore) || 10,
        question_max: parseInt(numberOfQuestions) || 5,
      };

      if (inputType === "text") {
        payload.text = textContent.trim();
      } else if (fileAsset) {
        const form = new FormData();
        form.append("file", { uri: fileAsset.uri, name: fileAsset.name, type: fileAsset.type } as any);
        form.append("type", "document");
        form.append("question_type", questionType);
        form.append("question_max_points", String(parseInt(totalScore) || 10));
        form.append("question_max", String(parseInt(numberOfQuestions) || 5));
        const result = await QuizzService.generateQuizz(form, {
          onChunk: (chunk) => setGenProgress((prev) => prev + "."),
        });
        const generatedQuestions = result.data?.metadata?.quiz_questions || [];
        setQuestions(generatedQuestions);
        setQuizTitle("");
        setQuizDesc("");
        setPhase("preview");
        setIsGenerating(false);
        return;
      }

      const result = await QuizzService.generateQuizz(payload, {
        onChunk: (_chunk) => setGenProgress((prev) => prev + "."),
      });
      const generatedQuestions = result.data?.metadata?.quiz_questions || [];
      setQuestions(generatedQuestions);
      setQuizTitle("");
      setQuizDesc("");
      setPhase("preview");
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Tạo quiz thất bại");
    } finally {
      setIsGenerating(false);
      setGenProgress("");
    }
  }, [inputType, textContent, fileAsset, questionType, numberOfQuestions, totalScore]);

  const handleSave = useCallback(async () => {
    if (!quizTitle.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tiêu đề quiz");
      return;
    }
    if (questions.length === 0) {
      Alert.alert("Lỗi", "Quiz cần ít nhất 1 câu hỏi");
      return;
    }
    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
      Alert.alert("Lỗi", "Thời gian bắt đầu phải trước thời gian kết thúc");
      return;
    }
    if (!roomId || !userId) {
      Alert.alert("Lỗi", "Thiếu thông tin phòng hoặc người dùng");
      return;
    }

    setIsSaving(true);
    try {
      await QuizzService.createQuizz({
        quiz_title: quizTitle.trim(),
        quiz_description: quizDesc.trim(),
        quiz_status: "active",
        quiz_roomId: roomId,
        quiz_createdBy: userId,
        quiz_questions: questions,
        quiz_startTime: startTime || undefined,
        quiz_endTime: endTime || undefined,
        quiz_allowRetake: allowRetake,
        quiz_maxAttempts: allowRetake ? parseInt(maxAttempts) || 1 : undefined,
      });
      resetForm();
      onClose();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thể lưu quiz");
    } finally {
      setIsSaving(false);
    }
  }, [quizTitle, quizDesc, questions, startTime, endTime, allowRetake, maxAttempts, roomId, userId]);

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="slide">
      <View className="flex-1 bg-white dark:bg-gray-900">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 pt-12">
          <TouchableOpacity onPress={() => { resetForm(); onClose(); }}>
            <Text className="text-primary-500 text-base">Đóng</Text>
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            {phase === "config" ? "Tạo Quiz" : "Xem trước"}
          </Text>
          {phase === "preview" ? (
            <TouchableOpacity onPress={handleSave} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color="#42A59F" />
              ) : (
                <Text className="text-primary-500 text-base font-semibold">Lưu</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={{ width: 50 }} />
          )}
        </View>

        <ScrollView className="flex-1 px-4">
          {phase === "config" ? (
            <View className="py-4">
              {/* Input type selector */}
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nguồn nội dung</Text>
              <View className="flex-row bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-4">
                {(["text", "file"] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    className={`flex-1 py-2 rounded-lg ${inputType === t ? "bg-white dark:bg-gray-700 shadow-sm" : ""}`}
                    onPress={() => setInputType(t)}
                  >
                    <Text className={`text-center text-sm ${inputType === t ? "text-primary-500 font-medium" : "text-gray-500"}`}>
                      {t === "text" ? "Văn bản" : "File"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {inputType === "text" ? (
                <TextInput
                  className="border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white mb-4"
                  placeholder="Nhập nội dung để tạo quiz..."
                  placeholderTextColor="#9CA3AF"
                  value={textContent}
                  onChangeText={setTextContent}
                  multiline
                  textAlignVertical="top"
                  style={{ minHeight: 120 }}
                />
              ) : (
                <TouchableOpacity
                  className="border border-dashed border-gray-400 dark:border-gray-600 rounded-xl p-6 items-center mb-4"
                  onPress={handlePickFile}
                >
                  <Text className="text-3xl mb-2">📄</Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400">
                    {fileAsset ? fileAsset.name : "Chọn file (.pdf, .doc, .txt)"}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Question type */}
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Loại câu hỏi</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {([
                  { v: "single_choice" as QuizzType, l: "Một đáp án" },
                  { v: "multiple_choice" as QuizzType, l: "Nhiều đáp án" },
                  { v: "true_false" as QuizzType, l: "Đúng/Sai" },
                  { v: "text" as QuizzType, l: "Tự luận" },
                ]).map((t) => (
                  <TouchableOpacity
                    key={t.v}
                    className={`px-4 py-2 rounded-full ${questionType === t.v ? "bg-primary-500" : "bg-gray-100 dark:bg-gray-700"}`}
                    onPress={() => setQuestionType(t.v)}
                  >
                    <Text className={`text-sm ${questionType === t.v ? "text-white" : "text-gray-700 dark:text-gray-300"}`}>
                      {t.l}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View className="flex-row gap-4 mb-4">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Số câu hỏi</Text>
                  <TextInput
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                    keyboardType="numeric"
                    value={numberOfQuestions}
                    onChangeText={setNumberOfQuestions}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tổng điểm</Text>
                  <TextInput
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                    keyboardType="numeric"
                    value={totalScore}
                    onChangeText={setTotalScore}
                  />
                </View>
              </View>

              <TouchableOpacity
                className="py-4 bg-primary-500 rounded-xl items-center"
                onPress={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <View className="items-center">
                    <ActivityIndicator color="white" />
                    <Text className="text-white text-xs mt-1">{genProgress}</Text>
                  </View>
                ) : (
                  <Text className="text-white text-base font-semibold">🤖 Tạo Quiz với AI</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* Preview Phase */
            <View className="py-4">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tiêu đề</Text>
              <TextInput
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white mb-3"
                placeholder="Tiêu đề quiz"
                placeholderTextColor="#9CA3AF"
                value={quizTitle}
                onChangeText={setQuizTitle}
              />
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mô tả</Text>
              <TextInput
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white mb-3"
                placeholder="Mô tả"
                placeholderTextColor="#9CA3AF"
                value={quizDesc}
                onChangeText={setQuizDesc}
                multiline
              />

              <View className="flex-row gap-4 mb-3">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bắt đầu</Text>
                  <TextInput
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                    placeholder="YYYY-MM-DD HH:mm"
                    placeholderTextColor="#9CA3AF"
                    value={startTime}
                    onChangeText={setStartTime}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kết thúc</Text>
                  <TextInput
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                    placeholder="YYYY-MM-DD HH:mm"
                    placeholderTextColor="#9CA3AF"
                    value={endTime}
                    onChangeText={setEndTime}
                  />
                </View>
              </View>

              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-sm text-gray-700 dark:text-gray-300">Cho phép làm lại</Text>
                <Switch value={allowRetake} onValueChange={setAllowRetake} />
              </View>
              {allowRetake && (
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Số lần tối đa</Text>
                  <TextInput
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white w-24"
                    keyboardType="numeric"
                    value={maxAttempts}
                    onChangeText={setMaxAttempts}
                  />
                </View>
              )}

              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Câu hỏi ({questions.length})
              </Text>
              <QuizQuestionsList questions={questions} onChange={setQuestions} />
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
