import { createContext } from 'react';

export type StaffRole = 'owner' | 'manager' | 'cashier';

export type StaffUser = {
  id: string;
  email: string;
  fullName: string;
  role: StaffRole;
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
