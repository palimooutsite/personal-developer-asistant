export const PERMISSION_MODULES = [
  'DASHBOARD',
  'PROJECTS',
  'TASKS',
  'KNOWLEDGE',
  'CODE_SNIPPETS',
  'DOCUMENTS',
  'PROJECT_MEMBERS',
  'WORKSPACE_MEMBERS',
  'WORKSPACE_SETTINGS',
] as const;

export type PermissionModule = typeof PERMISSION_MODULES[number];
export type PermissionAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';

export const ALL_PERMISSION_MODULES = PERMISSION_MODULES.map((module) => ({
  module,
  label: module.replaceAll('_', ' '),
}));
