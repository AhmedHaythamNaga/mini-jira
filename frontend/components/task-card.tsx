"use client";

import { CalendarDays, GripVertical, MessageSquare, Paperclip, UserCircle2 } from 'lucide-react';
import { Task } from '@/lib/types';
import { formatDate, initials, priorityStyle, statusLabel, statusStyle, taskIsOverdue } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  draggable?: boolean;
  onDragStart?: () => void;
}

export function TaskCard({ task, onClick, draggable = false, onDragStart }: TaskCardProps) {
  const overdue = taskIsOverdue(task);

  return (
    <article className="task-card" draggable={draggable} onDragStart={onDragStart} onClick={onClick}>
      <div className="task-card__header">
        <span className={priorityStyle(task.priority)}>{task.priority}</span>
        {draggable ? <GripVertical size={16} className="task-card__grip" /> : null}
      </div>

      <h3>{task.title}</h3>
      <p>{task.description}</p>

      <div className="task-card__meta">
        <span className={statusStyle(task.status)}>{statusLabel(task.status)}</span>
        <span className={`task-card__deadline ${overdue ? 'task-card__deadline--overdue' : ''}`}>
          <CalendarDays size={14} />
          {formatDate(task.deadline)}
        </span>
      </div>

      <div className="task-card__footer">
        <span className="avatar avatar--small" aria-hidden="true">
          {initials(task.assigneeName) || <UserCircle2 size={14} />}
        </span>
        <div className="task-card__footer-copy">
          <strong>{task.assigneeName}</strong>
          <small>{task.team}</small>
        </div>
        <div className="task-card__signals" aria-label="Task activity">
          <MessageSquare size={14} />
          <Paperclip size={14} />
        </div>
      </div>
    </article>
  );
}