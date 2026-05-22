export interface AuthTokens {
  idToken: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface JwtClaims {
  sub: string;
  email?: string;
  name?: string;
  [key: string]: unknown;
}

export interface BackendTask {
  taskID: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  deadline?: string;
  assigneeID?: string;
  teamID?: string;
  projectID?: string;
  imageKey?: string;
  resizedImageKey?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BackendProject {
  projectID: string;
  name: string;
  description?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BackendUser {
  userID: string;
  email: string;
  name: string;
  role: string;
  teamID?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BackendTeam {
  teamID: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BackendComment {
  commentID: string;
  taskID: string;
  authorID: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface BackendAuditLog {
  LogID: string;
  taskID: string;
  changedBy: string;
  oldStatus: string;
  newStatus: string;
  timestamp: string;
}

const DEFAULT_API_BASE_URL = 'http://localhost:3000/api';

function getApiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, '');
}

function decodeBase64UrlJson<T>(segment: string) {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const decoded = globalThis.atob(padded);
  return JSON.parse(decoded) as T;
}

export function decodeJwt<T extends object = JwtClaims>(token: string) {
  const parts = token.split('.');
  if (parts.length < 2) {
    throw new Error('Invalid token');
  }
  return decodeBase64UrlJson<T>(parts[1]);
}

async function requestJson<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`, {
    cache: 'no-store',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) {
        message = body.message.join(', ');
      } else if (body.message) {
        message = body.message;
      }
    } catch {
      const text = await response.text();
      if (text) message = text;
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function apiLogin(email: string, password: string) {
  return requestJson<AuthTokens>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

export function apiGetTasks(token: string) {
  return requestJson<BackendTask[]>('/tasks', {}, token);
}

export function apiCreateTask(token: string, body: Record<string, unknown>) {
  return requestJson<BackendTask>('/tasks', {
    method: 'POST',
    body: JSON.stringify(body)
  }, token);
}

export function apiUpdateTask(token: string, taskId: string, body: Record<string, unknown>) {
  return requestJson<BackendTask>(`/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(body)
  }, token);
}

export function apiDeleteTask(token: string, taskId: string) {
  return requestJson<{ deleted: boolean }>(`/tasks/${taskId}`, {
    method: 'DELETE'
  }, token);
}

export function apiGetTaskComments(token: string, taskId: string) {
  return requestJson<BackendComment[]>(`/tasks/${taskId}/comments`, {}, token);
}

export function apiAddTaskComment(token: string, taskId: string, content: string) {
  return requestJson<BackendComment>(`/tasks/${taskId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content })
  }, token);
}

export function apiGetTaskAudit(token: string, taskId: string) {
  return requestJson<BackendAuditLog[]>(`/tasks/${taskId}/audit`, {}, token);
}

export function apiGetProjects(token: string) {
  return requestJson<BackendProject[]>('/projects', {}, token);
}

export function apiCreateProject(token: string, body: Record<string, unknown>) {
  return requestJson<BackendProject>('/projects', {
    method: 'POST',
    body: JSON.stringify(body)
  }, token);
}

export function apiGetUsers(token: string) {
  return requestJson<BackendUser[]>('/users', {}, token);
}

export function apiGetUser(token: string, userId: string) {
  return requestJson<BackendUser>(`/users/${userId}`, {}, token);
}

export function apiCreateUser(token: string, body: Record<string, unknown>) {
  return requestJson<BackendUser>('/users', {
    method: 'POST',
    body: JSON.stringify(body)
  }, token);
}

export function apiGetTeams(token: string) {
  return requestJson<BackendTeam[]>('/teams', {}, token);
}

export function apiGetTeam(token: string, teamId: string) {
  return requestJson<BackendTeam>(`/teams/${teamId}`, {}, token);
}

export function apiCreateTeam(token: string, body: Record<string, unknown>) {
  return requestJson<BackendTeam>('/teams', {
    method: 'POST',
    body: JSON.stringify(body)
  }, token);
}