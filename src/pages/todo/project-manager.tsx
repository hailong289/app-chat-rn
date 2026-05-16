import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
} from "react-native";
import useTodoStore from "../../store/useTodoStore";
import useAuthStore from "../../store/useAuth";
import { todoService } from "../../service/todo.service";
import { TodoProject, isProjectCreator } from "../../types/todo.type";

const COLORS = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280", "#14B8A6"];

export default function ProjectManagerPage() {
  const { projects, isLoadingProjects, fetchProjects, upsertProject, removeProject } = useTodoStore();
  const user = useAuthStore((s) => s.user);
  const userId = user?._id || user?.id || "";

  const [showCreate, setShowCreate] = useState(false);
  const [editingProject, setEditingProject] = useState<TodoProject | null>(null);
  const [showStatusManager, setShowStatusManager] = useState<TodoProject | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [statusName, setStatusName] = useState("");
  const [statusColor, setStatusColor] = useState("#6B7280");
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const resetForm = () => {
    setProjectName("");
    setProjectDesc("");
    setEditingProject(null);
    setShowCreate(false);
    setShowStatusManager(null);
    setStatusName("");
    setStatusColor("#6B7280");
    setEditingStatusId(null);
  };

  const handleCreate = useCallback(async () => {
    if (!projectName.trim() || !userId) return;
    try {
      const project = await todoService.createProject({
        project_name: projectName.trim(),
        project_description: projectDesc.trim(),
      });
      upsertProject(project);
      resetForm();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thể tạo dự án");
    }
  }, [projectName, projectDesc, userId]);

  const handleUpdate = useCallback(async () => {
    if (!editingProject || !projectName.trim()) return;
    try {
      const updated = await todoService.updateProject(editingProject.project_id, {
        project_name: projectName.trim(),
        project_description: projectDesc.trim(),
      });
      upsertProject(updated);
      resetForm();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thể cập nhật dự án");
    }
  }, [editingProject, projectName, projectDesc]);

  const handleDelete = useCallback(async (projectId: string) => {
    Alert.alert("Xác nhận", "Xóa dự án này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await todoService.deleteProject(projectId);
            removeProject(projectId);
          } catch (e: any) {
            Alert.alert("Lỗi", e?.message || "Không thể xóa");
          }
        },
      },
    ]);
  }, []);

  const handleAddStatus = useCallback(async () => {
    if (!showStatusManager || !statusName.trim()) return;
    try {
      const updated = await todoService.addProjectStatus(showStatusManager.project_id, {
        status_name: statusName.trim(),
        status_color: statusColor,
      });
      upsertProject(updated);
      setShowStatusManager(updated);
      setStatusName("");
      setStatusColor("#6B7280");
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thể thêm trạng thái");
    }
  }, [showStatusManager, statusName, statusColor]);

  const handleUpdateStatus = useCallback(async () => {
    if (!showStatusManager || !editingStatusId || !statusName.trim()) return;
    try {
      const updated = await todoService.updateProjectStatus(showStatusManager.project_id, editingStatusId, {
        status_name: statusName.trim(),
        status_color: statusColor,
      });
      upsertProject(updated);
      setShowStatusManager(updated);
      setEditingStatusId(null);
      setStatusName("");
      setStatusColor("#6B7280");
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thể cập nhật");
    }
  }, [showStatusManager, editingStatusId, statusName, statusColor]);

  const handleDeleteStatus = useCallback(async (statusId: string) => {
    if (!showStatusManager) return;
    Alert.alert("Xác nhận", "Xóa trạng thái này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            const updated = await todoService.deleteProjectStatus(showStatusManager.project_id, statusId);
            upsertProject(updated);
            setShowStatusManager(updated);
          } catch (e: any) {
            Alert.alert("Lỗi", e?.message || "Không thể xóa");
          }
        },
      },
    ]);
  }, [showStatusManager]);

  const renderProject = ({ item }: { item: TodoProject }) => {
    const isOwner = isProjectCreator(item, userId);
    return (
      <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 shadow-sm border border-gray-100 dark:border-gray-700">
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900 dark:text-white">{item.project_name}</Text>
            {item.project_description ? (
              <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1" numberOfLines={2}>
                {item.project_description}
              </Text>
            ) : null}
            <View className="flex-row items-center mt-2">
              <Text className="text-xs text-gray-400 dark:text-gray-500">
                {item.project_statuses?.length || 0} trạng thái
              </Text>
              <Text className="text-xs text-gray-400 dark:text-gray-500 ml-3">
                {item.project_members?.length || 0} thành viên
              </Text>
            </View>
            {/* Status chips */}
            <View className="flex-row flex-wrap mt-2 gap-1">
              {(item.project_statuses || []).slice(0, 5).map((s) => (
                <View
                  key={s.status_id}
                  className="px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: (s.status_color || "#6B7280") + "20" }}
                >
                  <Text className="text-xs" style={{ color: s.status_color || "#6B7280" }}>
                    {s.status_name}
                  </Text>
                </View>
              ))}
              {(item.project_statuses?.length || 0) > 5 && (
                <Text className="text-xs text-gray-400">+{item.project_statuses!.length - 5}</Text>
              )}
            </View>
          </View>
        </View>
        {/* Actions */}
        <View className="flex-row justify-end mt-3 gap-2 border-t border-gray-100 dark:border-gray-700 pt-3">
          <TouchableOpacity
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg"
            onPress={() => setShowStatusManager(item)}
          >
            <Text className="text-xs text-gray-600 dark:text-gray-300">Trạng thái</Text>
          </TouchableOpacity>
          {isOwner && (
            <>
              <TouchableOpacity
                className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg"
                onPress={() => {
                  setEditingProject(item);
                  setProjectName(item.project_name);
                  setProjectDesc(item.project_description || "");
                  setShowCreate(true);
                }}
              >
                <Text className="text-xs text-blue-600 dark:text-blue-400">Sửa</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg"
                onPress={() => handleDelete(item.project_id)}
              >
                <Text className="text-xs text-red-600 dark:text-red-400">Xóa</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
          Quản lý dự án
        </Text>
        <TouchableOpacity
          className="px-4 py-2 bg-primary-500 rounded-xl"
          onPress={() => { resetForm(); setShowCreate(true); }}
        >
          <Text className="text-white text-sm font-medium">+ Dự án mới</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={projects}
        renderItem={renderProject}
        keyExtractor={(item) => item.project_id}
        contentContainerClassName="px-4 pb-8"
        refreshControl={<RefreshControl refreshing={isLoadingProjects} onRefresh={() => fetchProjects()} />}
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <Text className="text-gray-500 dark:text-gray-400">Chưa có dự án nào</Text>
          </View>
        }
      />

      {/* Create/Edit Project Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-6">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingProject ? "Sửa dự án" : "Dự án mới"}
            </Text>
            <TextInput
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white mb-3"
              placeholder="Tên dự án"
              placeholderTextColor="#9CA3AF"
              value={projectName}
              onChangeText={setProjectName}
            />
            <TextInput
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white mb-4"
              placeholder="Mô tả"
              placeholderTextColor="#9CA3AF"
              value={projectDesc}
              onChangeText={setProjectDesc}
              multiline
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 py-3 rounded-lg border border-gray-300 dark:border-gray-600"
                onPress={resetForm}
              >
                <Text className="text-center text-gray-700 dark:text-gray-300">Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3 rounded-lg bg-primary-500"
                onPress={editingProject ? handleUpdate : handleCreate}
              >
                <Text className="text-center text-white font-medium">{editingProject ? "Cập nhật" : "Tạo"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Status Manager Modal */}
      <Modal visible={showStatusManager !== null} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-6" style={{ maxHeight: "70%" }}>
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Trạng thái - {showStatusManager?.project_name}
            </Text>
            <FlatList
              data={showStatusManager?.project_statuses || []}
              keyExtractor={(item) => item.status_id}
              className="max-h-64 mb-4"
              renderItem={({ item }) => (
                <View className="flex-row items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <View className="flex-row items-center">
                    <View className="w-4 h-4 rounded mr-3" style={{ backgroundColor: item.status_color || "#6B7280" }} />
                    <Text className="text-sm text-gray-800 dark:text-white">{item.status_name}</Text>
                  </View>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => {
                        setEditingStatusId(item.status_id);
                        setStatusName(item.status_name);
                        setStatusColor(item.status_color || "#6B7280");
                      }}
                    >
                      <Text className="text-xs text-blue-500">Sửa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteStatus(item.status_id)}>
                      <Text className="text-xs text-red-500">Xóa</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
            {editingStatusId !== null ? (
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sửa trạng thái</Text>
                <TextInput
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white mb-2"
                  placeholder="Tên trạng thái"
                  placeholderTextColor="#9CA3AF"
                  value={statusName}
                  onChangeText={setStatusName}
                />
                <View className="flex-row flex-wrap gap-2 mb-2">
                  {COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      className={`w-7 h-7 rounded-full ${statusColor === c ? "border-2 border-gray-900 dark:border-white" : ""}`}
                      style={{ backgroundColor: c }}
                      onPress={() => setStatusColor(c)}
                    />
                  ))}
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600"
                    onPress={() => { setEditingStatusId(null); setStatusName(""); }}
                  >
                    <Text className="text-xs text-gray-600 dark:text-gray-300">Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="px-3 py-1.5 rounded-lg bg-primary-500" onPress={handleUpdateStatus}>
                    <Text className="text-xs text-white">Cập nhật</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Thêm trạng thái mới</Text>
                <TextInput
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white mb-2"
                  placeholder="Tên trạng thái"
                  placeholderTextColor="#9CA3AF"
                  value={statusName}
                  onChangeText={setStatusName}
                />
                <View className="flex-row flex-wrap gap-2 mb-2">
                  {COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      className={`w-7 h-7 rounded-full ${statusColor === c ? "border-2 border-gray-900 dark:border-white" : ""}`}
                      style={{ backgroundColor: c }}
                      onPress={() => setStatusColor(c)}
                    />
                  ))}
                </View>
                <TouchableOpacity className="py-2 rounded-lg bg-primary-500" onPress={handleAddStatus}>
                  <Text className="text-center text-white text-sm">+ Thêm</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              className="py-3 rounded-lg border border-gray-300 dark:border-gray-600"
              onPress={() => { setShowStatusManager(null); setEditingStatusId(null); }}
            >
              <Text className="text-center text-gray-700 dark:text-gray-300">Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
