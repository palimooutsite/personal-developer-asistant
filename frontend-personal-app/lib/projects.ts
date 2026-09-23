import { apiRequest } from './api';

export type ProjectStatus =
  | 'PLANNED'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'ARCHIVED';

export type ProjectRole =
  | 'OWNER'
  | 'ADMIN'
  | 'DEVELOPER'
  | 'REVIEWER'
  | 'VIEWER';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  createdBy: string;
  role: ProjectRole;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  user: {
    id: string;
    username: string;
    email: string;
    name: string | null;
  };
}

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface AddProjectMemberInput { userId: string; role: Exclude<ProjectRole, 'OWNER'>; }

export interface UpdateProjectMemberInput { role: Exclude<ProjectRole, 'OWNER'>; }

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
}

export async function getProjects(): Promise<Project[]> {
  return apiRequest<Project[]>('/projects');
}

export async function getProject(id: string): Promise<Project> {
  return apiRequest<Project>(`/projects/${id}`);
}

export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  return apiRequest<ProjectMember[]>(`/projects/${projectId}/members`);
}

export async function addProjectMember(projectId: string, data: AddProjectMemberInput): Promise<ProjectMember> {
  return apiRequest<ProjectMember>(`/projects/${projectId}/members`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProjectMember(projectId: string, userId: string, data: UpdateProjectMemberInput): Promise<ProjectMember> {
  return apiRequest<ProjectMember>(`/projects/${projectId}/members/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function removeProjectMember(projectId: string, userId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/projects/${projectId}/members/${userId}`, {
    method: 'DELETE',
  });
}

export async function createProject(data: CreateProjectInput): Promise<Project> {
  return apiRequest<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProject(
  id: string,
  data: UpdateProjectInput,
): Promise<Project> {
  return apiRequest<Project>(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/projects/${id}`, {
    method: 'DELETE',
  });
}
