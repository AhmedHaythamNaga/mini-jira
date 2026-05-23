"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { useApp } from "@/lib/app-state";
import { CreateTaskInput } from "@/lib/types";
import { canManageAll } from "@/lib/utils";

interface TaskFormModalProps {
  open: boolean;
  onClose: () => void;
}

const emptyForm = (): CreateTaskInput => ({
  title: "",
  description: "",
  priority: "medium",
  teamId: "",
  projectId: "",
  deadline: new Date().toISOString().slice(0, 10),
});

export function TaskFormModal({ open, onClose }: TaskFormModalProps) {
  const { createTask, user, projects, teams, refreshTeams } = useApp();
  const [form, setForm] = useState<CreateTaskInput>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(false);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === form.teamId),
    [form.teamId, teams],
  );

  const teamProjects = useMemo(() => {
    if (!selectedTeam) return [];
    return projects.filter(
      (project) =>
        project.team === selectedTeam.name || project.team === "All",
    );
  }, [projects, selectedTeam]);

  useEffect(() => {
    if (!open) {
      setImageFile(null);
      setImagePreview(null);
      setSubmitting(false);
      return;
    }

    setForm(emptyForm());
    setTeamsLoading(true);
    void refreshTeams().finally(() => setTeamsLoading(false));
  }, [open, refreshTeams]);

  useEffect(() => {
    if (!open || teamsLoading) return;

    const validTeams = teams.filter((team) => team.id);
    if (!validTeams.length) return;

    const teamId =
      form.teamId && validTeams.some((team) => team.id === form.teamId)
        ? form.teamId
        : validTeams[0].id;
    const team = validTeams.find((item) => item.id === teamId);
    const matchingProjects = team
      ? projects.filter(
          (project) =>
            project.team === team.name || project.team === "All",
        )
      : [];

    setForm((current) => {
      const projectId =
        current.projectId &&
        matchingProjects.some((project) => project.id === current.projectId)
          ? current.projectId
          : (matchingProjects[0]?.id ?? "");

      if (current.teamId === teamId && current.projectId === projectId) {
        return current;
      }

      return { ...current, teamId, projectId };
    });
  }, [open, teamsLoading, teams, projects, form.teamId]);

  useEffect(() => {
    if (!open || !form.teamId) return;
    if (teamProjects.some((project) => project.id === form.projectId)) return;
    setForm((current) => ({
      ...current,
      projectId: teamProjects[0]?.id ?? "",
    }));
  }, [form.projectId, form.teamId, open, teamProjects]);

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
    if (!form.teamId) return;
    setSubmitting(true);
    try {
      const created = await createTask(form, imageFile ?? undefined);
      if (created) {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal modal--wide"
        role="dialog"
        aria-modal="true"
        aria-label="Create task"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <div>
            <h2>Create Task</h2>
            <p>
              Assign to a team — every employee on that team will see this task
              on their dashboard and board.
            </p>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form className="modal__form" onSubmit={handleSubmit}>
          <label>
            <span>Title</span>
            <input
              required
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
            />
          </label>
          <label className="modal__span-2">
            <span>Description</span>
            <textarea
              rows={4}
              required
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </label>
          <label>
            <span>Team</span>
            <select
              required
              value={form.teamId}
              onChange={(event) => {
                const teamId = event.target.value;
                const team = teams.find((item) => item.id === teamId);
                const nextProjects = team
                  ? projects.filter(
                      (project) =>
                        project.team === team.name || project.team === "All",
                    )
                  : [];
                setForm((current) => ({
                  ...current,
                  teamId,
                  projectId: nextProjects[0]?.id ?? "",
                }));
              }}
            >
              <option value="" disabled>
                {teamsLoading ? "Loading teams…" : "Select a team"}
              </option>
              {!teamsLoading && !teams.length ? (
                <option value="" disabled>
                  No teams — create one in Admin first
                </option>
              ) : null}
              {teams
                .filter((team) => team.id)
                .map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            <span>Project</span>
            <select
              value={form.projectId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  projectId: event.target.value,
                }))
              }
            >
              {!teamProjects.length ? (
                <option value="">No projects for this team</option>
              ) : null}
              <option value="">No project</option>
              {teamProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Priority</span>
            <select
              value={form.priority}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  priority: event.target.value as CreateTaskInput["priority"],
                }))
              }
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label>
            <span>Deadline</span>
            <input
              type="date"
              required
              value={form.deadline}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  deadline: event.target.value,
                }))
              }
            />
          </label>
          <label className="modal__span-2">
            <span>Task image (optional)</span>
            <div className="upload-field">
              <input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setImageFile(event.target.files?.[0] ?? null)
                }
              />
              <span className="upload-field__hint">
                <ImagePlus size={16} />
                JPG, PNG, or WebP
              </span>
            </div>
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Task preview"
                className="upload-field__preview"
              />
            ) : null}
          </label>

          <div className="modal__actions modal__span-2">
            <button
              type="button"
              className="button button--secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button button--primary"
              disabled={submitting || !form.teamId}
            >
              {submitting ? "Creating…" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
