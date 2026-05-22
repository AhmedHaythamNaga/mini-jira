"use client";

import { FormEvent, useMemo, useState } from 'react';
import { CalendarDays, Edit3, Paperclip, Save, ShieldAlert, Trash2, X } from 'lucide-react';
import { Task } from '@/lib/types';
import { useApp } from '@/lib/app-state';
import { formatDate, initials, priorityStyle, statusLabel, statusStyle, taskIsOverdue, teamStyle } from '@/lib/utils';

interface TaskDetailModalProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
}

export function TaskDetailModal({ task, open, onClose }: TaskDetailModalProps) {
  const { comments, activities, addComment, deleteTask, updateTask, user } = useApp();
  const [tab, setTab] = useState<'comments' | 'activity' | 'attachments'>('comments');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Task | null>(task);
  const [comment, setComment] = useState('');

  const relatedComments = useMemo(() => comments.filter((item) => item.taskId === task?.id), [comments, task?.id]);
  const relatedActivities = useMemo(() => activities.filter((item) => item.taskId === task?.id), [activities, task?.id]);

  if (!open || !task) return null;

  const canEdit = user?.role === 'manager' || user?.role === 'admin';
  const isAuthorized = canEdit || user?.team === task.team || task.team === 'All';
  const overdue = taskIsOverdue(task);

  const handleSave = () => {
    if (!draft) return;

    updateTask(task.id, draft);
    setEditing(false);
  };

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div className="modal modal--xl" role="dialog" aria-modal="true" aria-label="Task details" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h2>{task.title}</h2>
            <p>
              #{task.id} · Created {formatDate(task.createdAt)}
            </p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {!isAuthorized ? (
          <div className="empty-state empty-state--compact">
            <ShieldAlert size={34} />
            <h3>Not Authorized</h3>
            <p>You do not have access to this task.</p>
          </div>
        ) : (
          <div className="task-detail">
            <section className="task-detail__main">
              <div className="task-detail__editor">
                <div className="task-detail__toolbar">
                  <span className={priorityStyle(task.priority)}>{task.priority}</span>
                  <span className={statusStyle(task.status)}>{statusLabel(task.status)}</span>
                  {overdue ? <span className="badge badge--red">Overdue</span> : null}
                  <div className="task-detail__toolbar-actions">
                    {canEdit ? (
                      <button type="button" className="button button--secondary button--compact" onClick={() => setEditing((current) => !current)}>
                        <Edit3 size={16} />
                        {editing ? 'Editing' : 'Edit'}
                      </button>
                    ) : null}
                    {canEdit ? (
                      <button type="button" className="button button--danger button--compact" onClick={() => deleteTask(task.id)}>
                        <Trash2 size={16} />
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>

                <label>
                  <span>Title</span>
                  <input disabled={!editing} value={draft?.title ?? task.title} onChange={(event) => setDraft((current) => (current ? { ...current, title: event.target.value } : current))} />
                </label>

                <label>
                  <span>Description</span>
                  <textarea
                    rows={6}
                    disabled={!editing}
                    value={draft?.description ?? task.description}
                    onChange={(event) => setDraft((current) => (current ? { ...current, description: event.target.value } : current))}
                  />
                </label>

                <div className="tabs">
                  {(['comments', 'activity', 'attachments'] as const).map((item) => (
                    <button key={item} type="button" className={`tabs__item ${tab === item ? 'tabs__item--active' : ''}`} onClick={() => setTab(item)}>
                      {item.charAt(0).toUpperCase() + item.slice(1)}
                    </button>
                  ))}
                </div>

                {tab === 'comments' ? (
                  <div className="task-detail__stack">
                    <form
                      className="comment-box"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (!comment.trim()) return;
                        addComment(task.id, comment.trim());
                        setComment('');
                      }}
                    >
                      <textarea rows={3} placeholder="Write a comment" value={comment} onChange={(event) => setComment(event.target.value)} />
                      <button type="submit" className="button button--primary button--compact">
                        Post
                      </button>
                    </form>
                    <div className="comment-list">
                      {relatedComments.map((item) => (
                        <article key={item.id} className="comment-item">
                          <span className="avatar avatar--small">{initials(item.userName)}</span>
                          <div>
                            <div className="comment-item__meta">
                              <strong>{item.userName}</strong>
                              <span>{formatDate(item.createdAt)}</span>
                            </div>
                            <p>{item.content}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}

                {tab === 'activity' ? (
                  <div className="activity-list">
                    {relatedActivities.length ? relatedActivities.map((item) => (
                      <article key={item.id} className="activity-item">
                        <span className="avatar avatar--small">{initials(item.userName)}</span>
                        <div>
                          <strong>{item.userName}</strong>
                          <p>{item.action}</p>
                          <small>{formatDate(item.timestamp)}</small>
                        </div>
                      </article>
                    )) : (
                      <p className="muted">No recent activity.</p>
                    )}
                  </div>
                ) : null}

                {tab === 'attachments' ? (
                  <div className="attachments">
                    <div className="upload-zone">
                      <Paperclip size={18} />
                      <div>
                        <strong>Drop files here</strong>
                        <p>Uploads are mocked in this frontend and can be wired to S3 later.</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {editing ? (
                  <div className="modal__actions">
                    <button type="button" className="button button--secondary" onClick={() => setEditing(false)}>
                      Cancel
                    </button>
                    <button type="button" className="button button--primary" onClick={handleSave}>
                      <Save size={16} />
                      Save Changes
                    </button>
                  </div>
                ) : null}
              </div>
            </section>

            <aside className="task-detail__aside">
              <div className="detail-card">
                <h3>Details</h3>
                <dl>
                  <div>
                    <dt>Assignee</dt>
                    <dd>{task.assigneeName}</dd>
                  </div>
                  <div>
                    <dt>Deadline</dt>
                    <dd>
                      <CalendarDays size={14} /> {formatDate(task.deadline)}
                    </dd>
                  </div>
                  <div>
                    <dt>Team</dt>
                    <dd><span className={teamStyle(task.team)}>{task.team}</span></dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd><span className={statusStyle(task.status)}>{statusLabel(task.status)}</span></dd>
                  </div>
                </dl>
              </div>

              <div className="detail-card">
                <h3>Checklist</h3>
                <ul className="checklist">
                  <li>Editable title and description</li>
                  <li>Comments and activity feed</li>
                  <li>Attachments ready for upload integration</li>
                </ul>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}