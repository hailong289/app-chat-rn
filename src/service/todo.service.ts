import apiService from "./api.service";
import {
  TodoItem,
  TodoProject,
  CreateTodoPayload,
  UpdateTodoPayload,
  TodoListParams,
  TodoListData,
  TodoStatus,
  CreateProjectPayload,
  UpdateProjectPayload,
  ProjectListParams,
  ProjectListData,
  CreateProjectStatusPayload,
  UpdateProjectStatusPayload,
} from "../types/todo.type";

interface APITodoResponse {
  message: string;
  statusCode: number;
  metadata: TodoItem;
}

interface APITodoListResponse {
  message: string;
  statusCode: number;
  metadata: TodoListData;
}

interface APIDeleteResponse {
  message: string;
  statusCode: number;
  metadata: string;
}

interface APIProjectResponse {
  message: string;
  statusCode: number;
  metadata: TodoProject;
}

interface APIProjectListResponse {
  message: string;
  statusCode: number;
  metadata: ProjectListData;
}

interface APIProjectMembersResponse {
  message: string;
  statusCode: number;
  metadata: { project_id: string; member_ids: string[]; members: any[] };
}

export const todoService = {
  createTodo: async (payload: Omit<CreateTodoPayload, "todo_createdBy">): Promise<TodoItem> => {
    const response = await apiService.post<APITodoResponse>("/learning/todo/create", payload);
    return (response.data as any)?.metadata;
  },

  getTodo: async (id: string): Promise<TodoItem> => {
    const response = await apiService.get<APITodoResponse>(`/learning/todo/get/${id}`);
    return (response.data as any)?.metadata;
  },

  listTodos: async (params: Omit<TodoListParams, "userId">): Promise<TodoListData> => {
    const response = await apiService.get<APITodoListResponse>("/learning/todo/list", params);
    return (response.data as any)?.metadata;
  },

  updateTodo: async (id: string, payload: UpdateTodoPayload): Promise<TodoItem> => {
    const response = await apiService.patch<APITodoResponse>(`/learning/todo/update/${id}`, payload);
    return (response.data as any)?.metadata;
  },

  deleteTodo: async (id: string): Promise<string> => {
    const response = await apiService.delete<APIDeleteResponse>(`/learning/todo/delete/${id}`);
    return (response.data as any)?.metadata;
  },

  assignTodo: async (id: string, assigneeIds: string[]): Promise<TodoItem> => {
    const response = await apiService.patch<APITodoResponse>(`/learning/todo/${id}/assign`, { assignee_ids: assigneeIds });
    return (response.data as any)?.metadata;
  },

  updateTodoStatus: async (id: string, status: TodoStatus): Promise<TodoItem> => {
    const response = await apiService.patch<APITodoResponse>(`/learning/todo/${id}/status`, { status });
    return (response.data as any)?.metadata;
  },

  createProject: async (payload: CreateProjectPayload): Promise<TodoProject> => {
    const response = await apiService.post<APIProjectResponse>("/learning/todo/project/create", payload);
    return (response.data as any)?.metadata;
  },

  listProjects: async (params?: ProjectListParams): Promise<ProjectListData> => {
    const response = await apiService.get<APIProjectListResponse>("/learning/todo/project/list", params);
    return (response.data as any)?.metadata;
  },

  getProject: async (id: string): Promise<TodoProject> => {
    const response = await apiService.get<APIProjectResponse>(`/learning/todo/project/${id}`);
    return (response.data as any)?.metadata;
  },

  updateProject: async (id: string, payload: UpdateProjectPayload): Promise<TodoProject> => {
    const response = await apiService.patch<APIProjectResponse>(`/learning/todo/project/${id}`, payload);
    return (response.data as any)?.metadata;
  },

  deleteProject: async (id: string): Promise<string> => {
    const response = await apiService.delete<APIDeleteResponse>(`/learning/todo/project/${id}`);
    return (response.data as any)?.metadata;
  },

  addProjectStatus: async (projectId: string, payload: CreateProjectStatusPayload): Promise<TodoProject> => {
    const response = await apiService.post<APIProjectResponse>(`/learning/todo/project/${projectId}/status`, payload);
    return (response.data as any)?.metadata;
  },

  updateProjectStatus: async (projectId: string, statusId: string, payload: UpdateProjectStatusPayload): Promise<TodoProject> => {
    const response = await apiService.patch<APIProjectResponse>(`/learning/todo/project/${projectId}/status/${statusId}`, payload);
    return (response.data as any)?.metadata;
  },

  deleteProjectStatus: async (projectId: string, statusId: string): Promise<TodoProject> => {
    const response = await apiService.delete<APIProjectResponse>(`/learning/todo/project/${projectId}/status/${statusId}`);
    return (response.data as any)?.metadata;
  },

  getProjectMembers: async (projectId: string, search?: string): Promise<{ project_id: string; member_ids: string[]; members: any[] }> => {
    const response = await apiService.get<APIProjectMembersResponse>(`/learning/todo/project/${projectId}/members`, search ? { search } : undefined);
    return (response.data as any)?.metadata;
  },

  addProjectMember: async (projectId: string, memberId: string): Promise<TodoProject> => {
    const response = await apiService.post<APIProjectResponse>(`/learning/todo/project/${projectId}/members`, { member_id: memberId });
    return (response.data as any)?.metadata;
  },

  removeProjectMember: async (projectId: string, memberId: string): Promise<TodoProject> => {
    const response = await apiService.delete<APIProjectResponse>(`/learning/todo/project/${projectId}/members/${memberId}`);
    return (response.data as any)?.metadata;
  },

  joinProject: async (projectId: string): Promise<TodoProject> => {
    const response = await apiService.post<APIProjectResponse>(`/learning/todo/project/${projectId}/join`);
    return (response.data as any)?.metadata;
  },

  leaveProject: async (projectId: string): Promise<{ message: string }> => {
    const response = await apiService.delete<{ message: string; statusCode: number; metadata: { message: string } }>(`/learning/todo/project/${projectId}/leave`);
    return (response.data as any)?.metadata;
  },
};
