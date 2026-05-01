import { useQuery } from '@tanstack/react-query';
import { apiRequest, getPlatformKey, getPlatformToken } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';
import { Card } from '@/shared/ui/Card';
import { Spinner } from '@/shared/ui/Spinner';
import { Badge } from '@/shared/ui/Badge';

type OwnerRow = {
  id: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  tenantActive: boolean;
  email: string;
  fullName: string;
  createdAt: string;
};

export function PlatformOwnersPage() {
  const hasPlatformAuth = Boolean(getPlatformToken() || getPlatformKey());

  const { data, isLoading, error } = useQuery({
    queryKey: ['platform', 'owners'],
    queryFn: () => apiRequest<{ owners: OwnerRow[] }>('/platform/v1/owners', { skipTenant: true, platform: true }),
    enabled: hasPlatformAuth,
  });

  if (!hasPlatformAuth) {
    return (
      <Card>
        <div className="text-lg font-semibold text-zinc-900">Platform sign-in required</div>
        <p className="mt-2 text-sm text-zinc-500">
          Use <strong>Platform admin sign in</strong>, or add the optional API key on the <strong>Connection</strong> page.
        </p>
      </Card>
    );
  }

  const rows = data?.owners ?? [];
  const loadError = error instanceof ApiError ? error.message : null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Registry owners</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Accounts recorded when you create a restaurant with <strong>owner email</strong> in provisioning. They match the{' '}
          <strong>owner</strong> staff user in that tenant DB — sign-in uses tenant slug + these credentials on{' '}
          <strong>Connection</strong>.
        </p>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{loadError}</div>
      )}

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50/80 text-xs font-medium uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Venue</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Owner name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Venue status</th>
                  <th className="px-4 py-3">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((o) => (
                  <tr key={o.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3 font-medium text-zinc-900">{o.tenantName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-700">{o.tenantSlug}</td>
                    <td className="px-4 py-3 text-zinc-800">{o.fullName}</td>
                    <td className="px-4 py-3 text-zinc-700">{o.email}</td>
                    <td className="px-4 py-3">
                      <Badge className={o.tenantActive ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-700'}>
                        {o.tenantActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums text-zinc-500">
                      {new Date(o.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="px-4 py-12 text-center text-sm text-zinc-500">
                No registry owners yet. Create a restaurant with the owner bootstrap option to list them here.
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
