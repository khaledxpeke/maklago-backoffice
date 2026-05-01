import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getApiBase,
  getPlatformKey,
  getTenantSlug,
  setApiBase,
  setPlatformKey,
  setTenantSlug,
} from '@/shared/api/client';
import { Button } from '@/shared/ui/Button';
import { Card, CardTitle } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';

export function ConnectPage() {
  const navigate = useNavigate();
  const [apiBase, setApi] = useState(getApiBase);
  const [tenant, setT] = useState(getTenantSlug);
  const [platform, setP] = useState(getPlatformKey);

  function save(e: React.FormEvent) {
    e.preventDefault();
    setApiBase(apiBase.trim());
    setTenantSlug(tenant);
    setPlatformKey(platform);
    navigate('/login', { replace: true });
  }

  return (
    <div className="mx-auto max-w-lg py-16">
      <Card>
        <CardTitle>Connection</CardTitle>
        <p className="mt-1 text-sm text-zinc-500">
          For local dev, leave API URL <strong>empty</strong> so requests use the Vite proxy (no CORS). Or set{' '}
          <code className="text-xs">CORS_ORIGIN=http://localhost:5173</code> on the backend if you use{' '}
          <code className="text-xs">http://localhost:3000</code> here.
        </p>
        <form onSubmit={save} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="api">API base URL (optional)</Label>
            <Input
              id="api"
              value={apiBase}
              onChange={(e) => setApi(e.target.value)}
              placeholder="Leave empty for dev proxy"
              autoComplete="off"
            />
            <button
              type="button"
              className="mt-1 text-xs text-[var(--color-accent)] underline"
              onClick={() => setApi('')}
            >
              Clear URL — use same-origin proxy
            </button>
          </div>
          <div>
            <Label htmlFor="tenant">Tenant slug (optional)</Label>
            <Input
              id="tenant"
              value={tenant}
              onChange={(e) => setT(e.target.value)}
              placeholder="Leave empty if staff email is in the registry directory"
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-zinc-500">
              After sign-in, the tenant is taken from your JWT. Set a slug here only if you want to send{' '}
              <code className="text-[11px]">x-tenant-id</code> before login (multi-tenant routing).
            </p>
          </div>
          <div>
            <Label htmlFor="platform">Platform API key (optional)</Label>
            <Input
              id="platform"
              value={platform}
              onChange={(e) => setP(e.target.value)}
              placeholder="For Platform / tenants screen"
              type="password"
              autoComplete="off"
            />
          </div>
          <Button type="submit" className="w-full">
            Save & continue
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-zinc-600">
          <strong>You</strong> (platform owner)?{' '}
          <Link to="/platform-login" className="font-medium text-[var(--color-accent)] underline">
            Platform admin sign in
          </Link>{' '}
          — create restaurants without staff tenant login.
        </p>
      </Card>
    </div>
  );
}

