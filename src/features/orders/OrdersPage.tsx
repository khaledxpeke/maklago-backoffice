import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';
import { Button } from '@/shared/ui/Button';
import { Card, CardTitle } from '@/shared/ui/Card';
import { Label } from '@/shared/ui/Label';
import { Modal } from '@/shared/ui/Modal';
import { Spinner } from '@/shared/ui/Spinner';
import { Badge } from '@/shared/ui/Badge';

type OrderStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELED';

type OrderLine = {
  id: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  taxCents: number;
  note: string | null;
  modifiersSnapshot: unknown;
  compositionSnapshot: unknown;
  product: { id: string; name: string };
};

type OrderListItem = {
  id: string;
  status: OrderStatus;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  createdAt: string;
  table: { id: string; name: string; zone: string | null } | null;
  lines: OrderLine[];
};

type OrderDetail = OrderListItem & {
  staff: { id: string; fullName: string; email: string } | null;
};

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'TND' });
}

function formatModifiers(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const ids = o.selectedIds;
  const defs = o.defs;
  if (!Array.isArray(ids) || !Array.isArray(defs) || ids.length === 0) return null;
  const names: string[] = [];
  for (const id of ids) {
    if (typeof id !== 'string') continue;
    const d = defs.find((x) => typeof x === 'object' && x !== null && (x as { id?: string }).id === id) as
      | { name?: string }
      | undefined;
    if (d?.name) names.push(d.name);
  }
  return names.length ? names.join(', ') : null;
}

function formatComposition(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const steps = (raw as { steps?: unknown }).steps;
  if (!Array.isArray(steps) || steps.length === 0) return null;
  const parts: string[] = [];
  for (const s of steps) {
    if (typeof s !== 'object' || s === null) continue;
    const step = s as {
      compositionTypeLabel?: string;
      compositionTypeName?: string;
      ingredients?: { name?: string }[];
    };
    const label = step.compositionTypeLabel ?? step.compositionTypeName;
    const ingNames = Array.isArray(step.ingredients)
      ? step.ingredients.map((i) => (i && typeof i.name === 'string' ? i.name : null)).filter(Boolean)
      : [];
    if (label && ingNames.length) parts.push(`${label}: ${ingNames.join(', ')}`);
    else if (ingNames.length) parts.push(ingNames.join(', '));
  }
  return parts.length ? parts.join(' · ') : null;
}

function statusBadgeClass(status: OrderStatus): string {
  switch (status) {
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-800';
    case 'ACTIVE':
    case 'DRAFT':
      return 'bg-amber-100 text-amber-900';
    case 'CANCELED':
      return 'bg-red-100 text-red-800';
    default:
      return '';
  }
}

export function OrdersPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const listQ = useQuery({
    queryKey: ['orders', statusFilter],
    queryFn: () => {
      const q = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
      return apiRequest<{ orders: OrderListItem[] }>(`/api/v1/orders${q}`);
    },
  });

  const detailQ = useQuery({
    queryKey: ['orders', detailId],
    queryFn: () => apiRequest<{ order: OrderDetail }>(`/api/v1/orders/${detailId}`),
    enabled: Boolean(detailId),
  });

  const patchStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      apiRequest<{ order: OrderDetail }>(`/api/v1/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['orders'] });
      setDetailId(null);
      setErr(null);
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Update failed'),
  });

  const orders = listQ.data?.orders ?? [];
  const detail = detailQ.data?.order;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Orders</h1>
          <p className="text-sm text-zinc-500">Live commands: open tickets and history.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="order-status">Status</Label>
            <select
              id="order-status"
              className="mt-1 block w-44 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELED">Canceled</option>
            </select>
          </div>
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</div>
      )}

      {listQ.isLoading ? (
        <div className="flex justify-center py-24">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50/80 text-xs font-medium uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Table</th>
                  <th className="px-4 py-3">Lines</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3 tabular-nums text-zinc-600">
                      {new Date(o.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={statusBadgeClass(o.status)}>{o.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {o.table ? `${o.table.name}${o.table.zone ? ` · ${o.table.zone}` : ''}` : '—'}
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-zinc-600">
                      {o.lines.map((l) => `${l.quantity}× ${l.product.name}`).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-zinc-900">
                      {formatMoney(o.totalCents)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button type="button" variant="secondary" className="text-xs" onClick={() => setDetailId(o.id)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {orders.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-zinc-500">No orders match this filter.</div>
          )}
        </Card>
      )}

      {detailId && detail && (
        <Modal
          title={`Order ${detail.id.slice(0, 8)}…`}
          onClose={() => setDetailId(null)}
          className="max-w-lg"
        >
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={statusBadgeClass(detail.status)}>{detail.status}</Badge>
              <span className="text-zinc-500">{new Date(detail.createdAt).toLocaleString()}</span>
            </div>
            {detail.table && (
              <div>
                <div className="text-xs font-medium uppercase text-zinc-500">Table</div>
                <div className="text-zinc-900">
                  {detail.table.name}
                  {detail.table.zone ? ` · ${detail.table.zone}` : ''}
                </div>
              </div>
            )}
            {detail.staff && (
              <div>
                <div className="text-xs font-medium uppercase text-zinc-500">Staff</div>
                <div className="text-zinc-900">{detail.staff.fullName}</div>
                <div className="text-zinc-500">{detail.staff.email}</div>
              </div>
            )}

            <CardTitle className="text-base">Lines</CardTitle>
            <ul className="space-y-3 rounded-lg border border-zinc-100 bg-zinc-50/50 p-3">
              {detail.lines.map((line) => {
                const mods = formatModifiers(line.modifiersSnapshot);
                const comp = formatComposition(line.compositionSnapshot);
                return (
                  <li key={line.id} className="border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                    <div className="font-medium text-zinc-900">
                      {line.quantity}× {line.product.name}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {formatMoney(line.unitPriceCents)} unit · {formatMoney(line.lineTotalCents)} line · tax{' '}
                      {formatMoney(line.taxCents)}
                    </div>
                    {mods && <div className="mt-1 text-zinc-700">Modifiers: {mods}</div>}
                    {comp && <div className="mt-1 text-zinc-700">Composition: {comp}</div>}
                    {line.note && <div className="mt-1 italic text-zinc-600">Note: {line.note}</div>}
                  </li>
                );
              })}
            </ul>

            <div className="flex justify-between border-t border-zinc-100 pt-3 text-zinc-800">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatMoney(detail.subtotalCents)}</span>
            </div>
            <div className="flex justify-between text-zinc-800">
              <span>Tax</span>
              <span className="tabular-nums">{formatMoney(detail.taxCents)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-zinc-900">
              <span>Total</span>
              <span className="tabular-nums">{formatMoney(detail.totalCents)}</span>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {detail.status === 'ACTIVE' || detail.status === 'DRAFT' ? (
                <Button
                  type="button"
                  disabled={patchStatus.isPending}
                  onClick={() => patchStatus.mutate({ id: detail.id, status: 'COMPLETED' })}
                >
                  Mark completed
                </Button>
              ) : null}
              {detail.status !== 'CANCELED' && detail.status !== 'COMPLETED' ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={patchStatus.isPending}
                  onClick={() => patchStatus.mutate({ id: detail.id, status: 'CANCELED' })}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </div>
        </Modal>
      )}

      {detailId && detailQ.isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/20">
          <Spinner className="h-10 w-10" />
        </div>
      )}
    </div>
  );
}
