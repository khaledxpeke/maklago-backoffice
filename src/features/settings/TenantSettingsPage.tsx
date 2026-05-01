import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';
import { useAuth } from '@/app/useAuth';
import { Button } from '@/shared/ui/Button';
import { Card, CardTitle } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';
import { Spinner } from '@/shared/ui/Spinner';

type SettingsRes = {
  settings: Record<string, unknown>;
  defaultTaxBps: number;
};

export function TenantSettingsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canEditTax = user?.role === 'OWNER' || user?.role === 'MANAGER';

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiRequest<SettingsRes>('/api/v1/settings'),
  });

  const [tax, setTax] = useState('');

  useEffect(() => {
    if (data) setTax(String(data.defaultTaxBps));
  }, [data]);

  const mutation = useMutation({
    mutationFn: (defaultTaxBps: number) =>
      apiRequest<{ defaultTaxBps: number }>('/api/v1/settings/tax', {
        method: 'PATCH',
        body: JSON.stringify({ defaultTaxBps }),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['settings'] }),
  });

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-zinc-900">Settings</h1>
      <p className="mt-1 text-sm text-zinc-500">Tenant defaults (basis points: 10000 = 100%).</p>

      {isLoading ? (
        <div className="mt-8 flex justify-center">
          <Spinner />
        </div>
      ) : (
        <Card className="mt-6">
          <CardTitle className="text-base">Default tax</CardTitle>
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(tax);
              if (Number.isNaN(n)) return;
              mutation.mutate(n);
            }}
          >
            <div>
              <Label htmlFor="tax">defaultTaxBps</Label>
              <Input
                id="tax"
                type="number"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                disabled={!canEditTax}
              />
            </div>
            {canEditTax ? (
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? <Spinner className="h-4 w-4" /> : null}
                Save
              </Button>
            ) : (
              <p className="text-sm text-zinc-500">Only owners and managers can change tax.</p>
            )}
            {mutation.isError && mutation.error instanceof ApiError && (
              <p className="text-sm text-red-600">{mutation.error.message}</p>
            )}
          </form>
        </Card>
      )}
    </div>
  );
}
