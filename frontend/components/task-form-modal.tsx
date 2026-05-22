"use client";

import { FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '@/lib/app-state';
import { CreateTaskInput, TeamName } from '@/lib/types';

interface TaskFormModalProps {
  open: boolean;
  onClose: () => void;
}

export function TaskFormModal({ open, onClose }: TaskFormModalProps) {
  const { createTask, users, user } = useApp();
  const [form, setForm] = useState<CreateTaskInput>({
    title: '',
    description: '',
    priority: 'medium',
    assigneeId: user?.id ?? users[0]?.id ?? '',
    team: user?.team ?? 'Frontend',
    deadline: new Date().toISOString().slice(0, 10)
  });

  useEffect(() => {
    if (open) {
      setForm((current) => ({
        ...current,
        assigneeId: user?.id ?? users[0]?.id ?? '',
        team: user?.team ?? 'Frontend'
      }));
    }
  }, [open, user, users]);

  if (!open) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createTask(form);
    onClose();
  };

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div className="modal modal--wide" role="dialog" aria-modal="true" aria-label="Create task" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h2>Create Task</h2>
            <p>Capture work with team isolation and assignment baked in.</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form className="modal__form" onSubmit={handleSubmit}>
          <label>
            <span>Title</span>
            <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </label>
          <label className="modal__span-2">
            <span>Description</span>
            <textarea rows={4} required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </label>
          <label>
            <span>Priority</span>
            <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as CreateTaskInput['priority'] })}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label>
            <span>Team</span>
            <select value={form.team} onChange={(event) => setForm({ ...form, team: event.target.value as TeamName })}>
              <option value="Frontend">Frontend</option>
              <option value="Backend">Backend</option>
              <option value="All">All</option>
            </select>
          </label>
          <label>
            <span>Assignee</span>
            <select value={form.assigneeId} onChange={(event) => setForm({ ...form, assigneeId: event.target.value })}>
              {users.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Deadline</span>
            <input type="date" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} />
          </label>

          <div className="modal__actions modal__span-2">
            <button type="button" className="button button--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button button--primary">
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}