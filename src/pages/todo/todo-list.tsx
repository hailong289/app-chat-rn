import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  ScrollView,
} from "react-native";
import useTodoStore from "../../store/useTodoStore";
import useAuthStore from "../../store/useAuth";
import { todoService } from "../../service/todo.service";
import {
  TodoItem,
  TodoProject,
  ProjectStatus,
  isProjectCreator,
} from "../../types/todo.type";

interface TodoCardProps {
  todo: TodoItem;
  statuses: ProjectStatus[];
  onPress: () => void;
  onMove: (todoId: string, newStatus: string) => void;
  onDelete: (todoId: string) => void;
}

const priorityColors: Record<string, string> = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#10B981",
};

function TodoCard({ todo, statuses, onPress, onMove, onDelete }: TodoCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const isOverdue = todo.todo_dueDate && new Date(todo.todo_dueDate) < new Date();

  return (
    <TouchableOpacity
      className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-2 shadow-sm border border-gray-100 dark:border-gray-700"
      onPress={onPress}
      onLongPress={() => setShowMenu(true)}
    >
      <View className="flex-row items-start justify-between">
        <Text className="text-sm font-medium text-gray-900 dark:text-white flex-1" numberOfLines={2}>
          {todo.todo_title}
        </Text>
        <View
          className="w-2 h-2 rounded-full ml-2 mt-1"
          style={{ backgroundColor: priorityColors[todo.todo_priority] || "#9CA3AF" }}
        />
      </View>
      {todo.todo_description ? (
        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1" numberOfLines={2}>
          {todo.todo_description}
        </Text>
      ) : null}
      {todo.todo_dueDate ? (
        <Text className={`text-xs mt-1 ${isOverdue ? "text-red-500" : "text-gray-500"}`}>
          {isOverdue ? "Quá hạn: " : "Hạn: "}
          {new Date(todo.todo_dueDate).toLocaleDateString("vi-VN")}
        </Text>
      ) : null}
      {showMenu && (
        <View className="absolute top-8 right-0 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50 p-1">
          <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-1 uppercase">
            Di chuyển
          </Text>
          {statuses.map((s) => (
            <TouchableOpacity
              key={s.status_id}
              className="px-3 py-2"
              onPress={() => {
                onMove(todo.todo_id, s.status_id);
                setShowMenu(false);
              }}
            >
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded mr-2" style={{ backgroundColor: s.status_color || "#6B7280" }} />
                <Text className="text-sm text-gray-700 dark:text-gray-300">{s.status_name}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <View className="border-t border-gray-200 dark:border-gray-600 mt-1 pt-1">
            <TouchableOpacity
              className="px-3 py-2"
              onPress={() => {
                onDelete(todo.todo_id);
                setShowMenu(false);
              }}
            >
              <Text className="text-sm text-red-500">Xóa</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

interface ColumnProps {
  status: ProjectStatus;
  todos: TodoItem[];
  isOwner: boolean;
  onMoveTodo: (todoId: string, newStatus: string) => void;
  onDeleteTodo: (todoId: string) => void;
  onAddTodo: (statusId: string) => void;
  onEditStatus: (status: ProjectStatus) => void;
  onDeleteStatus: (statusId: string) => void;
  onTodoPress: (todo: TodoItem) => void;
}

function Column({
  status,
  todos,
  isOwner,
  onMoveTodo,
  onDeleteTodo,
  onAddTodo,
  onEditStatus,
  onDeleteStatus,
  onTodoPress,
}: ColumnProps) {
  return (
    <View className="w-64 mr-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3" style={{ minHeight: 200 }}>
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <View className="w-3 h-3 rounded mr-2" style={{ backgroundColor: status.status_color || "#6B7280" }} />
          <Text className="text-sm font-semibold text-gray-800 dark:text-white" numberOfLines={1}>
            {status.status_name}
          </Text>
          <View className="ml-2 bg-gray-200 dark:bg-gray-600 rounded-full px-2 py-0.5">
            <Text className="text-xs text-gray-600 dark:text-gray-300">{todos.length}</Text>
          </View>
        </View>
        {isOwner && (
          <View className="flex-row">
            <TouchableOpacity className="px-1" onPress={() => onEditStatus(status)}>
              <Text className="text-xs text-blue-500">Sửa</Text>
            </TouchableOpacity>
            <TouchableOpacity className="px-1" onPress={() => onDeleteStatus(status.status_id)}>
              <Text className="text-xs text-red-500">Xóa</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <ScrollView className="flex-1">
        {todos.map((todo) => (
          <TodoCard
            key={todo.todo_id}
            todo={todo}
            statuses={[status]}
            onPress={() => onTodoPress(todo)}
            onMove={onMoveTodo}
            onDelete={onDeleteTodo}
          />
        ))}
      </ScrollView>
      <TouchableOpacity
        className="mt-2 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg items-center"
        onPress={() => onAddTodo(status.status_id)}
      >
        <Text className="text-sm text-gray-500 dark:text-gray-400">+ Thêm công việc</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TodoListPage() {
  const { todos, projects, selectedProjectId, isLoadingTodos, fetchTodos, fetchProjects, setSelectedProjectId, removeTodo, upsertTodo } = useTodoStore();
  const user = useAuthStore((s) => s.user);
  const userId = user?._id || user?.id || "";

  const [showCreateTodo, setShowCreateTodo] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [editingStatus, setEditingStatus] = useState<ProjectStatus | null>(null);
  const [defaultStatus, setDefaultStatus] = useState("");
  const [todoTitle, setTodoTitle] = useState("");
  const [todoDesc, setTodoDesc] = useState("");
  const [todoPriority, setTodoPriority] = useState<"low" | "medium" | "high">("medium");
  const [todoDueDate, setTodoDueDate] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [statusName, setStatusName] = useState("");
  const [statusColor, setStatusColor] = useState("#6B7280");

  const selectedProject = useMemo(
    () => projects.find((p) => p.project_id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const isOwner = selectedProject ? isProjectCreator(selectedProject, userId) : false;

  const columns = useMemo(() => {
    if (!selectedProject) return [];
    return selectedProject.project_statuses
      .sort((a, b) => a.status_order - b.status_order)
      .map((status) => ({
        status,
        todos: todos.filter((t) => t.todo_status === status.status_id),
      }));
  }, [selectedProject, todos]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchTodos({ projectId: selectedProjectId });
    }
  }, [selectedProjectId]);

  const handleCreateTodo = useCallback(async () => {
    if (!todoTitle.trim() || !userId) return;
    try {
      const todo = await todoService.createTodo({
        todo_title: todoTitle.trim(),
        todo_description: todoDesc.trim(),
        todo_status: defaultStatus || selectedProject?.project_statuses?.[0]?.status_id || "todo",
        todo_priority: todoPriority,
        todo_dueDate: todoDueDate || undefined,
        todo_projectId: selectedProjectId || undefined,
      });
      upsertTodo(todo);
      setShowCreateTodo(false);
      resetTodoForm();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thể tạo công việc");
    }
  }, [todoTitle, todoDesc, todoPriority, todoDueDate, defaultStatus, selectedProjectId, userId]);

  const handleUpdateTodo = useCallback(async () => {
    if (!editingTodo || !todoTitle.trim()) return;
    try {
      const updated = await todoService.updateTodo(editingTodo.todo_id, {
        todo_title: todoTitle.trim(),
        todo_description: todoDesc.trim(),
        todo_priority: todoPriority,
        todo_dueDate: todoDueDate || undefined,
      });
      upsertTodo(updated);
      setEditingTodo(null);
      resetTodoForm();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thể cập nhật công việc");
    }
  }, [editingTodo, todoTitle, todoDesc, todoPriority, todoDueDate]);

  const handleDeleteTodo = useCallback(async (todoId: string) => {
    Alert.alert("Xác nhận", "Xóa công việc này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await todoService.deleteTodo(todoId);
            removeTodo(todoId);
          } catch (e: any) {
            Alert.alert("Lỗi", e?.message || "Không thể xóa");
          }
        },
      },
    ]);
  }, []);

  const handleMoveTodo = useCallback(async (todoId: string, newStatus: string) => {
    try {
      const updated = await todoService.updateTodoStatus(todoId, newStatus);
      upsertTodo(updated);
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thể di chuyển");
    }
  }, []);

  const handleCreateProject = useCallback(async () => {
    if (!projectName.trim() || !userId) return;
    try {
      const project = await todoService.createProject({
        project_name: projectName.trim(),
        project_description: projectDesc.trim(),
      });
      const store = useTodoStore.getState();
      store.upsertProject(project);
      store.setSelectedProjectId(project.project_id);
      setShowCreateProject(false);
      setProjectName("");
      setProjectDesc("");
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thể tạo dự án");
    }
  }, [projectName, projectDesc, userId]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    Alert.alert("Xác nhận", "Xóa dự án này và tất cả công việc?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await todoService.deleteProject(projectId);
            useTodoStore.getState().removeProject(projectId);
          } catch (e: any) {
            Alert.alert("Lỗi", e?.message || "Không thể xóa");
          }
        },
      },
    ]);
  }, []);

  const handleAddStatus = useCallback(async () => {
    if (!selectedProjectId || !statusName.trim()) return;
    try {
      const updated = await todoService.addProjectStatus(selectedProjectId, {
        status_name: statusName.trim(),
        status_color: statusColor,
      });
      useTodoStore.getState().upsertProject(updated);
      setEditingStatus(null);
      setStatusName("");
      setStatusColor("#6B7280");
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thể thêm trạng thái");
    }
  }, [selectedProjectId, statusName, statusColor]);

  const handleEditStatus = useCallback(async () => {
    if (!selectedProjectId || !editingStatus || !statusName.trim()) return;
    try {
      const updated = await todoService.updateProjectStatus(selectedProjectId, editingStatus.status_id, {
        status_name: statusName.trim(),
        status_color: statusColor,
      });
      useTodoStore.getState().upsertProject(updated);
      setEditingStatus(null);
      setStatusName("");
      setStatusColor("#6B7280");
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thể cập nhật trạng thái");
    }
  }, [selectedProjectId, editingStatus, statusName, statusColor]);

  const handleDeleteStatus = useCallback(async (statusId: string) => {
    if (!selectedProjectId) return;
    const status = selectedProject?.project_statuses.find((s) => s.status_id === statusId);
    Alert.alert("Xác nhận", `Xóa trạng thái "${status?.status_name}"? Công việc sẽ chuyển về trạng thái đầu tiên.`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            const updated = await todoService.deleteProjectStatus(selectedProjectId, statusId);
            useTodoStore.getState().upsertProject(updated);
          } catch (e: any) {
            Alert.alert("Lỗi", e?.message || "Không thể xóa trạng thái");
          }
        },
      },
    ]);
  }, [selectedProjectId, selectedProject]);

  const resetTodoForm = () => {
    setTodoTitle("");
    setTodoDesc("");
    setTodoPriority("medium");
    setTodoDueDate("");
    setDefaultStatus("");
  };

  const COLORS = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280", "#14B8A6"];

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      {/* Project selector header */}
      <View className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
          {projects.map((p) => (
            <TouchableOpacity
              key={p.project_id}
              className={`px-4 py-2 rounded-full ${p.project_id === selectedProjectId ? "bg-primary-500" : "bg-gray-100 dark:bg-gray-700"}`}
              onPress={() => setSelectedProjectId(p.project_id)}
            >
              <Text className={`text-sm font-medium ${p.project_id === selectedProjectId ? "text-white" : "text-gray-700 dark:text-gray-300"}`}>
                {p.project_name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            className="px-4 py-2 rounded-full border border-dashed border-gray-400"
            onPress={() => setShowCreateProject(true)}
          >
            <Text className="text-sm text-gray-500">+ Dự án mới</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Kanban board */}
      {selectedProject ? (
        <View className="flex-1">
          <View className="flex-row items-center justify-between px-4 py-2">
            <Text className="text-base font-semibold text-gray-900 dark:text-white">{selectedProject.project_name}</Text>
            {isOwner && (
              <TouchableOpacity
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg"
                onPress={() => {
                  setEditingStatus({ status_id: "", status_name: "", status_order: 0, status_color: "#6B7280" });
                }}
              >
                <Text className="text-xs text-gray-600 dark:text-gray-300">+ Trạng thái</Text>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-1 px-2"
            refreshControl={<RefreshControl refreshing={isLoadingTodos} onRefresh={() => fetchTodos({ projectId: selectedProjectId })} />}
          >
            {columns.map((col) => (
              <Column
                key={col.status.status_id}
                status={col.status}
                todos={col.todos}
                isOwner={isOwner}
                onMoveTodo={handleMoveTodo}
                onDeleteTodo={handleDeleteTodo}
                onAddTodo={(statusId) => {
                  setDefaultStatus(statusId);
                  setShowCreateTodo(true);
                }}
                onEditStatus={(s) => {
                  setEditingStatus(s);
                  setStatusName(s.status_name);
                  setStatusColor(s.status_color || "#6B7280");
                }}
                onDeleteStatus={handleDeleteStatus}
                onTodoPress={(todo) => {
                  setEditingTodo(todo);
                  setTodoTitle(todo.todo_title);
                  setTodoDesc(todo.todo_description || "");
                  setTodoPriority(todo.todo_priority);
                  setTodoDueDate(todo.todo_dueDate || "");
                }}
              />
            ))}
          </ScrollView>
        </View>
      ) : (
        <View className="flex-1 items-center justify-center p-8">
          <Text className="text-gray-500 dark:text-gray-400 text-center">
            {projects.length === 0 ? "Chưa có dự án nào. Tạo dự án đầu tiên!" : "Chọn một dự án"}
          </Text>
          <TouchableOpacity
            className="mt-4 px-6 py-3 bg-primary-500 rounded-xl"
            onPress={() => setShowCreateProject(true)}
          >
            <Text className="text-white font-medium">+ Tạo dự án</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Create/Edit Todo Modal */}
      <Modal visible={showCreateTodo || editingTodo !== null} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-6">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingTodo ? "Sửa công việc" : "Công việc mới"}
            </Text>
            <TextInput
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white mb-3"
              placeholder="Tiêu đề"
              placeholderTextColor="#9CA3AF"
              value={todoTitle}
              onChangeText={setTodoTitle}
            />
            <TextInput
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white mb-3"
              placeholder="Mô tả"
              placeholderTextColor="#9CA3AF"
              value={todoDesc}
              onChangeText={setTodoDesc}
              multiline
            />
            <View className="flex-row gap-2 mb-3">
              {(["low", "medium", "high"] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  className={`flex-1 py-2 rounded-lg ${todoPriority === p ? "bg-primary-500" : "bg-gray-100 dark:bg-gray-700"}`}
                  onPress={() => setTodoPriority(p)}
                >
                  <Text className={`text-center text-sm ${todoPriority === p ? "text-white" : "text-gray-700 dark:text-gray-300"}`}>
                    {p === "low" ? "Thấp" : p === "medium" ? "Vừa" : "Cao"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white mb-4"
              placeholder="Ngày hết hạn (YYYY-MM-DD)"
              placeholderTextColor="#9CA3AF"
              value={todoDueDate}
              onChangeText={setTodoDueDate}
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 py-3 rounded-lg border border-gray-300 dark:border-gray-600"
                onPress={() => {
                  setShowCreateTodo(false);
                  setEditingTodo(null);
                  resetTodoForm();
                }}
              >
                <Text className="text-center text-gray-700 dark:text-gray-300">Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3 rounded-lg bg-primary-500"
                onPress={editingTodo ? handleUpdateTodo : handleCreateTodo}
              >
                <Text className="text-center text-white font-medium">{editingTodo ? "Cập nhật" : "Tạo"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Project Modal */}
      <Modal visible={showCreateProject} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-6">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Dự án mới</Text>
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
                onPress={() => {
                  setShowCreateProject(false);
                  setProjectName("");
                  setProjectDesc("");
                }}
              >
                <Text className="text-center text-gray-700 dark:text-gray-300">Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3 rounded-lg bg-primary-500"
                onPress={handleCreateProject}
              >
                <Text className="text-center text-white font-medium">Tạo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Status Modal */}
      <Modal visible={editingStatus !== null} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50 px-8">
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingStatus?.status_id ? "Sửa trạng thái" : "Thêm trạng thái"}
            </Text>
            <TextInput
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white mb-3"
              placeholder="Tên trạng thái"
              placeholderTextColor="#9CA3AF"
              value={statusName}
              onChangeText={setStatusName}
            />
            <Text className="text-sm text-gray-500 dark:text-gray-400 mb-2">Màu sắc</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  className={`w-8 h-8 rounded-full ${statusColor === c ? "border-2 border-gray-900 dark:border-white" : ""}`}
                  style={{ backgroundColor: c }}
                  onPress={() => setStatusColor(c)}
                />
              ))}
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 py-3 rounded-lg border border-gray-300 dark:border-gray-600"
                onPress={() => {
                  setEditingStatus(null);
                  setStatusName("");
                  setStatusColor("#6B7280");
                }}
              >
                <Text className="text-center text-gray-700 dark:text-gray-300">Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3 rounded-lg bg-primary-500"
                onPress={editingStatus?.status_id ? handleEditStatus : handleAddStatus}
              >
                <Text className="text-center text-white font-medium">{editingStatus?.status_id ? "Cập nhật" : "Thêm"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
