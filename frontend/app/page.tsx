"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/app-state';

export default function HomePage() {
  const router = useRouter();
  const { user, ready } = useApp();

  useEffect(() => {
    if (!ready) return;
    router.replace(user ? '/dashboard' : '/login');
  }, [ready, router, user]);

  return (
    <main className="boot-screen">
      <div className="boot-card">
        <div className="brand__mark brand__mark--large">MJ</div>
        <h1>Redirecting</h1>
        <p>Taking you to the right workspace.</p>
      </div>
    </main>
  );
}