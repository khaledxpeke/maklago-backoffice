import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
  ShoppingBasket,
  Store,
  Table2,
  Users,
  Wrench,
} from 'lucide-react';
import { useAuth } from '@/app/useAuth';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/shared/lib/cn';

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-[var(--color-accent)]/12 text-[var(--color-accent)]' : 'text-zinc-600 hover:bg-zinc-100',
  );

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="flex min-h-dvh">
      <aside className="flex w-60 flex-col border-r border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-4 py-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">maklaGo</div>
          <div className="mt-1 font-semibold text-zinc-900">Backoffice</div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          <NavLink to="/dashboard" className={navClass}>
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            Dashboard
          </NavLink>
          <NavLink to="/catalog" className={navClass}>
            <ShoppingBasket className="h-4 w-4 shrink-0" />
            Catalog
          </NavLink>
          <NavLink to="/orders" className={navClass}>
            <ClipboardList className="h-4 w-4 shrink-0" />
            Orders
          </NavLink>
          <NavLink to="/tables" className={navClass}>
            <Table2 className="h-4 w-4 shrink-0" />
            Tables
          </NavLink>
          <NavLink to="/staff" className={navClass}>
            <Users className="h-4 w-4 shrink-0" />
            Staff
          </NavLink>
          <NavLink to="/settings" className={navClass}>
            <Settings className="h-4 w-4 shrink-0" />
            Settings
          </NavLink>
          <NavLink to="/platform" className={navClass}>
            <Store className="h-4 w-4 shrink-0" />
            Platform
          </NavLink>
          <NavLink to="/connect" className={navClass}>
            <Wrench className="h-4 w-4 shrink-0" />
            Connection
          </NavLink>
        </nav>
        <div className="border-t border-zinc-100 p-3">
          <div className="mb-2 truncate rounded-lg bg-zinc-50 px-3 py-2 text-xs">
            <div className="font-medium text-zinc-800">{user?.fullName}</div>
            <div className="text-zinc-500">{user?.email}</div>
            <div className="mt-1 text-zinc-400">{user?.role}</div>
          </div>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
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
