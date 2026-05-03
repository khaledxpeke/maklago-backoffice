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

type OrderStatus = 'waiting' | 'confirmed' | 'preparing' | 'completed' | 'canceled';

/** Line item from enriched `GET /api/v1/orders`. */
type OrderProductRow = {
  categoryId: string;
  id: string;
  name: string;
  description?: string;
  kind: string;
  categoryName: string;
  image?: string | null;
  count: number;
  price: number;
  extras: { id: string; count: number; price: number; name?: string }[];
  compositionSnapshot?: unknown;
};

type OrderListItem = {
  id: string;
  reference?: string;
  commandNumber?: number;
  commandDate?: string;
  status: OrderStatus;
  orderType: 'dine_in' | 'takeaway';
  /** Same integer unit as POST body / API `subtotal`. */
  subtotal: number;
  tva: number;
  total: number;
  discount?: number;
  discountPrice?: number;
  paymentMethod?: string;
  note?: string | null;
  customerName?: string | null;
  createdAt: string;
  updatedAt?: string;
  tableId?: string | null;
  staffId?: string | null;
  table?: {
    id: string;
    name: string;
    tableNumber: number;
    status: string;
    zone: string | null;
  } | null;
  products: OrderProductRow[];
};

type OrderDetail = OrderListItem & {
  staff: {
    id: string;
    fullName: string;
    email: string;
    role?: string;
  } | null;
};

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'TND' });
}

function formatExtrasSummary(extras: OrderProductRow['extras']): string | null {
  if (!extras?.length) return null;
  const parts = extras.map((e) => `${e.count}× ${e.name ?? e.id} (${formatMoney(e.price)})`);
  return parts.join(', ');
}

function statusBadgeClass(status: OrderStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-800';
    case 'canceled':
      return 'bg-red-100 text-red-800';
    case 'preparing':
      return 'bg-orange-100 text-orange-900';
    case 'confirmed':
      return 'bg-sky-100 text-sky-900';
    case 'waiting':
    default:
      return 'bg-amber-100 text-amber-900';
  }
}

const OPEN_STATUSES: OrderStatus[] = ['waiting', 'confirmed', 'preparing'];

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
    queryKey: ['orders', 'detail', detailId],
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
              <option value="waiting">Waiting</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">Preparing</option>
              <option value="completed">Completed</option>
              <option value="canceled">Canceled</option>
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
                  <th className="px-4 py-3">Cmd</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Table</th>
                  <th className="px-4 py-3">Products</th>
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
                    <td className="px-4 py-3 tabular-nums text-zinc-700">
                      {o.commandNumber != null ? `#${o.commandNumber}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={statusBadgeClass(o.status)}>{o.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {o.orderType === 'takeaway' ? (
                        <span className="text-zinc-600">Takeaway</span>
                      ) : (
                        <span className="font-medium text-zinc-800">Dine-in</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {o.table ? (
                        <span>
                          <span className="tabular-nums font-semibold text-zinc-900">#{o.table.tableNumber}</span>
                          {' · '}
                          {o.table.name}
                          {o.table.zone ? ` · ${o.table.zone}` : ''}
                          <span className="ml-1.5 text-xs text-zinc-500">({o.table.status})</span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-zinc-600">
                      {o.products?.map((p) => `${p.count}× ${p.name}`).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-zinc-900">
                      {formatMoney(o.total)}
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
          title={`Order ${detail.commandNumber != null ? `#${detail.commandNumber}` : `${detail.id.slice(0, 8)}…`}`}
          onClose={() => setDetailId(null)}
          className="max-w-lg"
        >
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={statusBadgeClass(detail.status)}>{detail.status}</Badge>
              <Badge className="bg-zinc-100 text-zinc-700">
                {detail.orderType === 'takeaway' ? 'Takeaway' : 'Dine-in'}
              </Badge>
              <span className="text-zinc-500">{new Date(detail.createdAt).toLocaleString()}</span>
            </div>

            {detail.reference ? (
              <div className="text-xs text-zinc-500">
                Reference <span className="font-mono text-zinc-700">{detail.reference}</span>
              </div>
            ) : null}

            {detail.table && (
              <div>
                <div className="text-xs font-medium uppercase text-zinc-500">Table</div>
                <div className="text-zinc-900">
                  <span className="tabular-nums font-semibold">#{detail.table.tableNumber}</span>
                  {' · '}
                  {detail.table.name}
                  {detail.table.zone ? ` · ${detail.table.zone}` : ''}
                  <span className="ml-2 text-zinc-500">({detail.table.status})</span>
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

            {(detail.note || detail.customerName) && (
              <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2">
                {detail.customerName ? (
                  <div>
                    <span className="text-xs font-medium uppercase text-zinc-500">Customer</span>
                    <div className="text-zinc-900">{detail.customerName}</div>
                  </div>
                ) : null}
                {detail.note ? (
                  <div className={detail.customerName ? 'mt-2' : ''}>
                    <span className="text-xs font-medium uppercase text-zinc-500">Order note</span>
                    <div className="text-zinc-800">{detail.note}</div>
                  </div>
                ) : null}
              </div>
            )}

            <CardTitle className="text-base">Products</CardTitle>
            <ul className="space-y-3 rounded-lg border border-zinc-100 bg-zinc-50/50 p-3">
              {(detail.products ?? []).map((row, idx) => {
                const meta = [row.categoryName, row.kind === 'composed' ? 'Composed' : null].filter(Boolean);
                const extrasLine = formatExtrasSummary(row.extras);
                return (
                  <li key={`${detail.id}-${idx}-${row.id}`} className="border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                    <div className="font-medium text-zinc-900">
                      {row.count}× {row.name}
                    </div>
                    {meta.length > 0 ? (
                      <div className="mt-0.5 text-xs text-zinc-500">{meta.join(' · ')}</div>
                    ) : null}
                    <div className="mt-0.5 text-xs text-zinc-500">{formatMoney(row.price)} unit</div>
                    {extrasLine ? (
                      <div className="mt-1 text-xs text-zinc-700">Extras: {extrasLine}</div>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            <div className="flex justify-between border-t border-zinc-100 pt-3 text-zinc-800">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatMoney(detail.subtotal)}</span>
            </div>
            <div className="flex justify-between text-zinc-800">
              <span>TVA</span>
              <span className="tabular-nums">{formatMoney(detail.tva)}</span>
            </div>
            {(detail.discount ?? 0) > 0 && detail.discountPrice != null ? (
              <div className="flex justify-between text-zinc-800">
                <span>Discount ({detail.discount}%)</span>
                <span className="tabular-nums text-emerald-700">−{formatMoney(detail.discountPrice)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-base font-semibold text-zinc-900">
              <span>Total</span>
              <span className="tabular-nums">{formatMoney(detail.total)}</span>
            </div>
            {detail.paymentMethod ? (
              <div className="text-xs text-zinc-500">
                Payment: <span className="font-medium text-zinc-700">{detail.paymentMethod}</span>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-2">
              {OPEN_STATUSES.includes(detail.status) ? (
                <Button
                  type="button"
                  disabled={patchStatus.isPending}
                  onClick={() => patchStatus.mutate({ id: detail.id, status: 'completed' })}
                >
                  Mark completed
                </Button>
              ) : null}
              {detail.status !== 'canceled' && detail.status !== 'completed' ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={patchStatus.isPending}
                  onClick={() => patchStatus.mutate({ id: detail.id, status: 'canceled' })}
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
