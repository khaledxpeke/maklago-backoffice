import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/app/auth-provider';
import { useAuth } from '@/app/useAuth';
import { AppShell } from '@/app/AppShell';
import { PlatformShell } from '@/app/PlatformShell';
import { getPlatformKey, getPlatformToken, getToken } from '@/shared/api/client';
import { ConnectPage } from '@/features/connect/ConnectPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { PlatformLoginPage } from '@/features/platform/PlatformLoginPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { CatalogPage } from '@/features/catalog/CatalogPage';
import { OrdersPage } from '@/features/orders/OrdersPage';
import { TablesPage } from '@/features/tables/TablesPage';
import { StaffPage } from '@/features/staff/StaffPage';
import { TenantSettingsPage } from '@/features/settings/TenantSettingsPage';
import { PlatformOwnersPage } from '@/features/platform/PlatformOwnersPage';
import { PlatformTenantsPage } from '@/features/platform/PlatformTenantsPage';
import { Spinner } from '@/shared/ui/Spinner';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function RootRedirect() {
  if (getPlatformToken()) return <Navigate to="/platform" replace />;
  if (getToken()) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/connect" replace />;
}

function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--color-surface)]">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RequirePlatformAccess() {
  if (!getPlatformToken() && !getPlatformKey()) {
    return <Navigate to="/platform-login" replace />;
  }
  return <Outlet />;
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--color-surface)]">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }
  if (user) return <Navigate to="/dashboard" replace />;
  return <LoginPage />;
}

/** Staff (tenant) session: no platform admin login screen. */
function PlatformLoginRoute() {
  if (getPlatformToken()) return <Navigate to="/platform" replace />;
  if (getToken()) return <Navigate to="/dashboard" replace />;
  return <PlatformLoginPage />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/connect" element={<ConnectPage />} />
            <Route path="/platform-login" element={<PlatformLoginRoute />} />
            <Route path="/login" element={<LoginRoute />} />

            <Route element={<RequirePlatformAccess />}>
              <Route path="/platform" element={<PlatformShell />}>
                <Route index element={<Navigate to="/platform/restaurants" replace />} />
                <Route path="restaurants" element={<PlatformTenantsPage />} />
                <Route path="owners" element={<PlatformOwnersPage />} />
              </Route>
            </Route>

            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/catalog" element={<CatalogPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/tables" element={<TablesPage />} />
                <Route path="/staff" element={<StaffPage />} />
                <Route path="/settings" element={<TenantSettingsPage />} />
              </Route>
            </Route>

            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
