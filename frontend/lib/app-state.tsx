"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import {
  apiAddTaskComment,
  apiCreateProject,
  apiCreateTask,
  apiCreateTeam,
  apiCreateUser,
  apiDeleteTask,
  apiGetProjects,
  apiGetTaskAudit,
  apiGetTaskComments,
  apiGetTasks,
  apiGetTeam,
  apiGetTeams,
  apiGetUsers,
  apiGetUser,
  apiLogin,
  apiUpdateTask,
  apiUploadTaskImage,
  decodeJwt,
  type AuthTokens,
  type BackendAuditLog,
  type BackendComment,
  type BackendProject,
  type BackendTask,
  type BackendTeam,
  type BackendUser,
  type JwtClaims,
} from "@/lib/backend-api";
import {
  Activity,
  Comment,
  CreateProjectInput,
  CreateTaskInput,
  CreateUserInput,
  Notification,
  Project,
  Task,
  Team,
  TeamName,
  User,
} from "@/lib/types";
import { resolveTeamId } from "@/lib/utils";

interface AppState {
  user: User | null;
  teamFilter: TeamName;
  searchQuery: string;
  users: User[];
  teams: Team[];
  tasks: Task[];
  projects: Project[];
  comments: Comment[];
  activities: Activity[];
  notifications: Notification[];
  ready: boolean;
}

