"use client";

import { useMemo, useState } from 'react';
import { ArrowDownAZ, ArrowDownWideNarrow, Funnel } from 'lucide-react';
import { TaskDetailModal } from '@/components/task-detail-modal';
import { useApp } from '@/lib/app-state';
import { Task } from '@/lib/types';
import { filterTaskByScope, formatDate, matchesSearch, priorityLabels, priorityOrder, statusLabels, taskIsOverdue } from '@/lib/utils';

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
  const { user, tasks, teamFilter, searchQuery } = useApp();
  const [sortKey, setSortKey] = useState<SortKey>('deadline');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const visibleTasks = useMemo(() => {
    const filtered = tasks.filter((task) => filterTaskByScope(task, user, teamFilter) && matchesSearch(task, searchQuery));

    return [...filtered].sort((left, right) => {
      if (sortKey === 'deadline') return new Date(left.deadline).getTime() - new Date(right.deadline).getTime();
      if (sortKey === 'priority') return priorityWeight[left.priority] - priorityWeight[right.priority];
      return statusWeight[left.status] - statusWeight[right.status];
    });
  }, [searchQuery, sortKey, tasks, teamFilter, user]);

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
                    <td><span className={`badge badge--${task.priority}`}>{priorityLabels[task.priority]}</span></td>
                    <td><span className="badge badge--slate">{statusLabels[task.status]}</span></td>
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