import { createContext } from 'react';

export type StaffRole = 'owner' | 'manager' | 'cashier';

export type StaffUser = {
  id: string;
  email: string;
  fullName: string;
  role: StaffRole;
  /** Owner: a PIN exists (set by platform admin). */
  hasPin?: boolean;
  /** Owner: gated mobile flows should run verify-pin when true. */
  requiresMobilePin?: boolean;
};

type AuthState = {
  user: StaffUser | null;
  tenantId: string | null;
  tenantSlug: string | null;
  loading: boolean;
  error: string | null;
};

export type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
