import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function AppShell({ children, fullBleed }: { children: ReactNode; fullBleed?: boolean }) {
  return (
    <div className="flex h-full min-h-screen flex-col bg-neutral-950 text-neutral-100">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-800 px-5">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-indigo-500 text-sm text-white">
            AP
          </span>
          <span>Apartment Planner</span>
        </Link>
      </header>
      <main className={fullBleed ? 'flex-1 overflow-hidden' : 'flex-1 overflow-y-auto px-6 py-8'}>
        {children}
      </main>
    </div>
  );
}
