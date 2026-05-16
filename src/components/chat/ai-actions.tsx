import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { aiService } from "../../service/ai.service";

interface AIActionsProps {
  isOpen: boolean;
  onClose: () => void;
  messageContent: string;
  messageId: string;
  roomId?: string;
}

type AIAction = "translate" | "summarize" | "suggest" | null;

export default function AIActions({
  isOpen,
  onClose,
  messageContent,
  messageId,
  roomId,
}: AIActionsProps) {
  const [action, setAction] = useState<AIAction>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [translateFrom, setTranslateFrom] = useState("auto");
  const [translateTo, setTranslateTo] = useState("vi");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleTranslate = async () => {
    setLoading(true);
    try {
      const res = await aiService.translate(messageContent, translateFrom, translateTo);
      setResult(res.translated || "Không thể dịch");
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Dịch thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    setLoading(true);
    try {
      const res = await aiService.summaryDocument({
        type: "file_url",
        file_url: messageContent,
      });
      // If content is not a URL, pass it as text content
      if (!messageContent.startsWith("http")) {
        // For text messages, use the text directly
        const textResult = await aiService.summaryDocument({
          type: "file_url",
          file_url: "",
        });
        setResult(res.summary || textResult.summary || "Không thể tóm tắt");
      } else {
        setResult(res.summary || "Không thể tóm tắt");
      }
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Tóm tắt thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleSuggest = async () => {
    setLoading(true);
    try {
      const res = await aiService.suggestReplies([messageContent]);
      setSuggestions(res.suggestions || []);
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Gợi ý thất bại");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-6 max-h-[70%]">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              AI Actions
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text className="text-primary-500 text-base">Đóng</Text>
            </TouchableOpacity>
          </View>

          {!action ? (
            /* Action menu */
            <View>
              <TouchableOpacity
                className="flex-row items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl mb-2"
                onPress={() => { setAction("translate"); setResult(""); }}
              >
                <Text className="text-2xl mr-3">🌐</Text>
                <View className="flex-1">
                  <Text className="text-base font-medium text-gray-900 dark:text-white">Dịch</Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-400">Dịch tin nhắn sang ngôn ngữ khác</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl mb-2"
                onPress={() => { setAction("summarize"); setResult(""); }}
              >
                <Text className="text-2xl mr-3">📋</Text>
                <View className="flex-1">
                  <Text className="text-base font-medium text-gray-900 dark:text-white">Tóm tắt</Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-400">Tóm tắt nội dung tin nhắn</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl mb-2"
                onPress={() => { setAction("suggest"); setSuggestions([]); }}
              >
                <Text className="text-2xl mr-3">💡</Text>
                <View className="flex-1">
                  <Text className="text-base font-medium text-gray-900 dark:text-white">Gợi ý trả lời</Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-400">AI gợi ý câu trả lời phù hợp</Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            /* Action detail */
            <ScrollView>
              <TouchableOpacity
                className="mb-3"
                onPress={() => { setAction(null); setResult(""); setSuggestions([]); }}
              >
                <Text className="text-primary-500">← Quay lại</Text>
              </TouchableOpacity>

              {action === "translate" && (
                <View>
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dịch từ</Text>
                  <TextInput
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white mb-2"
                    placeholder="auto"
                    value={translateFrom}
                    onChangeText={setTranslateFrom}
                  />
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sang</Text>
                  <TextInput
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white mb-3"
                    placeholder="vi"
                    value={translateTo}
                    onChangeText={setTranslateTo}
                  />
                  <TouchableOpacity
                    className="py-3 bg-primary-500 rounded-xl items-center mb-3"
                    onPress={handleTranslate}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-medium">Dịch</Text>
                    )}
                  </TouchableOpacity>
                  {result ? (
                    <View className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                      <Text className="text-sm text-gray-900 dark:text-white">{result}</Text>
                    </View>
                  ) : null}
                </View>
              )}

              {action === "summarize" && (
                <View>
                  <TouchableOpacity
                    className="py-3 bg-primary-500 rounded-xl items-center mb-3"
                    onPress={handleSummarize}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-medium">Tóm tắt</Text>
                    )}
                  </TouchableOpacity>
                  {result ? (
                    <View className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                      <Text className="text-sm text-gray-900 dark:text-white">{result}</Text>
                    </View>
                  ) : null}
                </View>
              )}

              {action === "suggest" && (
                <View>
                  <TouchableOpacity
                    className="py-3 bg-primary-500 rounded-xl items-center mb-3"
                    onPress={handleSuggest}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-medium">Gợi ý trả lời</Text>
                    )}
                  </TouchableOpacity>
                  {suggestions.length > 0 && (
                    <View>
                      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Gợi ý ({suggestions.length})
                      </Text>
                      {suggestions.map((s, i) => (
                        <TouchableOpacity
                          key={i}
                          className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 mb-2"
                        >
                          <Text className="text-sm text-gray-900 dark:text-white">{s}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
