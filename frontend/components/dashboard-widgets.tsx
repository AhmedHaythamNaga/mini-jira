"use client";

import { AlertCircle, ArrowUpRight, CheckCircle2, Clock3, type LucideIcon } from 'lucide-react';
import { Task } from '@/lib/types';
import { formatDate, priorityLabels, priorityOrder, statusLabels, taskIsOverdue } from '@/lib/utils';

export function MetricCard({ title, value, icon: Icon, accent, description }: { title: string; value: number; icon: LucideIcon; accent: string; description: string }) {
  return (
    <article className="metric-card">
      <div className={`metric-card__icon metric-card__icon--${accent}`}>
        <Icon size={18} />
      </div>
      <div>
        <p>{title}</p>
        <h3>{value}</h3>
        <small>{description}</small>
      </div>
    </article>
  );
}

function MiniBarChart({ tasks }: { tasks: Task[] }) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const iso = date.toDateString();
    const count = tasks.filter((task) => new Date(task.createdAt).toDateString() === iso).length;
    return { label: date.toLocaleDateString('en', { weekday: 'short' }), value: count };
  });

  const max = Math.max(...days.map((day) => day.value), 1);

  return (
    <div className="chart chart--bars" aria-label="Tasks created in the last 7 days">
      {days.map((day) => (
        <div key={day.label} className="chart__bar-wrap">
          <div className="chart__bar" style={{ height: `${(day.value / max) * 100}%` }} />
          <span>{day.label}</span>
        </div>
      ))}
    </div>
  );
}

function MiniPieChart({ tasks }: { tasks: Task[] }) {
  const counts = priorityOrder.map((priority) => ({ priority, value: tasks.filter((task) => task.priority === priority).length }));
  const total = Math.max(counts.reduce((sum, item) => sum + item.value, 0), 1);
  const colors: Record<string, string> = {
    low: '#22c55e',
    medium: '#facc15',
    high: '#fb923c',
    urgent: '#ef4444'
  };

  let offset = 0;
  return (
    <div className="pie-wrap">
      <svg viewBox="0 0 120 120" className="pie">
        {counts.map((item) => {
          const percent = item.value / total;
          const stroke = percent * 282.6;
          const circleOffset = 282.6 - offset;
          offset += stroke;
          return <circle key={item.priority} cx="60" cy="60" r="45" fill="none" stroke={colors[item.priority]} strokeWidth="16" strokeDasharray={`${stroke} ${282.6 - stroke}`} strokeDashoffset={circleOffset} transform="rotate(-90 60 60)" />;
        })}
      </svg>
      <div className="pie-legend">
        {counts.map((item) => (
          <div key={item.priority}>
            <span style={{ background: colors[item.priority as keyof typeof colors] }} />
            {priorityLabels[item.priority as keyof typeof priorityLabels]}
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamBarChart({ tasks }: { tasks: Task[] }) {
  const teams = ['Frontend', 'Backend'] as const;
  const counts = teams.map((team) => ({ team, value: tasks.filter((task) => task.team === team && task.status === 'done').length }));
  const max = Math.max(...counts.map((item) => item.value), 1);

  return (
    <div className="chart chart--teams">
      {counts.map((item) => (
        <div key={item.team}>
          <div className="chart__team-head">
            <strong>{item.team}</strong>
            <span>{item.value}</span>
          </div>
          <div className="chart__team-track">
            <div className="chart__team-fill" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardWidgets({ tasks, managerView }: { tasks: Task[]; managerView: boolean }) {
  const todo = tasks.filter((task) => task.status === 'todo').length;
  const progress = tasks.filter((task) => task.status === 'in-progress').length;
  const completed = tasks.filter((task) => task.status === 'done').length;
  const overdue = tasks.filter((task) => taskIsOverdue(task)).length;

  return (
    <div className="dashboard-grid">
      <MetricCard title="To Do" value={todo} icon={Clock3} accent="slate" description="Tasks pending" />
      <MetricCard title="In Progress" value={progress} icon={ArrowUpRight} accent="blue" description="Active work" />
      <MetricCard title="Completed" value={completed} icon={CheckCircle2} accent="green" description="Finished tasks" />
      <MetricCard title="Overdue" value={overdue} icon={AlertCircle} accent="red" description="Needs attention" />

      <section className="panel panel--wide">
        <header className="panel__header">
          <div>
            <h2>Tasks Created</h2>
            <p>Last 7 days</p>
          </div>
        </header>
        <MiniBarChart tasks={tasks} />
      </section>

      <section className="panel">
        <header className="panel__header">
          <div>
            <h2>Tasks by Priority</h2>
            <p>Current workload mix</p>
          </div>
        </header>
        <MiniPieChart tasks={tasks} />
      </section>

      {managerView ? (
        <section className="panel">
          <header className="panel__header">
            <div>
              <h2>Tasks Closed by Team</h2>
              <p>Manager view</p>
            </div>
          </header>
          <TeamBarChart tasks={tasks} />
        </section>
      ) : null}

      <section className="panel panel--wide">
        <header className="panel__header">
          <div>
            <h2>Overdue Tasks</h2>
            <p>Follow up items that need attention</p>
          </div>
        </header>
        <div className="overdue-list">
          {tasks.filter((task) => taskIsOverdue(task)).length ? tasks.filter((task) => taskIsOverdue(task)).map((task) => (
            <article key={task.id} className="overdue-item">
              <div>
                <strong>{task.title}</strong>
                <p>{task.assigneeName} · Due {formatDate(task.deadline)}</p>
              </div>
              <span className="badge badge--red">{statusLabels[task.status]}</span>
            </article>
          )) : (
            <div className="empty-state empty-state--compact">
              <h3>No overdue tasks</h3>
              <p>Everything is on track right now.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}