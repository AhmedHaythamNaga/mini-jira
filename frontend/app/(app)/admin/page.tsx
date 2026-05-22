"use client";

import { useEffect, useMemo, useState } from 'react';
import { UserPlus, Users } from 'lucide-react';
import { useApp } from '@/lib/app-state';
import { canManageAll, defaultTeamName, teamStyle } from '@/lib/utils';
import { CreateUserInput } from '@/lib/types';

export default function AdminPage() {
  const { user, users, teams, createUser, createTeam } = useApp();
  const [userDraft, setUserDraft] = useState<CreateUserInput>({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    team: '',
  });
  const [teamName, setTeamName] = useState('');

  const sortedUsers = useMemo(() => [...users].sort((left, right) => left.name.localeCompare(right.name)), [users]);
  const defaultTeam = defaultTeamName(teams);

  useEffect(() => {
    if (!userDraft.team && defaultTeam) {
      setUserDraft((current) => ({ ...current, team: defaultTeam }));
    }
  }, [defaultTeam, userDraft.team]);

  if (!canManageAll(user)) {
    return (
      <div className="page">
        <div className="page__header">
          <div>
            <h1>Admin</h1>
            <p>Manager and admin access only.</p>
          </div>
        </div>
        <section className="empty-state empty-state--full">
          <h2>Not Authorized</h2>
          <p>You do not have access to user and team administration.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Admin</h1>
          <p>Manage users and teams from a single workspace.</p>
        </div>
      </div>

      <div className="admin-grid">
        <section className="panel">
          <div className="panel__header">
            <div>
              <h2>User Management</h2>
              <p>Add or update team members.</p>
            </div>
            <UserPlus size={18} />
          </div>

          <div className="modal__form modal__form--inline admin-form">
            <label>
              <span>Name</span>
              <input value={userDraft.name} onChange={(event) => setUserDraft({ ...userDraft, name: event.target.value })} />
            </label>
            <label>
              <span>Email</span>
              <input value={userDraft.email} onChange={(event) => setUserDraft({ ...userDraft, email: event.target.value })} />
            </label>
            <label>
              <span>Password</span>
              <input type="password" value={userDraft.password} onChange={(event) => setUserDraft({ ...userDraft, password: event.target.value })} />
            </label>
            <label>
              <span>Role</span>
              <select value={userDraft.role} onChange={(event) => setUserDraft({ ...userDraft, role: event.target.value as CreateUserInput['role'] })}>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
              </select>
            </label>
            <label>
              <span>Team</span>
              <select
                value={userDraft.team}
                onChange={(event) => setUserDraft({ ...userDraft, team: event.target.value })}
                disabled={!teams.length}
              >
                {!teams.length ? <option value="">No teams — create one first</option> : null}
                {teams.map((team) => (
                  <option key={team.id} value={team.name}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button button--primary"
              onClick={() => {
                if (!userDraft.name.trim() || !userDraft.email.trim() || !userDraft.password.trim()) return;
                createUser(userDraft);
                setUserDraft({ name: '', email: '', password: '', role: 'employee', team: defaultTeam });
              }}
            >
              Add User
            </button>
          </div>

          <div className="table-wrap table-wrap--spaced">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Team</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      <p>{item.email}</p>
                    </td>
                    <td>{item.role}</td>
                    <td>{item.team}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel__header">
            <div>
              <h2>Team Management</h2>
              <p>Create teams and review capacity.</p>
            </div>
            <Users size={18} />
          </div>

          <div className="modal__form modal__form--inline">
            <label>
              <span>Team name</span>
              <input value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="Platform" />
            </label>
            <button
              className="button button--primary"
              onClick={() => {
                if (!teamName.trim()) return;
                createTeam(teamName);
                setTeamName('');
              }}
            >
              Add Team
            </button>
          </div>

          <div className="team-grid">
            {teams.map((team) => (
              <article key={team.id} className="team-card">
                <span className={teamStyle(team.name)}>{team.name}</span>
                <strong>{team.memberCount} members</strong>
                <p>{team.projectCount} projects</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}