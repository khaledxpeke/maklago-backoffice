import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, getPlatformKey, getPlatformToken } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';
import { Button } from '@/shared/ui/Button';
import { Card, CardTitle } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';
import { Modal } from '@/shared/ui/Modal';
import { Spinner } from '@/shared/ui/Spinner';
import { Badge } from '@/shared/ui/Badge';

type TenantRow = {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type TenantDetail = TenantRow & {
  databaseUrl: string;
  activeOwnerCount: number | null;
  activeOwnerCountError?: string | null;
};

type CreateSuccess = {
  slug: string;
  name: string;
  hadOwner: boolean;
  ownerEmail?: string;
};

export function PlatformTenantsPage() {
  const qc = useQueryClient();
  const hasPlatformAuth = Boolean(getPlatformToken() || getPlatformKey());
  const [edit, setEdit] = useState<TenantDetail | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<CreateSuccess | null>(null);
  const [bootstrapOwner, setBootstrapOwner] = useState(true);
  const [slug, setSlug] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [databaseUrl, setDatabaseUrl] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerFullName, setOwnerFullName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<TenantRow | null>(null);
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState('');
  const [bootEmail, setBootEmail] = useState('');
  const [bootPassword, setBootPassword] = useState('');
  const [bootFullName, setBootFullName] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['platform', 'tenants'],
    queryFn: () => apiRequest<{ tenants: TenantRow[] }>('/platform/v1/tenants', { skipTenant: true, platform: true }),
    enabled: hasPlatformAuth,
  });

  useEffect(() => {
    if (edit) {
      setBootEmail('');
      setBootPassword('');
      setBootFullName('');
    }
  }, [edit?.id]);

  const bootstrapOwnerMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: { ownerEmail: string; ownerPassword: string; ownerFullName: string };
    }) =>
      apiRequest<{ staff: { id: string; email: string; fullName: string; role: string } }>(
        `/platform/v1/tenants/${id}/bootstrap-owner`,
        {
          method: 'POST',
          body: JSON.stringify(body),
          skipTenant: true,
          platform: true,
        },
      ),
    onSuccess: async (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ['platform'] });
      try {
        const res = await apiRequest<{ tenant: TenantDetail }>(`/platform/v1/tenants/${vars.id}`, {
          skipTenant: true,
          platform: true,
        });
        setEdit((prev) => (prev && prev.id === vars.id ? res.tenant : prev));
        setErr(null);
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : 'Refresh failed');
      }
      setBootPassword('');
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Bootstrap failed'),
  });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiRequest(`/platform/v1/tenants/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
        skipTenant: true,
        platform: true,
      }),
    onSuccess: async (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ['platform'] });
      setErr(null);
      try {
        const res = await apiRequest<{ tenant: TenantDetail }>(`/platform/v1/tenants/${vars.id}`, {
          skipTenant: true,
          platform: true,
        });
        setEdit(res.tenant);
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : 'Saved, but failed to reload tenant details.');
      }
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Error'),
  });

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<{ tenant: { id: string; slug: string; name: string } }>('/platform/v1/tenants', {
        method: 'POST',
        body: JSON.stringify(body),
        skipTenant: true,
        platform: true,
      }),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['platform'] });
      const hadOwner = Boolean(variables.ownerEmail && variables.ownerPassword && variables.ownerFullName);
      setCreateSuccess({
        slug: String(variables.slug),
        name: String(variables.name),
        hadOwner,
        ownerEmail: hadOwner ? String(variables.ownerEmail) : undefined,
      });
      setCreateOpen(false);
      setSlug('');
      setDisplayName('');
      setDatabaseUrl('');
      setOwnerEmail('');
      setOwnerPassword('');
      setOwnerFullName('');
      setErr(null);
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Create failed'),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/platform/v1/tenants/${id}`, {
        method: 'DELETE',
        skipTenant: true,
        platform: true,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['platform'] });
      setDeleteTarget(null);
      setDeleteConfirmSlug('');
      setEdit(null);
      setErr(null);
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Delete failed'),
  });

  const openDetail = async (id: string) => {
    try {
      const res = await apiRequest<{ tenant: TenantDetail }>(`/platform/v1/tenants/${id}`, {
        skipTenant: true,
        platform: true,
      });
      setEdit(res.tenant);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Load failed');
    }
  };

  if (!hasPlatformAuth) {
    return (
      <Card>
        <CardTitle>Platform sign-in required</CardTitle>
        <p className="mt-2 text-sm text-zinc-500">
          Use <strong>Platform admin sign in</strong> (email + password), or add the optional API key on the{' '}
          <strong>Connection</strong> page.
        </p>
      </Card>
    );
  }

  const rows = data?.tenants ?? [];
  const loadError = error instanceof ApiError ? error.message : null;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Restaurants</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Registry records — create venues and owner logins here. Authenticated with platform JWT or optional API key (
            <strong>Connection</strong> page).
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setErr(null);
            setCreateOpen(true);
          }}
        >
          New restaurant
        </Button>
      </div>

      {(err || loadError) && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {err || loadError}
        </div>
      )}

      <Card className="mt-6">
        {isLoading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500">
                  <th className="pb-2 font-medium">Slug</th>
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-b border-zinc-100">
                    <td className="py-2 font-mono text-xs">{t.slug}</td>
                    <td className="py-2 font-medium">{t.name}</td>
                    <td className="py-2">
                      <Badge className={t.isActive ? 'bg-emerald-100 text-emerald-800' : ''}>
                        {t.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-2 text-right">
                      <Button variant="ghost" type="button" className="text-sm" onClick={() => void openDetail(t.id)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        type="button"
                        className="text-sm text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setDeleteTarget(t);
                          setDeleteConfirmSlug('');
                        }}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {deleteTarget && (
        <Modal
          title="Delete restaurant?"
          onClose={() => {
            setDeleteTarget(null);
            setDeleteConfirmSlug('');
          }}
          className="max-w-md"
        >
          <p className="text-sm text-zinc-700">
            This removes <strong>{deleteTarget.name}</strong> from the platform registry. The PostgreSQL database is{' '}
            <strong>not</strong> dropped — only the registry entry and linked owners.
          </p>
          <p className="mt-3 text-sm text-zinc-500">
            Type the tenant slug <code className="rounded bg-zinc-100 px-1 font-mono text-xs">{deleteTarget.slug}</code> to
            confirm.
          </p>
          <div className="mt-3">
            <Label htmlFor="delete-confirm-slug">Slug</Label>
            <Input
              id="delete-confirm-slug"
              value={deleteConfirmSlug}
              onChange={(e) => setDeleteConfirmSlug(e.target.value)}
              className="font-mono text-sm"
              autoComplete="off"
              placeholder={deleteTarget.slug}
            />
          </div>
          <div className="mt-6 flex gap-2">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteConfirmSlug('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              className="flex-1"
              disabled={deleteConfirmSlug !== deleteTarget.slug || remove.isPending}
              onClick={() => remove.mutate(deleteTarget.id)}
            >
              {remove.isPending ? <Spinner className="h-4 w-4" /> : null}
              Delete
            </Button>
          </div>
        </Modal>
      )}

      {createOpen && (
        <Modal title="New restaurant (tenant)" onClose={() => setCreateOpen(false)} className="max-w-lg">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setErr(null);
              const rawSlug = slug.trim().toLowerCase();
              if (!/^[a-z0-9-]+$/.test(rawSlug)) {
                setErr('Slug may only contain lowercase letters, numbers, and hyphens.');
                return;
              }
              const name = displayName.trim();
              const dbUrl = databaseUrl.trim();
              if (!rawSlug || !name || !dbUrl) return;

              const body: Record<string, unknown> = { slug: rawSlug, name, databaseUrl: dbUrl };

              if (bootstrapOwner) {
                const em = ownerEmail.trim().toLowerCase();
                const pw = ownerPassword;
                const fn = ownerFullName.trim();
                if (!em || !pw || !fn) {
                  setErr('Owner email, password (min 8 characters), and full name are required when bootstrap is enabled.');
                  return;
                }
                if (pw.length < 8) {
                  setErr('Owner password must be at least 8 characters.');
                  return;
                }
                body.ownerEmail = em;
                body.ownerPassword = pw;
                body.ownerFullName = fn;
              }

              create.mutate(body);
            }}
          >
            <div>
              <Label htmlFor="tenant-slug">Slug</Label>
              <Input
                id="tenant-slug"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. my-restaurant"
                className="font-mono text-sm"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Lowercase letters, numbers, hyphens only — used as <code className="text-xs">x-tenant-id</code> and on the Connection page.
              </p>
            </div>
            <div>
              <Label htmlFor="tenant-name">Display name</Label>
              <Input
                id="tenant-name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Restaurant name"
              />
            </div>
            <div>
              <Label htmlFor="tenant-db">Tenant database URL</Label>
              <Input
                id="tenant-db"
                required
                value={databaseUrl}
                onChange={(e) => setDatabaseUrl(e.target.value)}
                placeholder="postgresql://user:pass@host:5432/dbname"
                className="font-mono text-xs"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Apply tenant migrations to this database first (
                <code className="rounded bg-zinc-100 px-1 text-[11px]">npm run prisma:migrate:tenant:url</code> or point{' '}
                <code className="text-[11px]">TENANT_DATABASE_URL</code> at it and run{' '}
                <code className="text-[11px]">npm run prisma:migrate:tenant</code>
                ).
              </p>
            </div>

            <div className="border-t border-zinc-200 pt-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-zinc-300"
                  checked={bootstrapOwner}
                  onChange={(e) => setBootstrapOwner(e.target.checked)}
                />
                <span>
                  <span className="text-sm font-medium text-zinc-800">Create restaurant owner login</span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    Recommended: adds a staff user with role <strong>owner</strong> in the tenant DB and registers them for login.
                    Give the venue these credentials; they sign in on <strong>Connection</strong> with tenant slug + email + password.
                  </span>
                </span>
              </label>

              {bootstrapOwner ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <Label htmlFor="owner-email">Owner email</Label>
                    <Input
                      id="owner-email"
                      type="email"
                      autoComplete="off"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      required={bootstrapOwner}
                    />
                  </div>
                  <div>
                    <Label htmlFor="owner-password">Owner password</Label>
                    <Input
                      id="owner-password"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      required={bootstrapOwner}
                    />
                  </div>
                  <div>
                    <Label htmlFor="owner-fullname">Owner full name</Label>
                    <Input
                      id="owner-fullname"
                      value={ownerFullName}
                      onChange={(e) => setOwnerFullName(e.target.value)}
                      required={bootstrapOwner}
                    />
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-xs text-zinc-500">
                  Owner is optional at create time. After migrations are applied on the tenant database, open{' '}
                  <strong>Edit</strong> on this restaurant and use <strong>Create owner login</strong> there.
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending} className="flex-1">
                {create.isPending ? <Spinner className="h-4 w-4" /> : null}
                Create restaurant
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {createSuccess && (
        <Modal title="Restaurant created" onClose={() => setCreateSuccess(null)} className="max-w-lg">
          <div className="space-y-3 text-sm text-zinc-700">
            <p>
              <strong>{createSuccess.name}</strong> is registered with slug{' '}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">{createSuccess.slug}</code>.
            </p>
            {createSuccess.hadOwner && createSuccess.ownerEmail ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-3 text-emerald-950">
                <p className="font-medium">Owner login</p>
                <p className="mt-2 text-xs leading-relaxed">
                  Share with the venue: tenant slug <strong>{createSuccess.slug}</strong>, email{' '}
                  <strong>{createSuccess.ownerEmail}</strong>, and the password you just entered (it is not shown again).
                  They use <strong>Connection</strong> → staff sign in, or your mobile app with the same credentials.
                </p>
              </div>
            ) : (
              <p className="text-xs text-zinc-600">
                No owner was created yet. When the tenant DB is migrated, go to <strong>Platform → Restaurants → Edit</strong>{' '}
                for this slug and use <strong>Create owner login</strong>.
              </p>
            )}
            <p className="text-xs text-zinc-500">
              Ensure tenant migrations have been applied to the database URL you provided before the owner signs in.
            </p>
          </div>
          <Button type="button" className="mt-6 w-full" onClick={() => setCreateSuccess(null)}>
            Done
          </Button>
        </Modal>
      )}

      {edit && (
        <Modal title={`Tenant: ${edit.slug}`} onClose={() => setEdit(null)} className="max-w-lg">
          <form
            key={`tenant-edit-${edit.id}-${edit.updatedAt}-${edit.activeOwnerCount ?? 'na'}`}
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const fd = new FormData(form);
              const name = String(fd.get('name') ?? '');
              const isActive = fd.get('isActive') === 'on';
              const databaseUrl = String(fd.get('databaseUrl') ?? '');
              patch.mutate({
                id: edit.id,
                body: { name, isActive, databaseUrl },
              });
            }}
          >
            <div>
              <Label>Database URL</Label>
              <Input name="databaseUrl" defaultValue={edit.databaseUrl} className="font-mono text-xs" />
              <p className="mt-1 text-xs text-zinc-500">
                Must be reachable from the <strong>API server</strong> process (not only from your browser). If the API runs
                in Docker, <code className="rounded bg-zinc-100 px-1 text-[11px]">localhost</code> is usually wrong — use{' '}
                <code className="rounded bg-zinc-100 px-1 text-[11px]">host.docker.internal</code> or{' '}
                <code className="rounded bg-zinc-100 px-1 text-[11px]">127.0.0.1</code> as appropriate. After changing it,
                click <strong>Save</strong> to refresh owner info below.
              </p>
            </div>
            <div>
              <Label>Name</Label>
              <Input name="name" defaultValue={edit.name} required />
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2">
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={edit.isActive}
                  className="mt-0.5 rounded border-zinc-300"
                />
                <span>
                  <span className="font-medium text-zinc-900">Active</span>
                  <span className="mt-0.5 block text-xs font-normal text-zinc-600">
                    Uncheck to block the restaurant: tenant header resolution and staff login stop working until you turn
                    it back on.
                  </span>
                </span>
              </label>
            </div>

            {edit.activeOwnerCount !== null && edit.activeOwnerCount > 0 ? (
              <div className="space-y-1">
                <p className="text-xs text-zinc-500">
                  Active owners in tenant DB: <strong>{edit.activeOwnerCount}</strong>
                </p>
                <p className="text-xs text-zinc-500">
                  Forgot to add an owner at provision time? That flow only applies when this count is{' '}
                  <strong>0</strong>. With an owner already present, sign in as owner (Connection page) and add users from{' '}
                  <strong>Staff</strong>, or call <code className="rounded bg-zinc-100 px-1 font-mono text-[11px]">POST /api/v1/staff</code>.
                </p>
              </div>
            ) : (
              <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-3">
                <p className="text-sm font-medium text-amber-950">
                  {edit.activeOwnerCount === null
                    ? 'Could not verify owners (database unreachable from API server)'
                    : 'No active owner in tenant DB'}
                </p>
                {edit.activeOwnerCount === null && edit.activeOwnerCountError ? (
                  <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded border border-red-200 bg-red-50/90 p-2 font-mono text-[11px] text-red-950">
                    {edit.activeOwnerCountError}
                  </pre>
                ) : null}
                <p className="text-xs text-amber-900/90">
                  {edit.activeOwnerCount === null ? (
                    <>
                      Fix connectivity using the URL above (then <strong>Save</strong>), or adjust hostnames as in the note.
                      If the DB is actually fine from your laptop only, the URL still needs to work from where Node runs.
                      You can use <strong>Create owner login</strong> once the server can connect — same check as this panel.
                    </>
                  ) : (
                    <>
                      Use <strong>Create owner login</strong> below after tenant migrations are applied on this database. Email
                      must be unique platform-wide for staff login.
                    </>
                  )}
                </p>
                <div>
                  <Label htmlFor="boot-owner-email">Owner email</Label>
                  <Input
                    id="boot-owner-email"
                    type="email"
                    autoComplete="off"
                    value={bootEmail}
                    onChange={(e) => setBootEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="boot-owner-password">Password</Label>
                  <Input
                    id="boot-owner-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={bootPassword}
                    onChange={(e) => setBootPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="boot-owner-fullname">Full name</Label>
                  <Input id="boot-owner-fullname" value={bootFullName} onChange={(e) => setBootFullName(e.target.value)} />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={bootstrapOwnerMutation.isPending}
                  onClick={() => {
                    setErr(null);
                    const em = bootEmail.trim().toLowerCase();
                    const pw = bootPassword;
                    const fn = bootFullName.trim();
                    if (!em || !pw || !fn) {
                      setErr('Email, password (min 8 characters), and full name are required.');
                      return;
                    }
                    if (pw.length < 8) {
                      setErr('Password must be at least 8 characters.');
                      return;
                    }
                    bootstrapOwnerMutation.mutate({
                      id: edit.id,
                      body: { ownerEmail: em, ownerPassword: pw, ownerFullName: fn },
                    });
                  }}
                >
                  {bootstrapOwnerMutation.isPending ? <Spinner className="h-4 w-4" /> : null}
                  Create owner login
                </Button>
              </div>
            )}

            <Button type="submit" disabled={patch.isPending} className="w-full">
              {patch.isPending ? <Spinner className="h-4 w-4" /> : null}
              Save
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
