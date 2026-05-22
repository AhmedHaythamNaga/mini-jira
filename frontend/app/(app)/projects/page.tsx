"use client";

import { useMemo, useState } from 'react';
import { FolderPlus } from 'lucide-react';
import { useApp } from '@/lib/app-state';
import { canManageAll, formatDate, matchesSearch, teamStyle } from '@/lib/utils';
import { CreateProjectInput } from '@/lib/types';

export default function ProjectsPage() {
  const { user, projects, teamFilter, searchQuery, createProject } = useApp();
  const [draft, setDraft] = useState<CreateProjectInput>({ name: '', description: '', team: user?.team ?? 'Frontend' });

  const visibleProjects = useMemo(
    () => {
      const search = searchQuery.trim().toLowerCase();

      return projects.filter((project) => {
        const teamMatches = canManageAll(user) ? teamFilter === 'All' || project.team === teamFilter : project.team === user?.team || project.team === 'All';
        const searchMatches = !search || [project.name, project.description, project.team].join(' ').toLowerCase().includes(search);
        return teamMatches && searchMatches;
      });
    },
    [projects, searchQuery, teamFilter, user]
  );

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Projects</h1>
          <p>Track team initiatives and anchor work to a clear goal.</p>
        </div>
      </div>

      {canManageAll(user) ? (
        <section className="panel panel--wide project-form">
          <div className="panel__header">
            <div>
              <h2>Create Project</h2>
              <p>Managers can add projects for any team.</p>
            </div>
            <FolderPlus size={18} />
          </div>
          <div className="modal__form modal__form--inline">
            <label>
              <span>Name</span>
              <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </label>
            <label>
              <span>Description</span>
              <input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
            </label>
            <label>
              <span>Team</span>
              <select value={draft.team} onChange={(event) => setDraft({ ...draft, team: event.target.value as CreateProjectInput['team'] })}>
                <option value="Frontend">Frontend</option>
                <option value="Backend">Backend</option>
                <option value="All">All</option>
              </select>
            </label>
            <button
              className="button button--primary"
              onClick={() => {
                if (!draft.name.trim()) return;
                createProject(draft);
                setDraft({ name: '', description: '', team: user?.team ?? 'Frontend' });
              }}
            >
              Create Project
            </button>
          </div>
        </section>
      ) : null}

      <section className="project-grid">
        {visibleProjects.length ? visibleProjects.map((project) => (
          <article key={project.id} className="project-card">
            <div className="project-card__icon">{project.name.slice(0, 1)}</div>
            <div className="project-card__content">
              <div className="project-card__title">
                <h2>{project.name}</h2>
                <span className={teamStyle(project.team)}>{project.team}</span>
              </div>
              <p>{project.description}</p>
              <small>Created {formatDate(project.createdAt)}</small>
            </div>
          </article>
        )) : (
          <div className="empty-state empty-state--full">
            <h2>No projects yet</h2>
            <p>Create your first project to organize the work.</p>
          </div>
        )}
      </section>
    </div>
  );
}