interface AppContextValue extends AppState {
  login: (email: string, password: string) => Promise<boolean>;
  loginAsDemo: (userId: string) => Promise<boolean>;
  logout: () => void;
  setTeamFilter: (team: TeamName) => void;
  setSearchQuery: (query: string) => void;
  updateTaskStatus: (taskId: string, status: Task["status"]) => void;
  updateTask: (taskId: string, patch: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  createTask: (input: CreateTaskInput, imageFile?: File) => Promise<boolean>;
  addComment: (taskId: string, content: string) => void;
  markNotificationRead: (notificationId: string) => void;
  createProject: (input: CreateProjectInput) => void;
  createUser: (input: CreateUserInput) => void;
  createTeam: (name: string) => void;
  refreshTeams: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const initialState: AppState = {
  user: null,
  teamFilter: "All",
  searchQuery: "",
  users: [],
  teams: [],
  tasks: [],
  projects: [],
  comments: [],
  activities: [],
  notifications: [],
  ready: false,
};

const demoCredentials: Record<string, { email: string; password: string }> = {
  "u-ali": { email: "ali@company.com", password: "password" },
  "u-sara": { email: "sara@company.com", password: "password" },
  "u-omar": { email: "omar@company.com", password: "password" },
};

type Session = {
  tokens: AuthTokens;
  user: User;
};

function sanitizeDeadline(deadline?: string) {
  if (!deadline?.trim()) return "";
  const parsed = Date.parse(deadline);
  return Number.isNaN(parsed) ? "" : deadline;
}

function normalizePriority(priority?: string): Task["priority"] {
  switch ((priority ?? "").toLowerCase()) {
    case "low":
      return "low";
    case "high":
      return "high";
    case "critical":
    case "urgent":
      return "urgent";
    default:
      return "medium";
  }
}

function getDisplayName(name?: string, email?: string) {
  return name ?? email ?? "User";
}

function normalizeStatus(status?: string): Task["status"] {
  const value = (status ?? "").toLowerCase();
  if (value.includes("progress")) return "in-progress";
  if (value.includes("review")) return "in-review";
  if (value.includes("done")) return "done";
  return "todo";
}

function backendStatus(status: Task["status"]) {
  switch (status) {
    case "todo":
      return "To Do";
    case "in-progress":
      return "In Progress";
    case "in-review":
      return "In Review";
    case "done":
      return "Done";
  }
}

function toTeamName(teamId: string | undefined, teams: BackendTeam[] = []) {
  if (!teamId) return "All";
  const team = teams.find(
    (item) => item.teamID === teamId || item.name === teamId,
  );
  return team?.name ?? "All";
}

function normalizeUser(user: BackendUser, teams: BackendTeam[] = []): User {
  const displayName = user.name ?? user.email ?? "User";
  return {
    id: user.userID,
    name: displayName,
    email: user.email,
    password: "",
    role: (user.role as User["role"]) ?? "employee",
    teamId: user.teamID,
    team: toTeamName(user.teamID, teams),
    avatar: displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join(""),
  };
}

function normalizeTask(
  task: BackendTask,
  users: User[],
  teams: BackendTeam[],
): Task {
  const assignee = users.find((user) => user.id === task.assigneeID);
  return {
    id: task.taskID,
    title: task.title,
    description: task.description ?? "",
    priority: normalizePriority(task.priority),
    status: normalizeStatus(task.status),
    team: toTeamName(task.teamID, teams),
    teamId: task.teamID,
    assigneeId: task.assigneeID ?? "",
    assigneeName: assignee?.name ?? "Unassigned",
    projectId: task.projectID ?? "",
    deadline: sanitizeDeadline(task.deadline),
    createdAt: task.createdAt ?? new Date().toISOString(),
    updatedAt: task.updatedAt ?? task.createdAt ?? new Date().toISOString(),
    imageKey: task.imageKey,
  };
}

function normalizeProject(project: BackendProject, users: User[]): Project {
  const creator = users.find((user) => user.id === project.createdBy);
  return {
    id: project.projectID,
    name: project.name,
    description: project.description ?? "",
    team: creator?.team ?? "All",
    createdAt: project.createdAt ?? new Date().toISOString(),
    createdById: project.createdBy,
  };
}

function normalizeComment(comment: BackendComment): Comment {
  const raw = comment as BackendComment & {
    commentId?: string;
    taskId?: string;
    authorId?: string;
  };
  return {
    id: raw.commentID ?? raw.commentId ?? "",
    taskId: raw.taskID ?? raw.taskId ?? "",
    userId: raw.authorID ?? raw.authorId ?? "",
    userName: raw.authorName ?? "User",
    content: raw.content,
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}

function normalizeActivity(log: BackendAuditLog): Activity {
  const id =
    log.LogID ?? (log as { logId?: string }).logId ?? crypto.randomUUID();
  const taskId = log.taskID ?? (log as { taskId?: string }).taskId ?? "";
  const action =
    log.oldStatus && log.newStatus
      ? `changed status from ${log.oldStatus} to ${log.newStatus}`
      : ((log as { action?: string }).action ?? "updated task");
  return {
    id,
    taskId,
    userId: log.changedBy ?? "system",
    userName: log.changedBy ?? "System",
    action,
    timestamp: log.timestamp ?? new Date().toISOString(),
  };
}

function buildNotifications(
  tasks: Task[],
  comments: Comment[],
  activities: Activity[],
) {
  const notifications: Notification[] = [];

  for (const task of tasks) {
    notifications.push({
      id: `notify-${task.id}-assigned`,
      title: "Task assigned",
      message: `${task.title} is assigned to ${task.assigneeName}.`,
      timestamp: task.updatedAt,
      read: false,
      type: "task_assigned",
      taskId: task.id,
    });
  }

  for (const comment of comments) {
    notifications.push({
      id: `notify-${comment.id}-comment`,
      title: "Comment added",
      message: `${comment.userName} commented on a task.`,
      timestamp: comment.createdAt,
      read: false,
      type: "comment_added",
      taskId: comment.taskId,
    });
  }

  for (const activity of activities) {
    notifications.push({
      id: `notify-${activity.id}-status`,
      title: "Status changed",
      message: activity.action,
      timestamp: activity.timestamp,
      read: false,
      type: "status_changed",
      taskId: activity.taskId,
    });
  }

  return notifications.sort((left, right) =>
    right.timestamp.localeCompare(left.timestamp),
  );
}

function createSessionFromTokens(tokens: AuthTokens): Session {
  const claims = decodeJwt<JwtClaims>(tokens.idToken);
  return {
    tokens,
    user: {
      id: claims.sub,
      name: (claims.name as string) ?? claims.email ?? "User",
      email: claims.email ?? "",
      password: "",
      role: ((claims["custom:role"] as string) ?? "employee") as User["role"],
      team: "All",
      teamId: (claims["custom:teamId"] as string | undefined) || undefined,
      avatar: ((claims.name as string) ?? claims.email ?? "U")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join(""),
    },
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [session, setSession] = useState<Session | null>(null);

  const loadSession = async (activeSession: Session | null) => {
    if (!activeSession) {
      setState((current) => ({ ...current, ready: true }));
      return;
    }

    try {
      const currentUser = activeSession.user;
      const token = activeSession.tokens.idToken;

      const [tasksRaw, projectsRaw] = await Promise.all([
        apiGetTasks(token),
        apiGetProjects(token),
      ]);

      let teamsRaw: BackendTeam[] = [];
      let usersRaw: BackendUser[] = [];

      if (currentUser.role === "manager" || currentUser.role === "admin") {
        const [teamsResponse, usersResponse] = await Promise.all([
          apiGetTeams(token),
          apiGetUsers(token),
        ]);
        teamsRaw = teamsResponse;
        usersRaw = usersResponse;
      } else {
        usersRaw = [
          {
            userID: currentUser.id,
            email: currentUser.email,
            name: currentUser.name,
            role: currentUser.role,
            teamID: currentUser.teamId,
          },
        ];
        if (currentUser.teamId) {
          try {
            teamsRaw = [await apiGetTeam(token, currentUser.teamId)];
          } catch {
            teamsRaw = [];
          }
        }
      }

      const taskAssigneeIds = Array.from(
        new Set(
          tasksRaw.map((task) => task.assigneeID).filter(Boolean) as string[],
        ),
      );
      const projectCreatorIds = Array.from(
        new Set(
          projectsRaw
            .map((project) => project.createdBy)
            .filter(Boolean) as string[],
        ),
      );
      const missingUserIds = [...taskAssigneeIds, ...projectCreatorIds].filter(
        (id) => !usersRaw.some((user) => user.userID === id),
      );

      const resolvableUserIds = missingUserIds.filter(
        (id) => !/^assignee\d+$/i.test(id),
      );
      const extraUsers = await Promise.all(
        resolvableUserIds.map((id) => apiGetUser(token, id).catch(() => null)),
      );
      usersRaw = [
        ...usersRaw,
        ...(extraUsers.filter(Boolean) as BackendUser[]),
      ];

      const normalizedUsers = usersRaw.map((user) =>
        normalizeUser(user, teamsRaw),
      );
      const normalizedTeams = teamsRaw.map((team) => {
        const id = team.teamID ?? (team as { teamId?: string }).teamId ?? "";
        return {
          id,
          name: team.name,
          memberCount: usersRaw.filter(
            (user) => user.teamID === id || user.teamID === team.name,
          ).length,
          projectCount: projectsRaw.filter(
            (project) =>
              normalizedUsers.find((user) => user.id === project.createdBy)
                ?.teamId === id,
          ).length,
        };
      });

      const normalizedTasks = tasksRaw.map((task) =>
        normalizeTask(task, normalizedUsers, teamsRaw),
      );
      const normalizedProjects = projectsRaw.map((project) =>
        normalizeProject(project, normalizedUsers),
      );

      const commentSets = await Promise.all(
        normalizedTasks.map((task) =>
          apiGetTaskComments(token, task.id).catch(
            () => [] as BackendComment[],
          ),
        ),
      );
      const auditSets = await Promise.all(
        normalizedTasks.map((task) =>
          apiGetTaskAudit(token, task.id).catch(() => [] as BackendAuditLog[]),
        ),
      );

      const normalizedComments = commentSets.flat().map(normalizeComment);
      const normalizedActivities = auditSets.flat().map(normalizeActivity);
      const notifications = buildNotifications(
        normalizedTasks,
        normalizedComments,
        normalizedActivities,
      );

      setState((current) => ({
        ...current,
        user: {
          ...currentUser,
          team:
            currentUser.role === "employee" && teamsRaw[0]
              ? teamsRaw[0].name
              : currentUser.team,
        },
        teamFilter:
          currentUser.role === "employee"
            ? currentUser.team
            : current.teamFilter,
        users: normalizedUsers,
        teams: normalizedTeams,
        tasks: normalizedTasks,
        projects: normalizedProjects,
        comments: normalizedComments,
        activities: normalizedActivities,
        notifications,
        ready: true,
      }));
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load data from backend",
      );
      setState((current) => ({
        ...current,
        user: activeSession.user,
        ready: true,
      }));
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem("mini-jira-session");
    if (!stored) {
      setState((current) => ({ ...current, ready: true }));
      return;
    }

    try {
      const parsed = JSON.parse(stored) as Session;
      setSession(parsed);
      void loadSession(parsed);
    } catch {
      window.localStorage.removeItem("mini-jira-session");
      setState((current) => ({ ...current, ready: true }));
    }
  }, []);

  useEffect(() => {
    if (!state.ready || typeof window === "undefined") return;

    if (session) {
      window.localStorage.setItem("mini-jira-session", JSON.stringify(session));
    } else {
      window.localStorage.removeItem("mini-jira-session");
    }
  }, [session, state.ready]);

  const login = async (email: string, password: string) => {
    try {
      const tokens = await apiLogin(email, password);
      const nextSession = createSessionFromTokens(tokens);
      setSession(nextSession);
      await loadSession(nextSession);
      toast.success(
        `Welcome back, ${getDisplayName(nextSession.user.name, nextSession.user.email).split(" ")[0]}`,
      );
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Invalid email or password",
      );
      return false;
    }
  };

  const loginAsDemo = async (userId: string) => {
    const credentials = demoCredentials[userId];
    if (!credentials) return false;
    return login(credentials.email, credentials.password);
  };

  const logout = () => {
    setSession(null);
    setState({ ...initialState, ready: true });
    toast.success("Logged out successfully");
  };

  const setTeamFilter = (team: TeamName) => {
    setState((current) => ({
      ...current,
      teamFilter: current.user?.role === "employee" ? current.user.team : team,
    }));
  };

  const setSearchQuery = (query: string) => {
    setState((current) => ({ ...current, searchQuery: query }));
  };

  const updateTaskStatus = (taskId: string, status: Task["status"]) => {
    if (!session) return;
    void apiUpdateTask(session.tokens.idToken, taskId, {
      status: backendStatus(status),
    })
      .then(() => loadSession(session))
      .catch((error) =>
        toast.error(
          error instanceof Error ? error.message : "Failed to update task",
        ),
      );
    toast.success("Task status updated");
  };

  const updateTask = (taskId: string, patch: Partial<Task>) => {
    if (!session) return;
    const body: Record<string, unknown> = {};
    if (patch.title !== undefined) body.title = patch.title;
    if (patch.description !== undefined) body.description = patch.description;
    if (patch.status !== undefined) body.status = backendStatus(patch.status);
    if (patch.priority !== undefined)
      body.priority = patch.priority === "urgent" ? "critical" : patch.priority;
    if (patch.deadline !== undefined) body.deadline = patch.deadline;
    if (patch.assigneeId !== undefined) body.assigneeID = patch.assigneeId;
    if (patch.teamId !== undefined) body.teamID = patch.teamId;
    if (patch.projectId !== undefined) body.projectID = patch.projectId;

    void apiUpdateTask(session.tokens.idToken, taskId, body)
      .then(() => loadSession(session))
      .catch((error) =>
        toast.error(
          error instanceof Error ? error.message : "Failed to save task",
        ),
      );
    toast.success("Task saved");
  };

  const deleteTask = (taskId: string) => {
    if (!session) return;
    void apiDeleteTask(session.tokens.idToken, taskId)
      .then(() => loadSession(session))
      .catch((error) =>
        toast.error(
          error instanceof Error ? error.message : "Failed to delete task",
        ),
      );
    toast.success("Task deleted successfully");
  };

  const refreshTeams = useCallback(async () => {
    if (!session) return;
    if (session.user.role !== "manager" && session.user.role !== "admin")
      return;

    try {
      const teamsRaw = await apiGetTeams(session.tokens.idToken);
      setState((current) => ({
        ...current,
        teams: teamsRaw.map((team) => {
          const id = team.teamID ?? (team as { teamId?: string }).teamId ?? "";
          return {
            id,
            name: team.name,
            memberCount: current.users.filter(
              (user) => user.teamId === id || user.teamId === team.name,
            ).length,
            projectCount: current.projects.filter(
              (project) =>
                current.users.find((user) => user.id === project.createdById)
                  ?.teamId === id,
            ).length,
          };
        }),
      }));
    } catch (error) {
      console.error(error);
      toast.error("Could not refresh teams list");
    }
  }, [session]);

  const createTask = async (input: CreateTaskInput, imageFile?: File) => {
    if (!session) return false;
    const teamId = input.teamId || state.user?.teamId || "";
    const body = {
      title: input.title,
      description: input.description,
      priority: input.priority === "urgent" ? "critical" : input.priority,
      deadline: input.deadline,
      assigneeID: input.assigneeId,
      teamID: teamId,
      ...(input.projectId ? { projectID: input.projectId } : {}),
    };
    try {
      const created = await apiCreateTask(session.tokens.idToken, body);
      if (imageFile) {
        try {
          await apiUploadTaskImage(
            session.tokens.idToken,
            created.taskID,
            imageFile,
          );
        } catch (error) {
          await loadSession(session);
          toast.error(
            error instanceof Error
              ? `Task created, but image upload failed: ${error.message}`
              : "Task created, but image upload failed",
          );
          return true;
        }
      }
      await loadSession(session);
      toast.success(imageFile ? "Task created with image" : "Task created");
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create task",
      );
      return false;
    }
  };

  const addComment = (taskId: string, content: string) => {
    if (!session) return;
    void apiAddTaskComment(session.tokens.idToken, taskId, content)
      .then((created) => {
        const normalized = normalizeComment(created);
        setState((current) => ({
          ...current,
          comments: [
            ...current.comments.filter((item) => item.id !== normalized.id),
            normalized,
          ],
        }));
        toast.success("Comment added");
      })
      .catch((error) =>
        toast.error(
          error instanceof Error ? error.message : "Failed to add comment",
        ),
      );
  };

  const markNotificationRead = (notificationId: string) => {
    setState((current) => ({
      ...current,
      notifications: current.notifications.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification,
      ),
    }));
  };

