"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { useApp } from '@/lib/app-state';
import { CreateTaskInput } from '@/lib/types';
import { canManageAll, defaultTeamName } from '@/lib/utils';

interface TaskFormModalProps {
  open: boolean;
  onClose: () => void;
}

export function TaskFormModal({ open, onClose }: TaskFormModalProps) {
  const { createTask, users, user, projects, teams } = useApp();
  const [form, setForm] = useState<CreateTaskInput>({
    title: '',
    description: '',
    priority: 'medium',
    assigneeId: user?.id ?? users[0]?.id ?? '',
    team: '',
    projectId: '',
    deadline: new Date().toISOString().slice(0, 10),
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const teamProjects = useMemo(
    () => projects.filter((project) => project.team === form.team || project.team === 'All'),
    [form.team, projects],
  );

  useEffect(() => {
    if (open) {
      const initialTeam = defaultTeamName(teams, user?.team);
      const matching = projects.filter((project) => project.team === initialTeam || project.team === 'All');
      setForm((current) => ({
        ...current,
        assigneeId: user?.id ?? users[0]?.id ?? '',
        team: initialTeam,
        projectId: matching[0]?.id ?? projects[0]?.id ?? '',
      }));
    } else {
      setImageFile(null);
      setImagePreview(null);
      setSubmitting(false);
    }
  }, [open, user, users, projects, teams]);

  useEffect(() => {
    if (!open) return;
    if (teamProjects.some((project) => project.id === form.projectId)) return;
    setForm((current) => ({ ...current, projectId: teamProjects[0]?.id ?? '' }));
  }, [form.projectId, open, teamProjects]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  if (!open) return null;

  if (!canManageAll(user)) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.projectId || !form.team) return;
    setSubmitting(true);
    try {
      createTask(form, imageFile ?? undefined);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div className="modal modal--wide" role="dialog" aria-modal="true" aria-label="Create task" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h2>Create Task</h2>
            <p>Capture work with project, team, assignment, and an optional image.</p>
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
            <span>Project</span>
            <select
              required
              value={form.projectId}
              onChange={(event) => setForm({ ...form, projectId: event.target.value })}
              disabled={!teamProjects.length}
            >
              {!teamProjects.length ? <option value="">No projects for this team</option> : null}
              {teamProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
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
            <select
              required
              value={form.team}
              disabled={!teams.length}
              onChange={(event) => {
                const team = event.target.value;
                const nextProjects = projects.filter((project) => project.team === team || project.team === 'All');
                setForm({
                  ...form,
                  team,
                  projectId: nextProjects[0]?.id ?? '',
                });
              }}
            >
              {!teams.length ? <option value="">No teams available</option> : null}
              {teams.map((team) => (
                <option key={team.id} value={team.name}>
                  {team.name}
                </option>
              ))}
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
            <input type="date" required value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} />
          </label>
          <label className="modal__span-2">
            <span>Task image (optional)</span>
            <div className="upload-field">
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
              />
              <span className="upload-field__hint">
                <ImagePlus size={16} />
                JPG, PNG, or WebP
              </span>
            </div>
            {imagePreview ? (
              <img src={imagePreview} alt="Task preview" className="upload-field__preview" />
            ) : null}
          </label>

          <div className="modal__actions modal__span-2">
            <button type="button" className="button button--secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="button button--primary" disabled={submitting || !form.projectId || !form.team}>
              {submitting ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
