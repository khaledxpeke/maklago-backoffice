import { useState } from 'react';
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

type TenantDetail = TenantRow & { databaseUrl: string };

export function PlatformTenantsPage() {
  const qc = useQueryClient();
  const hasPlatformAuth = Boolean(getPlatformToken() || getPlatformKey());
  const [edit, setEdit] = useState<TenantDetail | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TenantRow | null>(null);
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['platform', 'tenants'],
    queryFn: () => apiRequest<{ tenants: TenantRow[] }>('/platform/v1/tenants', { skipTenant: true, platform: true }),
    enabled: hasPlatformAuth,
  });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiRequest(`/platform/v1/tenants/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
        skipTenant: true,
        platform: true,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['platform'] });
      setEdit(null);
      setErr(null);
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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['platform'] });
      setCreateOpen(false);
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
          <h1 className="text-2xl font-semibold text-zinc-900">Platform tenants</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Registry records — authenticated with platform JWT or optional API key.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
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
              const form = e.target as HTMLFormElement;
              const fd = new FormData(form);
              const slug = String(fd.get('slug') ?? '')
                .trim()
                .toLowerCase();
              const name = String(fd.get('name') ?? '').trim();
              const databaseUrl = String(fd.get('databaseUrl') ?? '').trim();
              const ownerEmail = String(fd.get('ownerEmail') ?? '').trim();
              const ownerPassword = String(fd.get('ownerPassword') ?? '');
              const ownerFullName = String(fd.get('ownerFullName') ?? '').trim();
              const body: Record<string, unknown> = { slug, name, databaseUrl };
              if (ownerEmail || ownerPassword || ownerFullName) {
                body.ownerEmail = ownerEmail;
                body.ownerPassword = ownerPassword;
                body.ownerFullName = ownerFullName;
              }
              create.mutate(body);
            }}
          >
            <div>
              <Label>Slug</Label>
              <Input
                name="slug"
                required
                placeholder="e.g. my-restaurant"
                pattern="[a-z0-9-]+"
                title="Lowercase letters, numbers, and hyphens only"
                className="font-mono text-sm"
              />
              <p className="mt-1 text-xs text-zinc-500">Used in URLs and <code className="text-xs">x-tenant-id</code>.</p>
            </div>
            <div>
              <Label>Display name</Label>
              <Input name="name" required placeholder="Restaurant name" />
            </div>
            <div>
              <Label>Database URL</Label>
              <Input
                name="databaseUrl"
                required
                placeholder="postgresql://user:pass@host:5432/dbname"
                className="font-mono text-xs"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Point at an empty Postgres database; run tenant migrations for that DB before use.
              </p>
            </div>
            <div className="border-t border-zinc-200 pt-4">
              <p className="text-sm font-medium text-zinc-800">Owner account (optional)</p>
              <p className="mt-1 text-xs text-zinc-500">
                If set, creates the same user as <strong>restaurant staff</strong> (owner role) in the tenant database — use these credentials on the Connection page to sign in.
              </p>
              <div className="mt-3 space-y-3">
                <div>
                  <Label>Owner email</Label>
                  <Input name="ownerEmail" type="email" autoComplete="off" />
                </div>
                <div>
                  <Label>Owner password</Label>
                  <Input name="ownerPassword" type="password" autoComplete="new-password" minLength={8} />
                </div>
                <div>
                  <Label>Owner full name</Label>
                  <Input name="ownerFullName" />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending} className="flex-1">
                {create.isPending ? <Spinner className="h-4 w-4" /> : null}
                Create
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {edit && (
        <Modal title={`Tenant: ${edit.slug}`} onClose={() => setEdit(null)} className="max-w-lg">
          <form
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
            </div>
            <div>
              <Label>Name</Label>
              <Input name="name" defaultValue={edit.name} required />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={edit.isActive} />
              Active
            </label>
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
