import { apiRequest } from './api';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TaskAssignee {
  id?: string;
  taskId?: string;
  projectId?: string;
  userId: string;
  username: string | null;
  email?: string | null;
  name: string | null;
  createdAt?: string;
}

export interface Task {
  id: string;
  projectId: string;
  createdBy: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignees: TaskAssignee[];
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
}

export async function getTasks(projectId: string): Promise<Task[]> {
  return apiRequest<Task[]>(`/projects/${projectId}/tasks`);
}

export async function createTask(
  projectId: string,
  data: CreateTaskInput,
): Promise<Task> {
  return apiRequest<Task>(`/projects/${projectId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTask(
  projectId: string,
  taskId: string,
  data: UpdateTaskInput,
): Promise<Task> {
  return apiRequest<Task>(`/projects/${projectId}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteTask(
  projectId: string,
  taskId: string,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    `/projects/${projectId}/tasks/${taskId}`,
    { method: 'DELETE' },
  );
}

export async function getTaskAssignees(
  projectId: string,
  taskId: string,
): Promise<TaskAssignee[]> {
  return apiRequest<TaskAssignee[]>(
    `/projects/${projectId}/tasks/${taskId}/assignees`,
  );
}

export async function addTaskAssignee(
  projectId: string,
  taskId: string,
  userId: string,
): Promise<{ taskId: string; userId: string }> {
  return apiRequest<{ taskId: string; userId: string }>(
    `/projects/${projectId}/tasks/${taskId}/assignees`,
    {
      method: 'POST',
      body: JSON.stringify({ userId }),
    },
  );
}

export async function removeTaskAssignee(
  projectId: string,
  taskId: string,
  userId: string,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    `/projects/${projectId}/tasks/${taskId}/assignees/${userId}`,
    { method: 'DELETE' },
  );
}
