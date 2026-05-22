export type Role = 'manager' | 'employee' | 'admin';
export type TeamName = 'All' | 'Frontend' | 'Backend';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in-progress' | 'in-review' | 'done';
export type NotificationType = 'task_assigned' | 'comment_added' | 'deadline_approaching' | 'status_changed';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  team: TeamName;
  teamId?: string;
  avatar?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  team: TeamName;
  teamId?: string;
  assigneeId: string;
  assigneeName: string;
  projectId: string;
  deadline: string;
  createdAt: string;
  updatedAt: string;
  imageKey?: string;
  labels?: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  team: TeamName;
  createdAt: string;
  createdById?: string;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
  attachments?: string[];
}

export interface Activity {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: NotificationType;
  taskId?: string;
}

export interface Team {
  id: string;
  name: Exclude<TeamName, 'All'>;
  memberCount: number;
  projectCount: number;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  priority: Priority;
  assigneeId: string;
  team: TeamName;
  deadline: string;
}

export interface CreateProjectInput {
  name: string;
  description: string;
  team: TeamName;
}

export interface CreateUserInput {
  name: string;
  email: string;
  role: Role;
  team: TeamName;
}