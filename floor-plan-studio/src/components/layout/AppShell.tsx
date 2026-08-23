import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function AppShell({ children, fullBleed }: { children: ReactNode; fullBleed?: boolean }) {
  return (
    <div className="flex h-full min-h-screen flex-col bg-neutral-950 text-neutral-100">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-800/80 bg-neutral-950/80 px-5 backdrop-blur">
        <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 text-[13px] text-white shadow-sm shadow-indigo-500/30">
            ◳
          </span>
          <span className="text-[15px]">
            Floor Plan <span className="text-neutral-400">Studio</span>
          </span>
        </Link>
        <span className="hidden text-xs text-neutral-500 sm:block">
          Design, furnish and walk through your space in 3D
        </span>
      </header>
      <main className={fullBleed ? 'flex-1 overflow-hidden' : 'flex-1 overflow-y-auto px-6 py-8'}>
        {children}
      </main>
    </div>
  );
}
