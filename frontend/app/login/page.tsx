"use client";

import { FormEvent, useEffect, useState } from 'react';
import { ArrowRight, CheckSquare, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/app-state';

const quickLogins = [
  { id: 'u-ali', label: 'Ali', role: 'Manager' },
  { id: 'u-sara', label: 'Sara', role: 'Employee' },
  { id: 'u-omar', label: 'Omar', role: 'Employee' }
];

export default function LoginPage() {
  const { login, loginAsDemo, user, ready } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState('ali@company.com');
  const [password, setPassword] = useState('password');

  useEffect(() => {
    if (ready && user) router.replace('/dashboard');
  }, [ready, router, user]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void login(email, password).then((success) => {
      if (success) router.push('/dashboard');
    });
  };

  return (
    <main className="login-screen">
      <section className="login-card">
        <div className="login-card__brand">
          <span className="brand__mark brand__mark--large">
            <CheckSquare size={28} />
          </span>
          <div>
            <h1>Mini-Jira</h1>
            <p>Sign in to continue</p>
          </div>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ali@company.com" />
          </label>
          <label>
            <span>Password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="password" />
          </label>
          <button className="button button--primary button--full" type="submit">
            Sign In
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="quick-login">
          <h2>Quick login</h2>
          <div className="quick-login__grid">
            {quickLogins.map((item) => (
              <button
                key={item.id}
                type="button"
                className="quick-login__button"
                onClick={() => {
                  void loginAsDemo(item.id).then((success) => {
                    if (success) router.push('/dashboard');
                  });
                }}
              >
                <UserRound size={16} />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.role}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}