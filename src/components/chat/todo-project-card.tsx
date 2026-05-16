import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { TodoProject } from "../../types/todo.type";

interface TodoProjectCardProps {
  project: TodoProject;
  isMine?: boolean;
  onPress?: () => void;
}

export default function TodoProjectCard({ project, isMine, onPress }: TodoProjectCardProps) {
  const hasPress = typeof onPress === "function";

  const content = (
    <View className={`rounded-xl p-4 mb-2 min-w-[240px] max-w-[85%] ${isMine ? "bg-primary-500 self-end" : "bg-gray-100 self-start"}`}>
      <View className="flex-row items-center mb-2">
        <Text className="text-lg mr-2">📋</Text>
        <Text className={`text-base font-semibold flex-1 ${isMine ? "text-white" : "text-gray-900"}`} numberOfLines={1}>
          {project?.project_name || "Dự án"}
        </Text>
      </View>

      {project?.project_description ? (
        <Text className={`text-sm mb-2 ${isMine ? "text-white/80" : "text-gray-600"}`} numberOfLines={2}>
          {project.project_description}
        </Text>
      ) : null}

      <View className="flex-row items-center justify-between">
        <View className="flex-row flex-wrap gap-1 flex-1">
          {(project?.project_statuses || []).slice(0, 3).map((status) => (
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
          {(project?.project_statuses?.length || 0) > 3 && (
            <Text className={`text-xs ${isMine ? "text-white/60" : "text-gray-400"}`}>
              +{project!.project_statuses!.length - 3}
            </Text>
          )}
        </View>
        <Text className={`text-xs ml-2 ${isMine ? "text-white/60" : "text-gray-400"}`}>
          {project?.project_members?.length || 0} thành viên
        </Text>
      </View>

      <View className={`mt-2 pt-2 border-t ${isMine ? "border-white/20" : "border-gray-200"}`}>
        <Text className={`text-xs text-center ${isMine ? "text-white/70" : "text-primary-500"}`}>
          Xem dự án →
        </Text>
      </View>
    </View>
  );

  if (hasPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}