  const createProject = (input: CreateProjectInput) => {
    if (!session) return;
    void apiCreateProject(session.tokens.idToken, {
      name: input.name,
      description: input.description,
    })
      .then(() => loadSession(session))
      .catch((error) =>
        toast.error(
          error instanceof Error ? error.message : "Failed to create project",
        ),
      );
    toast.success("Project created");
  };

  const createUser = (input: CreateUserInput) => {
    if (!session) return;
    void apiCreateUser(session.tokens.idToken, {
      email: input.email,
      name: input.name,
      password: input.password,
      role: input.role,
      teamID: resolveTeamId(input.team, state.teams),
    })
      .then(() => loadSession(session))
      .catch((error) =>
        toast.error(
          error instanceof Error ? error.message : "Failed to create user",
        ),
      );
    toast.success("User created");
  };

  const createTeam = (name: string) => {
    if (!session) return;
    void apiCreateTeam(session.tokens.idToken, { name })
      .then(() => loadSession(session))
      .catch((error) =>
        toast.error(
          error instanceof Error ? error.message : "Failed to create team",
        ),
      );
    toast.success("Team created");
  };

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      login,
      loginAsDemo,
      logout,
      setTeamFilter,
      setSearchQuery,
      updateTaskStatus,
      updateTask,
      deleteTask,
      createTask,
      addComment,
      markNotificationRead,
      createProject,
      createUser,
      createTeam,
      refreshTeams,
    }),
    [state],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }

  return context;
}
