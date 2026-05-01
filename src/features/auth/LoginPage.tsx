import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/useAuth';
import { ApiError } from '@/shared/api/errors';
import { Button } from '@/shared/ui/Button';
import { Card, CardTitle } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';
import { Spinner } from '@/shared/ui/Spinner';

export function LoginPage() {
  const { login } = useAuth();
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
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (e) {
      if (e instanceof ApiError) {
        setErr(e.message);
      } else if (e instanceof Error) {
        setErr(
          e.message === 'Failed to fetch' || e.name === 'TypeError'
            ? 'Cannot reach the API. Use Connection: leave “API base URL” empty (Vite proxies to :3000), or set backend CORS_ORIGIN to this origin, and ensure the API is running.'
            : e.message,
        );
      } else {
        setErr('Login failed');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <Card>
        <CardTitle>Staff sign in</CardTitle>
        <p className="mt-1 text-sm text-zinc-500">
          Sign in with your staff email and password. If your email is registered for directory login, you do not need
          to set a tenant slug on Connection first.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {err && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
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
          Platform owner?{' '}
          <Link to="/platform-login" className="text-[var(--color-accent)] underline">
            Platform admin sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}

