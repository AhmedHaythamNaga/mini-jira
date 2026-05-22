"use client";

import Link from 'next/link';
import { Bell, CheckSquare, ChevronDown, LogOut, Menu, Search, ShieldCheck, UserCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/app-state';
import { TeamName } from '@/lib/types';
import { canManageAll } from '@/lib/utils';

interface HeaderProps {
  onMenuClick: () => void;
  onNotificationsClick: () => void;
}

const teamOptions: TeamName[] = ['All', 'Frontend', 'Backend'];

export function Header({ onMenuClick, onNotificationsClick }: HeaderProps) {
  const { user, notifications, searchQuery, setSearchQuery, teamFilter, setTeamFilter, logout } = useApp();
  const router = useRouter();
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button className="icon-button topbar__menu" onClick={onMenuClick} aria-label="Open navigation menu">
          <Menu size={18} />
        </button>
        <Link href="/dashboard" className="brand">
          <span className="brand__mark">
            <CheckSquare size={18} />
          </span>
          <span className="brand__text">
            <strong>Mini-Jira</strong>
            <small>Team task management</small>
          </span>
        </Link>
      </div>

      <label className="searchbar" aria-label="Search tasks">
        <Search size={16} />
        <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search tasks, teams, users" />
      </label>

      <div className="topbar__actions">
        {user && canManageAll(user) ? (
          <label className="select select--compact" aria-label="Team filter">
            <ShieldCheck size={16} />
            <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value as TeamName)}>
              {teamOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'All' ? 'All Teams' : option}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <button className="icon-button icon-button--badge" onClick={onNotificationsClick} aria-label="Open notifications">
          <Bell size={18} />
          {unreadCount > 0 ? <span className="badge-count">{unreadCount}</span> : null}
        </button>

        <button className="button button--ghost button--compact" onClick={() => logout()}>
          <LogOut size={16} />
          <span>Logout</span>
        </button>

        <details className="user-menu">
          <summary className="user-menu__summary">
            <span className="avatar">{user?.avatar ?? <UserCircle2 size={18} />}</span>
            <span className="user-menu__text">
              <strong>{user?.name ?? 'Guest'}</strong>
              <small>{user?.team ?? 'No team'}</small>
            </span>
            <ChevronDown size={16} />
          </summary>
          <div className="user-menu__panel">
            <div>
              <strong>{user?.name}</strong>
              <p>{user?.email}</p>
              <p>{user?.role?.toUpperCase()}</p>
            </div>
            <button className="button button--secondary button--full" onClick={() => router.push('/dashboard')}>
              Dashboard
            </button>
            <button className="button button--danger button--full" onClick={() => logout()}>
              Logout
            </button>
          </div>
        </details>
      </div>
    </header>
  );
}