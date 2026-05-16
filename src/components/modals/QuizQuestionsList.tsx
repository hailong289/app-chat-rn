import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { QuizzQuestion, QuizzType } from "../../types/quizz.type";

interface QuizQuestionsListProps {
  questions: QuizzQuestion[];
  onChange: (questions: QuizzQuestion[]) => void;
  isEditing?: boolean;
}

const QUESTION_TYPES: { value: QuizzType; label: string }[] = [
  { value: "single_choice", label: "Một đáp án" },
  { value: "multiple_choice", label: "Nhiều đáp án" },
  { value: "true_false", label: "Đúng/Sai" },
  { value: "text", label: "Tự luận" },
];

function QuestionEditor({
  question,
  index,
  onChange,
  onDelete,
}: {
  question: QuizzQuestion;
  index: number;
  onChange: (q: QuizzQuestion) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const updateField = <K extends keyof QuizzQuestion>(key: K, value: QuizzQuestion[K]) => {
    onChange({ ...question, [key]: value });
  };

  const addAnswer = () => {
    const newAnswers = [...question.answers, { answer_text: "", is_correct: false, points: 0 }];
    updateField("answers", newAnswers);
  };

  const updateAnswer = (i: number, field: string, value: any) => {
    const newAnswers = question.answers.map((a, idx) =>
      idx === i ? { ...a, [field]: value } : a
    );
    updateField("answers", newAnswers);
  };

  const removeAnswer = (i: number) => {
    updateField("answers", question.answers.filter((_, idx) => idx !== i));
  };

  const toggleCorrect = (i: number) => {
    if (question.question_type === "single_choice" || question.question_type === "true_false") {
      const newAnswers = question.answers.map((a, idx) => ({
        ...a,
        is_correct: idx === i,
      }));
      updateField("answers", newAnswers);
    } else {
      updateAnswer(i, "is_correct", !question.answers[i].is_correct);
    }
  };

  const isTextType = question.question_type === "text";

  return (
    <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 border border-gray-200 dark:border-gray-700">
      <View className="flex-row items-center justify-between mb-2">
        <TouchableOpacity onPress={() => setExpanded(!expanded)} className="flex-row items-center flex-1">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mr-2">
            Câu {index + 1}
          </Text>
          <Text className="text-xs text-gray-400">{expanded ? "▼" : "▶"}</Text>
        </TouchableOpacity>
        <View className="flex-row items-center gap-2">
          {/* Type selector */}
          <View className="flex-row bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
            {QUESTION_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                className={`px-2 py-1 ${question.question_type === t.value ? "bg-primary-500" : ""}`}
                onPress={() => {
                  updateField("question_type", t.value);
                  if (t.value === "true_false") {
                    updateField("answers", [
                      { answer_text: "Đúng", is_correct: true, points: 0 },
                      { answer_text: "Sai", is_correct: false, points: 0 },
                    ]);
                  }
                  if (t.value === "text") {
                    updateField("answers", []);
                  }
                }}
              >
                <Text className={`text-xs ${question.question_type === t.value ? "text-white" : "text-gray-600 dark:text-gray-300"}`}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={onDelete}>
            <Text className="text-red-500 text-xs">✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      {expanded && (
        <View>
          <TextInput
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white mb-2"
            placeholder="Nội dung câu hỏi"
            placeholderTextColor="#9CA3AF"
            value={question.question_text}
            onChangeText={(v) => updateField("question_text", v)}
            multiline
          />
          <View className="flex-row items-center gap-4 mb-2">
            <View className="flex-row items-center">
              <Text className="text-xs text-gray-500 dark:text-gray-400 mr-1">Điểm:</Text>
              <TextInput
                className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs text-gray-900 dark:text-white w-16 text-center"
                keyboardType="numeric"
                value={String(question.points)}
                onChangeText={(v) => updateField("points", parseInt(v) || 0)}
              />
            </View>
          </View>
          <TextInput
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white mb-2"
            placeholder="Giải thích (hiển thị sau khi trả lời)"
            placeholderTextColor="#9CA3AF"
            value={question.explanation}
            onChangeText={(v) => updateField("explanation", v)}
            multiline
          />

          {/* Answers (only for choice types) */}
          {!isTextType && (
            <View className="mt-2">
              <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Đáp án:</Text>
              {question.answers.map((answer, i) => (
                <View key={i} className="flex-row items-center mb-1">
                  <TouchableOpacity
                    className={`w-5 h-5 rounded-full border-2 mr-2 items-center justify-center ${
                      answer.is_correct ? "bg-green-500 border-green-500" : "border-gray-400"
                    }`}
                    onPress={() => toggleCorrect(i)}
                  >
                    {answer.is_correct && <Text className="text-white text-xs">✓</Text>}
                  </TouchableOpacity>
                  <TextInput
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-1 text-sm text-gray-900 dark:text-white"
                    placeholder="Nội dung đáp án"
                    placeholderTextColor="#9CA3AF"
                    value={answer.answer_text}
                    onChangeText={(v) => updateAnswer(i, "answer_text", v)}
                  />
                  <TouchableOpacity className="ml-1 px-1" onPress={() => removeAnswer(i)}>
                    <Text className="text-red-400 text-sm">✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                className="mt-1 py-1 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg items-center"
                onPress={addAnswer}
              >
                <Text className="text-xs text-gray-500 dark:text-gray-400">+ Thêm đáp án</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function QuizQuestionsList({ questions, onChange }: QuizQuestionsListProps) {
  const handleChange = (index: number, updated: QuizzQuestion) => {
    const next = questions.map((q, i) => (i === index ? updated : q));
    onChange(next);
  };

  const handleDelete = (index: number) => {
    onChange(questions.filter((_, i) => i !== index));
  };

  const addQuestion = () => {
    const newQ: QuizzQuestion = {
      question_text: "",
      question_type: "single_choice",
      points: 1,
      order: questions.length,
      explanation: "",
      answers: [
        { answer_text: "", is_correct: false, points: 0 },
        { answer_text: "", is_correct: false, points: 0 },
      ],
    };
    onChange([...questions, newQ]);
  };

  return (
    <View>
      {questions.map((q, i) => (
        <QuestionEditor
          key={i}
          question={q}
          index={i}
          onChange={(updated) => handleChange(i, updated)}
          onDelete={() => handleDelete(i)}
        />
      ))}
      <TouchableOpacity
        className="py-3 border border-dashed border-primary-400 rounded-xl items-center mt-2"
        onPress={addQuestion}
      >
        <Text className="text-primary-500 text-sm font-medium">+ Thêm câu hỏi</Text>
      </TouchableOpacity>
    </View>
  );
}
