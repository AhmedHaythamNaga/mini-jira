import { Activity, Comment, Notification, Project, Team, Task, User } from '@/lib/types';

const now = new Date();
const iso = (daysFromNow: number) => {
  const date = new Date(now);
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
};

export const demoUsers: User[] = [
  {
    id: 'u-ali',
    name: 'Ali Hassan',
    email: 'ali@company.com',
    password: 'password',
    role: 'manager',
    team: 'All',
    avatar: 'AH'
  },
  {
    id: 'u-sara',
    name: 'Sara Khan',
    email: 'sara@company.com',
    password: 'password',
    role: 'employee',
    team: 'Frontend',
    avatar: 'SK'
  },
  {
    id: 'u-omar',
    name: 'Omar Ali',
    email: 'omar@company.com',
    password: 'password',
    role: 'employee',
    team: 'Backend',
    avatar: 'OA'
  },
  {
    id: 'u-admin',
    name: 'Nadia Admin',
    email: 'admin@company.com',
    password: 'password',
    role: 'admin',
    team: 'All',
    avatar: 'NA'
  }
];

export const demoTeams: Team[] = [
  { id: 'team-frontend', name: 'Frontend', memberCount: 6, projectCount: 3 },
  { id: 'team-backend', name: 'Backend', memberCount: 5, projectCount: 2 }
];

export const demoProjects: Project[] = [
  {
    id: 'p-redesign',
    name: 'Website Redesign',
    description: 'Refresh the UI, tighten information architecture, and improve task discoverability.',
    team: 'Frontend',
    createdAt: new Date(2024, 0, 1).toISOString()
  },
  {
    id: 'p-api',
    name: 'API Cleanup',
    description: 'Standardize handlers, tighten validation, and simplify auth middleware.',
    team: 'Backend',
    createdAt: new Date(2024, 0, 15).toISOString()
  }
];

export const demoTasks: Task[] = [
  {
    id: 't-1',
    title: 'Fix header responsiveness',
    description: 'Tune the navigation, search, and action buttons for smaller breakpoints.',
    priority: 'high',
    status: 'todo',
    team: 'Frontend',
    assigneeId: 'u-sara',
    assigneeName: 'Sara Khan',
    projectId: 'p-redesign',
    deadline: iso(3),
    createdAt: iso(-4),
    updatedAt: iso(-1),
    labels: ['ui', 'responsive']
  },
  {
    id: 't-2',
    title: 'Refactor auth middleware',
    description: 'Reduce duplication and align authorization checks with team isolation rules.',
    priority: 'medium',
    status: 'in-progress',
    team: 'Backend',
    assigneeId: 'u-omar',
    assigneeName: 'Omar Ali',
    projectId: 'p-api',
    deadline: iso(5),
    createdAt: iso(-8),
    updatedAt: iso(-2),
    labels: ['auth', 'security']
  },
  {
    id: 't-3',
    title: 'Design navigation menu',
    description: 'Align the sidebar with the new information hierarchy and mobile behavior.',
    priority: 'low',
    status: 'in-review',
    team: 'Frontend',
    assigneeId: 'u-sara',
    assigneeName: 'Sara Khan',
    projectId: 'p-redesign',
    deadline: iso(7),
    createdAt: iso(-10),
    updatedAt: iso(-1),
    labels: ['navigation', 'ux']
  },
  {
    id: 't-4',
    title: 'Optimize database queries',
    description: 'Audit slow queries and apply index and projection improvements where needed.',
    priority: 'urgent',
    status: 'done',
    team: 'Backend',
    assigneeId: 'u-omar',
    assigneeName: 'Omar Ali',
    projectId: 'p-api',
    deadline: iso(-2),
    createdAt: iso(-12),
    updatedAt: iso(-1),
    labels: ['performance', 'database']
  }
];

export const demoComments: Comment[] = [
  {
    id: 'c-1',
    taskId: 't-1',
    userId: 'u-ali',
    userName: 'Ali Hassan',
    content: 'Please prioritize this for the next sprint.',
    createdAt: iso(-2)
  },
  {
    id: 'c-2',
    taskId: 't-1',
    userId: 'u-sara',
    userName: 'Sara Khan',
    content: 'Working on this now. I will have a fix ready by end of day.',
    createdAt: iso(-1)
  },
  {
    id: 'c-3',
    taskId: 't-2',
    userId: 'u-omar',
    userName: 'Omar Ali',
    content: 'I have updated the middleware. Running tests now.',
    createdAt: iso(-1)
  }
];

export const demoActivities: Activity[] = [
  {
    id: 'a-1',
    taskId: 't-1',
    userId: 'u-ali',
    userName: 'Ali Hassan',
    action: 'created task',
    timestamp: iso(-4)
  },
  {
    id: 'a-2',
    taskId: 't-1',
    userId: 'u-ali',
    userName: 'Ali Hassan',
    action: 'assigned to Sara',
    timestamp: iso(-3)
  },
  {
    id: 'a-3',
    taskId: 't-1',
    userId: 'u-sara',
    userName: 'Sara Khan',
    action: 'changed status to In Progress',
    timestamp: iso(-1)
  }
];

export const demoNotifications: Notification[] = [
  {
    id: 'n-1',
    title: 'Task assigned',
    message: 'Fix header responsiveness was assigned to Sara.',
    timestamp: iso(-1),
    read: false,
    type: 'task_assigned',
    taskId: 't-1'
  },
  {
    id: 'n-2',
    title: 'Comment added',
    message: 'Ali commented on Fix header responsiveness.',
    timestamp: iso(-1),
    read: true,
    type: 'comment_added',
    taskId: 't-1'
  },
  {
    id: 'n-3',
    title: 'Deadline approaching',
    message: 'Optimize database queries is overdue and needs attention.',
    timestamp: iso(0),
    read: false,
    type: 'deadline_approaching',
    taskId: 't-4'
  }
];