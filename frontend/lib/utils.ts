import { formatDistanceToNow, isPast, parseISO } from 'date-fns';
import { Priority, Task, TaskStatus, TeamName, User } from '@/lib/types';

export const statusLabels: Record<TaskStatus, string> = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  'in-review': 'In Review',
  done: 'Done'
};

export const priorityLabels: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent'
};

export const priorityOrder: Priority[] = ['urgent', 'high', 'medium', 'low'];

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(parseISO(value));
}

export function timeAgo(value: string) {
  return formatDistanceToNow(parseISO(value), { addSuffix: true });
}

export function taskIsOverdue(task: Task) {
  return isPast(parseISO(task.deadline)) && task.status !== 'done';
}

export function teamVisibleForUser(team: TeamName, user: User | null, selectedTeam: TeamName) {
  if (!user) return false;
  if (user.role === 'manager' || user.role === 'admin') {
    return selectedTeam === 'All' || team === selectedTeam || team === 'All';
  }
  return team === user.team || team === 'All';
}

export function canManageAll(user: User | null) {
  return user?.role === 'manager' || user?.role === 'admin';
}

export function filterTaskByScope(task: Task, user: User | null, teamFilter: TeamName) {
  if (!user) return false;
  if (user.role === 'manager' || user.role === 'admin') {
    return teamFilter === 'All' || task.team === teamFilter || task.team === 'All';
  }
  return task.team === user.team || task.team === 'All';
}

export function matchesSearch(task: Task, query: string) {
  if (!query.trim()) return true;
  const search = query.toLowerCase();
  return [task.title, task.description, task.assigneeName, task.priority, task.team, ...(task.labels ?? [])]
    .join(' ')
    .toLowerCase()
    .includes(search);
}

export function statusStyle(status: TaskStatus) {
  switch (status) {
    case 'todo':
      return 'badge badge--slate';
    case 'in-progress':
      return 'badge badge--blue';
    case 'in-review':
      return 'badge badge--violet';
    case 'done':
      return 'badge badge--green';
  }
}

export function priorityStyle(priority: Priority) {
  switch (priority) {
    case 'low':
      return 'badge badge--green';
    case 'medium':
      return 'badge badge--amber';
    case 'high':
      return 'badge badge--orange';
    case 'urgent':
      return 'badge badge--red';
  }
}

export function teamStyle(team: TeamName) {
  if (team === 'Frontend') return 'badge badge--blue';
  if (team === 'Backend') return 'badge badge--violet';
  return 'badge badge--slate';
}