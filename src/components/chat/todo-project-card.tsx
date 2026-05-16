import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { TodoProject } from "../../types/todo.type";

interface TodoProjectCardProps {
  project: TodoProject;
  isMine?: boolean;
}

export default function TodoProjectCard({ project, isMine }: TodoProjectCardProps) {
  const navigation = useNavigation<any>();

  const statusColors: Record<string, string> = {
    high: "#EF4444",
    medium: "#F59E0B",
    low: "#10B981",
  };

  return (
    <TouchableOpacity
      className={`rounded-xl p-4 mb-2 max-w-[85%] ${isMine ? "bg-primary-500 self-end" : "bg-gray-100 dark:bg-gray-800 self-start"}`}
      onPress={() => navigation.navigate("TodoList", { projectId: project.project_id })}
      activeOpacity={0.8}
    >
      <View className="flex-row items-center mb-2">
        <Text className="text-lg mr-2">📋</Text>
        <Text className={`text-base font-semibold flex-1 ${isMine ? "text-white" : "text-gray-900 dark:text-white"}`} numberOfLines={1}>
          {project.project_name}
        </Text>
      </View>

      {project.project_description ? (
        <Text className={`text-sm mb-2 ${isMine ? "text-white/80" : "text-gray-600 dark:text-gray-400"}`} numberOfLines={2}>
          {project.project_description}
        </Text>
      ) : null}

      <View className="flex-row items-center justify-between">
        <View className="flex-row flex-wrap gap-1 flex-1">
          {(project.project_statuses || []).slice(0, 3).map((status) => (
            <View
              key={status.status_id}
              className="px-2 py-0.5 rounded-full"
              style={{ backgroundColor: (status.status_color || "#6B7280") + "30" }}
            >
              <Text className="text-xs" style={{ color: status.status_color || "#6B7280" }}>
                {status.status_name}
              </Text>
            </View>
          ))}
          {(project.project_statuses?.length || 0) > 3 && (
            <Text className={`text-xs ${isMine ? "text-white/60" : "text-gray-400"}`}>
              +{project.project_statuses!.length - 3}
            </Text>
          )}
        </View>
        <Text className={`text-xs ml-2 ${isMine ? "text-white/60" : "text-gray-400 dark:text-gray-500"}`}>
          {project.project_members?.length || 0} thành viên
        </Text>
      </View>

      <View className={`mt-2 pt-2 border-t ${isMine ? "border-white/20" : "border-gray-200 dark:border-gray-700"}`}>
        <Text className={`text-xs text-center ${isMine ? "text-white/70" : "text-primary-500"}`}>
          Xem dự án →
        </Text>
      </View>
    </TouchableOpacity>
  );
}
