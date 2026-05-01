import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, getPlatformKey, getPlatformToken } from '@/shared/api/client';
import { Card, CardTitle } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';

type Summary = {
  summary: {
    ordersTotal: number;
    completedOrders: number;
    activeOrDraftOrders: number;
    revenueCentsCompleted: number;
    allTimeTotals: {
      subtotalCents: number;
      taxCents: number;
      totalCents: number;
    };
  };
};

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'TND' });
}

export function DashboardPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const hasPlatformAccess = Boolean(getPlatformToken() || getPlatformKey());

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['stats', from, to],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (from) q.set('from', new Date(from).toISOString());
      if (to) q.set('to', new Date(to).toISOString());
      const qs = q.toString();
      return apiRequest<Summary>(`/api/v1/stats/summary${qs ? `?${qs}` : ''}`);
    },
  });

  const s = data?.summary;

  return (
    <div>
      {hasPlatformAccess && (
        <Card className="mb-6 border-[var(--color-accent)]/25 bg-[var(--color-accent)]/5">
          <CardTitle className="text-base">Platform admin</CardTitle>
          <p className="mt-2 text-sm text-zinc-600">
            Register new restaurants, set database URLs, and optionally create the venue owner login under{' '}
            <Link to="/platform/restaurants" className="font-medium text-[var(--color-accent)] underline-offset-2 hover:underline">
              Platform → Restaurants
            </Link>
            . Browse provisioned owner emails under{' '}
            <Link to="/platform/owners" className="font-medium text-[var(--color-accent)] underline-offset-2 hover:underline">
              Registry owners
            </Link>
            .
          </p>
        </Card>
      )}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Dashboard</h1>
          <p className="text-sm text-zinc-500">Order and revenue aggregates (optional date range).</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="from">From</Label>
            <Input id="from" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="to">To</Label>
            <Input id="to" type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button type="button" variant="secondary" onClick={() => void refetch()}>
            Apply
          </Button>
        </div>
      </div>

      {isLoading || isFetching ? (
        <div className="flex justify-center py-24">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <div className="text-xs font-medium uppercase text-zinc-500">Orders (range)</div>
            <div className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900">{s?.ordersTotal ?? '—'}</div>
          </Card>
          <Card>
            <div className="text-xs font-medium uppercase text-zinc-500">Completed</div>
            <div className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900">{s?.completedOrders ?? '—'}</div>
          </Card>
          <Card>
            <div className="text-xs font-medium uppercase text-zinc-500">Active / draft</div>
            <div className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900">{s?.activeOrDraftOrders ?? '—'}</div>
          </Card>
          <Card>
            <div className="text-xs font-medium uppercase text-zinc-500">Revenue (completed)</div>
            <div className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900">
              {s ? formatMoney(s.revenueCentsCompleted) : '—'}
            </div>
          </Card>
          <Card className="sm:col-span-2 lg:col-span-4">
            <CardTitle className="text-base">All-time totals (within range filter)</CardTitle>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <div className="text-xs text-zinc-500">Subtotal</div>
                <div className="text-lg font-medium">{s ? formatMoney(s.allTimeTotals.subtotalCents) : '—'}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Tax</div>
                <div className="text-lg font-medium">{s ? formatMoney(s.allTimeTotals.taxCents) : '—'}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Total</div>
                <div className="text-lg font-medium">{s ? formatMoney(s.allTimeTotals.totalCents) : '—'}</div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
