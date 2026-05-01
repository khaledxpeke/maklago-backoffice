import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Building2, LogOut, Store, UsersRound, Wrench } from 'lucide-react';
import { getToken, setPlatformToken } from '@/shared/api/client';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/shared/lib/cn';

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-[var(--color-accent)]/12 text-[var(--color-accent)]' : 'text-zinc-600 hover:bg-zinc-100',
  );

export function PlatformShell() {
  const navigate = useNavigate();
  const hasStaffSession = Boolean(getToken());

  return (
    <div className="flex min-h-dvh bg-[var(--color-surface)]">
      <aside className="flex w-60 flex-col border-r border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-4 py-5">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 shrink-0 text-[var(--color-accent)]" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">maklaGo</div>
              <div className="font-semibold text-zinc-900">Platform admin</div>
            </div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          <NavLink to="/platform/restaurants" className={navClass}>
            <Building2 className="h-4 w-4 shrink-0" />
            Restaurants
          </NavLink>
          <NavLink to="/platform/owners" className={navClass}>
            <UsersRound className="h-4 w-4 shrink-0" />
            Registry owners
          </NavLink>
        </nav>
        <div className="border-t border-zinc-100 p-3">
          {hasStaffSession ? (
            <NavLink
              to="/dashboard"
              className="mb-2 block rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/8"
            >
              ← Restaurant backoffice
            </NavLink>
          ) : (
            <NavLink
              to="/connect"
              className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
            >
              <Wrench className="h-4 w-4" />
              Connection
            </NavLink>
          )}
          <Button
            variant="secondary"
            type="button"
            className="w-full"
            onClick={() => {
              setPlatformToken(null);
              navigate('/platform-login', { replace: true });
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
