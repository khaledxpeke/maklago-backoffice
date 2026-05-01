import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest, setPlatformToken } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';
import { Button } from '@/shared/ui/Button';
import { Card, CardTitle } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';
import { Spinner } from '@/shared/ui/Spinner';

export function PlatformLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setPending(true);
    try {
      const data = await apiRequest<{ accessToken: string }>('/platform/v1/auth/login', {
        method: 'POST',
        auth: false,
        skipTenant: true,
        body: JSON.stringify({ email, password }),
      });
      setPlatformToken(data.accessToken);
      navigate('/platform', { replace: true });
    } catch (e) {
      if (e instanceof ApiError) {
        setErr(e.message);
      } else if (e instanceof Error) {
        setErr(e.message === 'Failed to fetch' ? 'Cannot reach the API. Check Connection (API URL) and that the server is running.' : e.message);
      } else {
        setErr('Sign-in failed');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <Card>
        <CardTitle>Platform admin</CardTitle>
        <p className="mt-1 text-sm text-zinc-500">
          Sign in to create and manage restaurants (tenants). This is separate from restaurant staff login.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {err && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</div>
          )}
          <div>
            <Label htmlFor="pemail">Email</Label>
            <Input
              id="pemail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <Label htmlFor="ppass">Password</Label>
            <Input
              id="ppass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? <Spinner className="h-4 w-4" /> : null}
            Sign in
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-500">
          <Link to="/connect" className="text-[var(--color-accent)] underline">
            API connection settings
          </Link>
          {' · '}
          <Link to="/login" className="text-[var(--color-accent)] underline">
            Restaurant staff login
          </Link>
        </p>
      </Card>
    </div>
  );
}
