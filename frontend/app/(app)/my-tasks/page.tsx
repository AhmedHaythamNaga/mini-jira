"use client";

import { useMemo, useState } from 'react';
import { ArrowDownAZ, ArrowDownWideNarrow, Funnel } from 'lucide-react';
import { TaskDetailModal } from '@/components/task-detail-modal';
import { useApp } from '@/lib/app-state';
import { Task } from '@/lib/types';
import { filterTaskByScope, formatDate, matchesSearch, parseDateSafe, priorityLabel, priorityOrder, statusLabel, taskIsOverdue } from '@/lib/utils';

type SortKey = 'deadline' | 'priority' | 'status';

const priorityWeight: Record<Task['priority'], number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3
};

const statusWeight: Record<Task['status'], number> = {
  todo: 0,
  'in-progress': 1,
  'in-review': 2,
  done: 3
};

export default function MyTasksPage() {
  const { user, tasks, teamFilter, searchQuery, ready } = useApp();
  const [sortKey, setSortKey] = useState<SortKey>('deadline');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const visibleTasks = useMemo(() => {
    if (!user) return [];

    const filtered = tasks.filter(
      (task) =>
        task.assigneeId === user.id &&
        filterTaskByScope(task, user, teamFilter) &&
        matchesSearch(task, searchQuery),
    );

    return [...filtered].sort((left, right) => {
      if (sortKey === 'deadline') {
        const leftTime = parseDateSafe(left.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const rightTime = parseDateSafe(right.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      }
      if (sortKey === 'priority') {
        return (priorityWeight[left.priority] ?? 99) - (priorityWeight[right.priority] ?? 99);
      }
      return (statusWeight[left.status] ?? 99) - (statusWeight[right.status] ?? 99);
    });
  }, [searchQuery, sortKey, tasks, teamFilter, user]);

  if (!ready || !user) {
    return null;
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>My Tasks</h1>
          <p>Everything assigned to you, sorted the way you want.</p>
        </div>
        <div className="page__header-actions">
          <button className={`button ${sortKey === 'deadline' ? 'button--primary' : 'button--secondary'}`} onClick={() => setSortKey('deadline')}>
            <ArrowDownWideNarrow size={16} />
            Deadline
          </button>
          <button className={`button ${sortKey === 'priority' ? 'button--primary' : 'button--secondary'}`} onClick={() => setSortKey('priority')}>
            <ArrowDownAZ size={16} />
            Priority
          </button>
          <button className={`button ${sortKey === 'status' ? 'button--primary' : 'button--secondary'}`} onClick={() => setSortKey('status')}>
            <Funnel size={16} />
            Status
          </button>
        </div>
      </div>

      <section className="panel panel--wide">
        {visibleTasks.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Deadline</th>
                  <th>Team</th>
                </tr>
              </thead>
              <tbody>
                {visibleTasks.map((task) => (
                  <tr key={task.id} onClick={() => setSelectedTask(task)}>
                    <td>
                      <strong>{task.title}</strong>
                      <p>{task.description}</p>
                    </td>
                    <td><span className={`badge badge--${task.priority}`}>{priorityLabel(task.priority)}</span></td>
                    <td><span className="badge badge--slate">{statusLabel(task.status)}</span></td>
                    <td className={taskIsOverdue(task) ? 'table__overdue' : ''}>{formatDate(task.deadline)}</td>
                    <td>{task.team}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state empty-state--full">
            <h2>No tasks assigned to you</h2>
            <p>Once tasks are assigned, they will appear here automatically.</p>
          </div>
        )}
      </section>

      <TaskDetailModal task={selectedTask} open={Boolean(selectedTask)} onClose={() => setSelectedTask(null)} />
    </div>
  );
}