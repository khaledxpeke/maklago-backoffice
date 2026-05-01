import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';
import { Modal } from '@/shared/ui/Modal';
import { Spinner } from '@/shared/ui/Spinner';
import { Badge } from '@/shared/ui/Badge';

export type TableRow = {
  id: string;
  name: string;
  tableNumber: number;
  zone: string | null;
  sortOrder: number;
  status: 'free' | 'occupied';
  isActive: boolean;
  createdAt: string;
};

function statusBadgeClass(s: TableRow['status']) {
  return s === 'occupied'
    ? 'bg-amber-100 text-amber-900'
    : 'bg-emerald-100 text-emerald-800';
}

export function TablesPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'create' | { edit: TableRow } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: () => apiRequest<{ tables: TableRow[] }>('/api/v1/tables'),
  });

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<{ table: TableRow }>('/api/v1/tables', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tables'] });
      setModal(null);
      setErr(null);
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Could not create table'),
  });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiRequest<{ table: TableRow }>(`/api/v1/tables/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tables'] });
      setModal(null);
      setErr(null);
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Could not update table'),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/api/v1/tables/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tables'] });
      setErr(null);
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Could not remove table'),
  });

  const rows = data?.tables ?? [];

  const confirmRemove = (row: TableRow) => {
    if (
      !window.confirm(
        `Remove table #${row.tableNumber} (${row.name}) from the floor plan? It can be re-added later with a new number if needed.`,
      )
    ) {
      return;
    }
    remove.mutate(row.id);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Tables</h1>
          <p className="text-sm text-zinc-500">
            Floor layout: numbers appear in order lists and POS. Status updates when there are open dine-in orders.
          </p>
        </div>
        <Button type="button" onClick={() => setModal('create')}>
          Add table
        </Button>
      </div>

      {err && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</div>
      )}

      <Card>
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500">
                  <th className="px-2 py-3 font-medium">#</th>
                  <th className="px-2 py-3 font-medium">Name</th>
                  <th className="px-2 py-3 font-medium">Zone</th>
                  <th className="px-2 py-3 font-medium">Status</th>
                  <th className="px-2 py-3 font-medium">Sort</th>
                  <th className="px-2 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-b border-zinc-100">
                    <td className="px-2 py-3 tabular-nums font-semibold text-zinc-900">{t.tableNumber}</td>
                    <td className="px-2 py-3 font-medium text-zinc-800">{t.name}</td>
                    <td className="px-2 py-3 text-zinc-600">{t.zone ?? '—'}</td>
                    <td className="px-2 py-3">
                      <Badge className={statusBadgeClass(t.status)}>{t.status}</Badge>
                    </td>
                    <td className="px-2 py-3 tabular-nums text-zinc-600">{t.sortOrder}</td>
                    <td className="px-2 py-3 text-right">
                      <Button variant="ghost" type="button" className="mr-1 text-sm" onClick={() => setModal({ edit: t })}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        type="button"
                        className="text-sm text-red-700 hover:bg-red-50"
                        disabled={remove.isPending}
                        onClick={() => confirmRemove(t)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="px-4 py-12 text-center text-sm text-zinc-500">No tables yet. Add one to use dine-in orders.</div>
            )}
          </div>
        )}
      </Card>

      {modal === 'create' && (
        <TableFormModal
          key="new"
          title="New table"
          onClose={() => setModal(null)}
          onSave={(body) => create.mutate(body)}
          pending={create.isPending}
        />
      )}
      {modal !== null && modal !== 'create' && 'edit' in modal && (
        <TableFormModal
          key={modal.edit.id}
          title="Edit table"
          initial={modal.edit}
          onClose={() => setModal(null)}
          onSave={(body) => patch.mutate({ id: modal.edit.id, body })}
          pending={patch.isPending}
        />
      )}
    </div>
  );
}

function TableFormModal({
  title,
  initial,
  onClose,
  onSave,
  pending,
}: {
  title: string;
  initial?: TableRow;
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => void;
  pending: boolean;
}) {
  const [tableNumber, setTableNumber] = useState(initial ? String(initial.tableNumber) : '');
  const [name, setName] = useState(initial?.name ?? '');
  const [zone, setZone] = useState(initial?.zone ?? '');
  const [sortOrder, setSortOrder] = useState(initial !== undefined ? String(initial.sortOrder) : '0');
  const [status, setStatus] = useState<TableRow['status']>(initial?.status ?? 'free');

  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const num = Number.parseInt(tableNumber, 10);
          if (!Number.isFinite(num) || num < 1) return;
          const sort = Number.parseInt(sortOrder, 10);
          const sortVal = Number.isFinite(sort) ? sort : 0;
          const zoneVal = zone.trim() === '' ? null : zone.trim();
          if (initial) {
            onSave({
              tableNumber: num,
              name: name.trim(),
              zone: zoneVal,
              sortOrder: sortVal,
              status,
            });
          } else {
            onSave({
              tableNumber: num,
              name: name.trim(),
              zone: zoneVal,
              sortOrder: sortVal,
            });
          }
        }}
      >
        <div>
          <Label htmlFor="table-num">Table number</Label>
          <Input
            id="table-num"
            inputMode="numeric"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder="e.g. 12"
            required
          />
          <p className="mt-1 text-xs text-zinc-500">Unique per restaurant; shown in orders and pickers.</p>
        </div>
        <div>
          <Label htmlFor="table-name">Display name</Label>
          <Input id="table-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Table 12" required />
        </div>
        <div>
          <Label htmlFor="table-zone">Zone (optional)</Label>
          <Input id="table-zone" value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Terrace, Main…" />
        </div>
        <div>
          <Label htmlFor="table-sort">Sort order</Label>
          <Input
            id="table-sort"
            inputMode="numeric"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </div>
        {initial && (
          <div>
            <Label htmlFor="table-status">Status</Label>
            <select
              id="table-status"
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as TableRow['status'])}
            >
              <option value="free">free</option>
              <option value="occupied">occupied</option>
            </select>
            <p className="mt-1 text-xs text-zinc-500">Normally driven by open dine-in orders; override if needed.</p>
          </div>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? <Spinner className="h-4 w-4" /> : null}
          Save
        </Button>
      </form>
    </Modal>
  );
}
