import { formatDistanceToNow, isPast, isValid, parseISO } from "date-fns";
import { Priority, Task, TaskStatus, TeamName, User } from "@/lib/types";

export const statusLabels: Record<TaskStatus, string> = {
  todo: "To Do",
  "in-progress": "In Progress",
  "in-review": "In Review",
  done: "Done",
};

export const priorityLabels: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const priorityOrder: Priority[] = ["urgent", "high", "medium", "low"];

export function teamFilterOptions(teams: { id: string; name: string }[]) {
  return ["All", ...teams.map((team) => team.name)];
}

export function defaultTeamName(teams: { name: string }[], userTeam?: string) {
  if (userTeam && userTeam !== "All") return userTeam;
  return teams[0]?.name ?? "";
}

export function resolveTeamId(
  teamName: TeamName,
  teams: { id: string; name: string }[] = [],
) {
  if (!teamName || teamName === "All") return "";
  const match = teams.find(
    (team) => team.name === teamName || team.id === teamName,
  );
  return match?.id ?? "";
}

export function parseDateSafe(value?: string) {
  if (!value?.trim()) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

export function initials(name?: string) {
  if (!name?.trim()) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function priorityLabel(priority: Priority | string) {
  return priorityLabels[priority as Priority] ?? priority;
}

export function statusLabel(status: TaskStatus | string) {
  return statusLabels[status as TaskStatus] ?? String(status);
}

export function formatDate(value: string) {
  const parsed = parseDateSafe(value);
  if (!parsed) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

export function timeAgo(value: string) {
  const parsed = parseDateSafe(value);
  if (!parsed) return "";
  return formatDistanceToNow(parsed, { addSuffix: true });
}

export function taskIsOverdue(task: Task) {
  const parsed = parseDateSafe(task.deadline);
  if (!parsed) return false;
  return isPast(parsed) && task.status !== "done";
}

export function teamVisibleForUser(
  team: TeamName,
  user: User | null,
  selectedTeam: TeamName,
) {
  if (!user) return false;
  if (user.role === "manager" || user.role === "admin") {
    return selectedTeam === "All" || team === selectedTeam || team === "All";
  }
  return team === user.team || team === "All";
}

export function canManageAll(user: User | null) {
  return user?.role === "manager" || user?.role === "admin";
}

export function isTaskAssignedToUser(
  task: Task,
  user: User | null,
  users: User[] = [],
) {
  if (!user) return false;
  if (task.assigneeId && task.assigneeId === user.id) return true;

  const assignee = users.find((item) => item.id === task.assigneeId);
  if (
    assignee?.email &&
    user.email &&
    assignee.email.toLowerCase() === user.email.toLowerCase()
  ) {
    return true;
  }

  return false;
}

export function filterTaskByScope(
  task: Task,
  user: User | null,
  teamFilter: TeamName,
) {
  if (!user) return false;
  if (user.role === "manager" || user.role === "admin") {
    return (
      teamFilter === "All" || task.team === teamFilter || task.team === "All"
    );
  }
  return (
    task.team === user.team ||
    task.team === "All" ||
    isTaskAssignedToUser(task, user)
  );
}

export function matchesSearch(task: Task, query: string) {
  if (!query.trim()) return true;
  const search = query.toLowerCase();
  return [
    task.title,
    task.description,
    task.assigneeName,
    task.priority,
    task.team,
    ...(task.labels ?? []),
  ]
    .join(" ")
    .toLowerCase()
    .includes(search);
}

export function statusStyle(status: TaskStatus | string) {
  switch (status) {
    case "todo":
      return "badge badge--slate";
    case "in-progress":
      return "badge badge--blue";
    case "in-review":
      return "badge badge--violet";
    case "done":
      return "badge badge--green";
    default:
      return "badge badge--slate";
  }
}

export function priorityStyle(priority: Priority | string) {
  switch (priority) {
    case "low":
      return "badge badge--green";
    case "medium":
      return "badge badge--amber";
    case "high":
      return "badge badge--orange";
    case "urgent":
      return "badge badge--red";
    default:
      return "badge badge--amber";
  }
}

const TEAM_BADGE_VARIANTS = [
  "badge--blue",
  "badge--violet",
  "badge--green",
  "badge--orange",
] as const;

export function teamStyle(team: TeamName) {
  if (!team || team === "All") return "badge badge--slate";
  const index =
    Math.abs(
      team.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0),
    ) % TEAM_BADGE_VARIANTS.length;
  return `badge ${TEAM_BADGE_VARIANTS[index]}`;
}
