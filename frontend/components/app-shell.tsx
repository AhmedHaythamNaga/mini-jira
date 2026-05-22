"use client";

import { ReactNode, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Toaster } from 'sonner';
import { Bell, X } from 'lucide-react';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { useApp } from '@/lib/app-state';
import { canManageAll } from '@/lib/utils';

export function AppShell({ children }: { children: ReactNode }) {
  const { user, notifications, ready } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const isProtectedRoute = pathname !== '/login';
  const notAuthorized = useMemo(() => {
    if (!user) return false;
    if (canManageAll(user)) return false;
    return pathname === '/admin' || pathname === '/reports';
  }, [pathname, user]);

  if (!ready) {
    return (
      <main className="boot-screen">
        <div className="boot-card">
          <div className="brand__mark brand__mark--large">MJ</div>
          <h1>Loading Mini-Jira</h1>
          <p>Restoring session and preparing your workspace.</p>
        </div>
      </main>
    );
  }

  if (isProtectedRoute && !user && pathname !== '/login') {
    router.replace('/login');
    return null;
  }

  return (
    <div className="app-frame">
      {pathname !== '/login' ? (
        <>
          <Sidebar collapsed={sidebarCollapsed} mobileOpen={mobileOpen} onToggleCollapse={() => setSidebarCollapsed((value) => !value)} onCloseMobile={() => setMobileOpen(false)} />
          <div className={`app-frame__scrim ${mobileOpen ? 'app-frame__scrim--open' : ''}`} onClick={() => setMobileOpen(false)} />
          <div className="app-shell">
            <Header onMenuClick={() => setMobileOpen((value) => !value)} onNotificationsClick={() => setNotificationsOpen(true)} />
            <main className="app-shell__main">
              {notAuthorized ? (
                <section className="empty-state empty-state--full">
                  <h1>Not Authorized</h1>
                  <p>This section is limited to managers and admins.</p>
                  <button className="button button--primary" onClick={() => router.push('/dashboard')}>
                    Go to Dashboard
                  </button>
                </section>
              ) : (
                children
              )}
            </main>
          </div>
        </>
      ) : (
        children
      )}

      {notificationsOpen ? (
        <div className="sheet-overlay" onClick={() => setNotificationsOpen(false)}>
          <aside className="sheet" onClick={(event) => event.stopPropagation()}>
            <div className="sheet__header">
              <div>
                <h2>Notifications</h2>
                <p>{notifications.filter((item) => !item.read).length} unread</p>
              </div>
              <button className="icon-button" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications">
                <X size={18} />
              </button>
            </div>
            <div className="sheet__list">
              {notifications.length ? notifications.map((notification) => (
                <button
                  key={notification.id}
                  className={`notification-item ${notification.read ? '' : 'notification-item--unread'}`}
                  onClick={() => {
                    setNotificationsOpen(false);
                    router.push(notification.taskId ? '/board' : '/dashboard');
                  }}
                >
                  <div className="notification-item__icon">
                    <Bell size={16} />
                  </div>
                  <div>
                    <strong>{notification.title}</strong>
                    <p>{notification.message}</p>
                  </div>
                </button>
              )) : (
                <div className="empty-state empty-state--compact">
                  <h3>You are all caught up</h3>
                  <p>No unread notifications.</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      ) : null}

      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}