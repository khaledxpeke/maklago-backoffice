import { Link, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Store } from 'lucide-react';
import { getToken, setPlatformToken } from '@/shared/api/client';
import { Button } from '@/shared/ui/Button';

export function PlatformShell() {
  const navigate = useNavigate();
  const hasStaffSession = Boolean(getToken());

  return (
    <div className="min-h-dvh bg-[var(--color-surface)]">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-[var(--color-accent)]" />
          <span className="font-semibold text-zinc-900">Platform admin</span>
          <span className="text-sm text-zinc-500">— tenants & restaurants</span>
        </div>
        <div className="flex items-center gap-2">
          {hasStaffSession ? (
            <Link to="/dashboard" className="text-sm font-medium text-[var(--color-accent)] underline">
              Open restaurant app
            </Link>
          ) : (
            <Link to="/connect" className="text-sm text-zinc-600 underline">
              Connection
            </Link>
          )}
          <Button
            variant="secondary"
            type="button"
            onClick={() => {
              setPlatformToken(null);
              navigate('/platform-login', { replace: true });
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-8">
        <Outlet />
      </main>
    </div>
  );
}
