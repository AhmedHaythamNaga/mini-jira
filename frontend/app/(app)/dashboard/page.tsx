"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useApp } from "@/lib/app-state";
import { DashboardWidgets } from "@/components/dashboard-widgets";
import { TaskFormModal } from "@/components/task-form-modal";
import { canManageAll, filterTaskByScope, matchesSearch } from "@/lib/utils";

export default function DashboardPage() {
  const { user, tasks, teams, teamFilter, searchQuery } = useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const displayName = user?.name ?? user?.email ?? "User";
  const canCreateTask = canManageAll(user);

  const scopedTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          filterTaskByScope(task, user, teamFilter) &&
          matchesSearch(task, searchQuery),
      ),
    [searchQuery, tasks, teamFilter, user],
  );

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Dashboard</h1>
          <p>
            Welcome back{user ? `, ${displayName.split(" ")[0]}` : ""}. Here is
            the current team pulse.
          </p>
        </div>
        {canCreateTask ? (
          <button
            className="button button--primary"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={16} />
            New Task
          </button>
        ) : null}
      </div>

      <DashboardWidgets
        tasks={scopedTasks}
        teams={teams}
        managerView={canManageAll(user)}
      />

      <TaskFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
