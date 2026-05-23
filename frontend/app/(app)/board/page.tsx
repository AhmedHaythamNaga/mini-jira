"use client";

import { useMemo, useState } from 'react';
import { Filter, Plus } from 'lucide-react';
import { TaskCard } from '@/components/task-card';
import { TaskDetailModal } from '@/components/task-detail-modal';
import { TaskFormModal } from '@/components/task-form-modal';
import { useApp } from '@/lib/app-state';
import { canManageAll, filterTaskByScope, matchesSearch } from '@/lib/utils';
import { Task, TaskStatus } from '@/lib/types';

const columns: { status: TaskStatus; label: string }[] = [
  { status: 'todo', label: 'To Do' },
  { status: 'in-progress', label: 'In Progress' },
  { status: 'in-review', label: 'In Review' },
  { status: 'done', label: 'Done' }
];

export default function BoardPage() {
  const { user, tasks, teams, users, teamFilter, searchQuery, updateTaskStatus, ready } = useApp();
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all');
  const [teamScope, setTeamScope] = useState('all');

  const boardTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const matchesTeam = filterTaskByScope(task, user, teamFilter, users);
        const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
        const matchesLocalTeam = teamScope === 'all' || task.team === teamScope;
        return matchesTeam && matchesPriority && matchesLocalTeam && matchesSearch(task, searchQuery);
      }),
    [priorityFilter, searchQuery, teamFilter, tasks, teamScope, user, users]
  );

  const onDropToStatus = (status: TaskStatus) => {
    if (!draggedTaskId) return;
    updateTaskStatus(draggedTaskId, status);
    setDraggedTaskId(null);
  };

  if (!ready || !user) {
    return null;
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Team Board</h1>
          <p>{canManageAll(user) ? `Showing ${teamFilter === 'All' ? 'all teams' : teamFilter}` : `Locked to ${user?.team ?? 'your team'}`}</p>
        </div>
        <div className="page__header-actions">
          {canManageAll(user) ? (
            <button className="button button--secondary" onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              New Task
            </button>
          ) : null}
          <button className="button button--ghost" onClick={() => setPriorityFilter('all')}>
            <Filter size={16} />
            Reset Filters
          </button>
        </div>
      </div>

      <section className="toolbar">
        <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as typeof priorityFilter)}>
          <option value="all">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        {canManageAll(user) ? (
          <select value={teamScope} onChange={(event) => setTeamScope(event.target.value)}>
            <option value="all">All teams</option>
            {teams.map((team) => (
              <option key={team.id} value={team.name}>
                {team.name}
              </option>
            ))}
          </select>
        ) : null}
      </section>

      <section className="board">
        {columns.map((column) => {
          const columnTasks = boardTasks.filter((task) => task.status === column.status);

          return (
            <div key={column.status} className="board-column" onDragOver={(event) => event.preventDefault()} onDrop={() => onDropToStatus(column.status)}>
              <header className="board-column__header">
                <div>
                  <h2>{column.label}</h2>
                  <p>{columnTasks.length} tasks</p>
                </div>
                {canManageAll(user) ? (
                  <button className="icon-button" onClick={() => setCreateOpen(true)} aria-label={`Add task to ${column.label}`}>
                    <Plus size={16} />
                  </button>
                ) : null}
              </header>

              <div className="board-column__list">
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    draggable
                    onDragStart={() => setDraggedTaskId(task.id)}
                    onClick={() => setSelectedTask(task)}
                  />
                ))}

                {!columnTasks.length ? <div className="board-column__empty">Drop tasks here</div> : null}
              </div>
            </div>
          );
        })}
      </section>

      <TaskDetailModal task={selectedTask} open={Boolean(selectedTask)} onClose={() => setSelectedTask(null)} />
      <TaskFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}