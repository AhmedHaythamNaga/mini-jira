"use client";

import Link from 'next/link';
import { BarChart3, ChevronLeft, ChevronRight, FolderKanban, HelpCircle, KanbanSquare, LayoutDashboard, Users, CheckSquare } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { canManageAll } from '@/lib/utils';
import { useApp } from '@/lib/app-state';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

const baseItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/my-tasks', label: 'My Tasks', icon: CheckSquare },
  { href: '/board', label: 'Team Board', icon: KanbanSquare },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin', label: 'Admin', icon: Users },
  { href: '/help', label: 'Help', icon: HelpCircle }
];

export function Sidebar({ collapsed, mobileOpen, onToggleCollapse, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useApp();

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${mobileOpen ? 'sidebar--open' : ''}`}>
      <nav className="sidebar__nav">
        {baseItems
          .filter((item) => canManageAll(user) || (item.href !== '/reports' && item.href !== '/admin'))
          .map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href} onClick={onCloseMobile} className={`sidebar__item ${active ? 'sidebar__item--active' : ''}`}>
                <Icon size={18} />
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
      </nav>

      <button className="sidebar__collapse" onClick={onToggleCollapse} aria-label="Toggle sidebar">
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        {!collapsed ? <span>Collapse</span> : null}
      </button>
    </aside>
  );
}