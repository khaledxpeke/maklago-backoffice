import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  apiRequest,
  clearTenantSlug,
  getToken,
  setTenantSlug as persistTenantSlug,
  setToken,
} from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';
import { AuthContext, type AuthContextValue, type StaffUser } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantSlug, setTenantSlugState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshMe = useCallback(async () => {
    const t = getToken();
    if (!t) {
      setUser(null);
      setTenantId(null);
      setTenantSlugState(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiRequest<{
        tenantId: string;
        slug: string;
        staff: StaffUser;
      }>('/api/v1/auth/me');
      setUser(data.staff);
      setTenantId(data.tenantId);
      setTenantSlugState(data.slug);
      persistTenantSlug(data.slug);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        setToken(null);
        clearTenantSlug();
        setUser(null);
        setTenantId(null);
        setTenantSlugState(null);
      }
      setError(e instanceof Error ? e.message : 'Session error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    const data = await apiRequest<{
      accessToken: string;
      tenantId?: string;
      tenantSlug?: string;
      staff: StaffUser;
    }>('/api/v1/auth/login', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email, password }),
    });
    setToken(data.accessToken);
    if (data.tenantSlug) persistTenantSlug(data.tenantSlug);
    await refreshMe();
  }, [refreshMe]);

  const logout = useCallback(() => {
    setToken(null);
    clearTenantSlug();
    setUser(null);
    setTenantId(null);
    setTenantSlugState(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      tenantId,
      tenantSlug,
      loading,
      error,
      login,
      logout,
      refreshMe,
    }),
    [user, tenantId, tenantSlug, loading, error, login, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
