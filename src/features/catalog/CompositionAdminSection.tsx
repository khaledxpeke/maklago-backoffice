import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';
import { Button } from '@/shared/ui/Button';
import { Card, CardTitle } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';
import { Modal } from '@/shared/ui/Modal';
import { Spinner } from '@/shared/ui/Spinner';
import { Badge } from '@/shared/ui/Badge';
import { ImagePicker } from './ImagePicker';

const money = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export type ExtraRow = {
  id: string;
  name: string;
  image: string | null;
  priceCents: number;
  suppPriceCents: number;
  outOfStock: boolean;
  visible: boolean;
  sortOrder: number;
};

export type CompositionTypeRow = {
  id: string;
  name: string;
  label: string;
  message: string | null;
  min: number;
  max: number;
  payment: boolean;
  selection: boolean;
  mode: string;
  sortOrder: number;
  isActive?: boolean;
  extraIds: string[];
  extras: ExtraRow[];
};

type Tab = 'extras' | 'types';

export function CompositionAdminSection({
  activeTab,
  onError,
}: {
  activeTab: Tab;
  onError: (msg: string | null) => void;
}) {
  const qc = useQueryClient();

  const { data: extraData, isLoading: extraLoading } = useQuery({
    queryKey: ['catalog', 'extras'],
    queryFn: () => apiRequest<{ extras: ExtraRow[] }>('/api/v1/catalog/extras'),
  });

  const { data: typeData, isLoading: typeLoading } = useQuery({
    queryKey: ['catalog', 'composition-types'],
    queryFn: () =>
      apiRequest<{ compositionTypes: CompositionTypeRow[] }>('/api/v1/catalog/composition-types?includeInactive=1'),
  });

  const [extraModal, setExtraModal] = useState<'create' | { edit: ExtraRow } | null>(null);
  const [typeModal, setTypeModal] = useState<'create' | { edit: CompositionTypeRow } | null>(null);
  const [assignType, setAssignType] = useState<CompositionTypeRow | null>(null);

  const createIng = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest('/api/v1/catalog/extras', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['catalog'] });
      setExtraModal(null);
      onError(null);
    },
    onError: (e) => onError(e instanceof ApiError ? e.message : 'Error'),
  });

  const patchIng = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiRequest(`/api/v1/catalog/extras/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['catalog'] });
      setExtraModal(null);
      onError(null);
    },
    onError: (e) => onError(e instanceof ApiError ? e.message : 'Error'),
  });

  const deleteIng = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/v1/catalog/extras/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['catalog'] }),
    onError: (e) => onError(e instanceof ApiError ? e.message : 'Error'),
  });

  const createType = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest('/api/v1/catalog/composition-types', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['catalog'] });
      setTypeModal(null);
      onError(null);
    },
    onError: (e) => onError(e instanceof ApiError ? e.message : 'Error'),
  });

  const patchType = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiRequest(`/api/v1/catalog/composition-types/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['catalog'] });
      setTypeModal(null);
      onError(null);
    },
    onError: (e) => onError(e instanceof ApiError ? e.message : 'Error'),
  });

  const deleteType = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/v1/catalog/composition-types/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['catalog'] }),
    onError: (e) => onError(e instanceof ApiError ? e.message : 'Error'),
  });

  const putTypeExtras = useMutation({
    mutationFn: ({ id, extraIds }: { id: string; extraIds: string[] }) =>
      apiRequest(`/api/v1/catalog/composition-types/${id}/extras`, {
        method: 'PUT',
        body: JSON.stringify({ extraIds }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['catalog'] });
      setAssignType(null);
      onError(null);
    },
    onError: (e) => onError(e instanceof ApiError ? e.message : 'Error'),
  });

  const extrasList = extraData?.extras ?? [];
  const types = typeData?.compositionTypes ?? [];

  if (activeTab === 'extras') {
    return (
      <>
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg">Extras</CardTitle>
              <p className="mt-1 text-sm text-zinc-600">
                Items customers pick inside a composition step (e.g. sauces). Use <strong>Supp. price</strong> when the
                step has &quot;Payment&quot; off; use <strong>Price</strong> when the step has &quot;Payment&quot; on.
              </p>
            </div>
            <Button type="button" onClick={() => setExtraModal('create')}>
              Add extra
            </Button>
          </div>

          {extraLoading ? (
            <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-zinc-200">
              <Spinner />
            </div>
          ) : extrasList.length === 0 ? (
            <Card className="border-dashed !py-12 text-center text-sm text-zinc-600">
              No extras yet. Create one, then attach it to a composition type.
            </Card>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {extrasList.map((row) => (
                <li key={row.id}>
                  <Card className="!p-4">
                    <div className="flex gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                        {row.image ? (
                          <img src={row.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-zinc-400">—</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-zinc-900">{row.name}</p>
                        <p className="mt-1 text-xs text-zinc-600">
                          Price {money.format(row.priceCents / 100)} · Supp. {money.format(row.suppPriceCents / 100)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {!row.visible ? <Badge className="bg-zinc-200 text-zinc-700">Hidden</Badge> : null}
                          {row.outOfStock ? <Badge className="bg-amber-100 text-amber-900">Out of stock</Badge> : null}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
                      <Button variant="secondary" type="button" className="text-sm" onClick={() => setExtraModal({ edit: row })}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        type="button"
                        className="text-sm text-red-700"
                        onClick={() => {
                          if (confirm(`Delete extra “${row.name}”? It will be removed from all composition types.`)) {
                            deleteIng.mutate(row.id);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        {extraModal === 'create' && (
          <ExtraFormModal
            title="New extra"
            onClose={() => setExtraModal(null)}
            onSave={(body) => createIng.mutate(body)}
            pending={createIng.isPending}
          />
        )}
        {extraModal && typeof extraModal === 'object' && 'edit' in extraModal && (
          <ExtraFormModal
            title="Edit extra"
            initial={extraModal.edit}
            onClose={() => setExtraModal(null)}
            onSave={(body) => patchIng.mutate({ id: extraModal.edit.id, body })}
            pending={patchIng.isPending}
          />
        )}
      </>
    );
  }

  return (
    <>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base sm:text-lg">Composition types</CardTitle>
            <p className="mt-1 text-sm text-zinc-600">
              Steps shown on composed products (e.g. &quot;Sauce&quot; with min/max picks). Link extras to each type,
              then order these types on each product.
            </p>
          </div>
          <Button type="button" onClick={() => setTypeModal('create')}>
            Add composition type
          </Button>
        </div>

        {typeLoading ? (
          <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-zinc-200">
            <Spinner />
          </div>
        ) : types.length === 0 ? (
          <Card className="border-dashed !py-12 text-center text-sm text-zinc-600">
            No composition types yet. Create one, assign extras, then use it on a composed product.
          </Card>
        ) : (
          <ul className="space-y-3">
            {types.map((t) => (
              <li key={t.id}>
                <Card className="!p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-zinc-900">{t.label}</h3>
                        <Badge className="font-mono text-[10px]">{t.name}</Badge>
                        {t.isActive === false ? <Badge className="bg-zinc-200 text-zinc-700">Inactive</Badge> : null}
                        {!t.payment ? (
                          <Badge className="bg-sky-50 text-sky-900">Supp. pricing</Badge>
                        ) : (
                          <Badge className="bg-violet-50 text-violet-900">Paid add-ons</Badge>
                        )}
                      </div>
                      {t.message ? <p className="mt-1 text-sm text-zinc-600">{t.message}</p> : null}
                      <p className="mt-2 text-xs text-zinc-500">
                        Pick {t.min}–{t.max} · {t.extras.length} extra(s) · Mode {t.mode}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" type="button" className="text-sm" onClick={() => setAssignType(t)}>
                        Extras
                      </Button>
                      <Button variant="secondary" type="button" className="text-sm" onClick={() => setTypeModal({ edit: t })}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        type="button"
                        className="text-sm text-red-700"
                        onClick={() => {
                          if (confirm(`Delete composition type “${t.label}”?`)) deleteType.mutate(t.id);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {typeModal === 'create' && (
        <CompositionTypeFormModal
          title="New composition type"
          onClose={() => setTypeModal(null)}
          onSave={(body) => createType.mutate(body)}
          pending={createType.isPending}
        />
      )}
      {typeModal && typeof typeModal === 'object' && 'edit' in typeModal && (
        <CompositionTypeFormModal
          title="Edit composition type"
          initial={typeModal.edit}
          onClose={() => setTypeModal(null)}
          onSave={(body) => patchType.mutate({ id: typeModal.edit.id, body })}
          pending={patchType.isPending}
        />
      )}

      {assignType ? (
        <AssignExtrasModal
          compositionType={assignType}
          allExtras={extrasList}
          onClose={() => setAssignType(null)}
          onSave={(extraIds) => putTypeExtras.mutate({ id: assignType.id, extraIds })}
          pending={putTypeExtras.isPending}
        />
      ) : null}
    </>
  );
}

function ExtraFormModal({
  title,
  initial,
  onClose,
  onSave,
  pending,
}: {
  title: string;
  initial?: ExtraRow;
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => void;
  pending: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [price, setPrice] = useState(initial ? String(initial.priceCents / 100) : '0');
  const [supp, setSupp] = useState(initial ? String(initial.suppPriceCents / 100) : '0');
  const [sort, setSort] = useState(String(initial?.sortOrder ?? 0));
  const [visible, setVisible] = useState(initial?.visible ?? true);
  const [outOfStock, setOutOfStock] = useState(initial?.outOfStock ?? false);
  const [image, setImage] = useState<string | null>(initial?.image ?? null);

  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const priceCents = Math.round(Number(price) * 100);
          const suppPriceCents = Math.round(Number(supp) * 100);
          if (Number.isNaN(priceCents) || Number.isNaN(suppPriceCents)) return;
          onSave({
            name,
            priceCents,
            suppPriceCents,
            sortOrder: Number(sort) || 0,
            visible,
            outOfStock,
            image,
          });
        }}
      >
        <ImagePicker label="Image (optional)" value={image} onChange={setImage} disabled={pending} />
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Price (paid step)</Label>
            <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <Label>Supp. price (free step)</Label>
            <Input type="number" step="0.01" value={supp} onChange={(e) => setSupp(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Sort order</Label>
          <Input type="number" value={sort} onChange={(e) => setSort(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="rounded border-zinc-300" />
          Visible in app
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={outOfStock}
            onChange={(e) => setOutOfStock(e.target.checked)}
            className="rounded border-zinc-300"
          />
          Out of stock
        </label>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? <Spinner className="h-4 w-4" /> : null}
          Save
        </Button>
      </form>
    </Modal>
  );
}

function CompositionTypeFormModal({
  title,
  initial,
  onClose,
  onSave,
  pending,
}: {
  title: string;
  initial?: CompositionTypeRow;
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => void;
  pending: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [message, setMessage] = useState(initial?.message ?? '');
  const [min, setMin] = useState(String(initial?.min ?? 0));
  const [max, setMax] = useState(String(initial?.max ?? 1));
  const [payment, setPayment] = useState(initial?.payment ?? false);
  const [selection, setSelection] = useState(initial?.selection ?? false);
  const [sort, setSort] = useState(String(initial?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(initial?.isActive !== false);

  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            name,
            label,
            message: message.trim() || null,
            min: Number(min) || 0,
            max: Number(max) || 1,
            payment,
            selection,
            sortOrder: Number(sort) || 0,
            ...(initial ? { isActive } : {}),
          });
        }}
      >
        <div>
          <Label>Internal name (slug)</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="sauce" />
        </div>
        <div>
          <Label>Label (shown in app)</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} required placeholder="Sauce" />
        </div>
        <div>
          <Label>Hint message</Label>
          <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Choose one sauce" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Min picks</Label>
            <Input type="number" min={0} value={min} onChange={(e) => setMin(e.target.value)} />
          </div>
          <div>
            <Label>Max picks</Label>
            <Input type="number" min={0} value={max} onChange={(e) => setMax(e.target.value)} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={payment} onChange={(e) => setPayment(e.target.checked)} className="rounded border-zinc-300" />
          <span>
            Payment on (use extra <span className="font-semibold">Price</span> field)
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={selection}
            onChange={(e) => setSelection(e.target.checked)}
            className="rounded border-zinc-300"
          />
          Multi-style selection UI (metadata for clients)
        </label>
        <div>
          <Label>Sort order</Label>
          <Input type="number" value={sort} onChange={(e) => setSort(e.target.value)} />
        </div>
        {initial ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-zinc-300"
            />
            Active (inactive types are hidden when building product steps)
          </label>
        ) : null}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? <Spinner className="h-4 w-4" /> : null}
          Save
        </Button>
      </form>
    </Modal>
  );
}

function AssignExtrasModal({
  compositionType,
  allExtras,
  onClose,
  onSave,
  pending,
}: {
  compositionType: CompositionTypeRow;
  allExtras: ExtraRow[];
  onClose: () => void;
  onSave: (ids: string[]) => void;
  pending: boolean;
}) {
  const [ordered, setOrdered] = useState<string[]>(() => [...compositionType.extraIds]);
  const [extraSearch, setExtraSearch] = useState('');

  const extraQuery = extraSearch.trim().toLowerCase();
  const filteredExtras =
    extraQuery === ''
      ? allExtras
      : allExtras.filter((row) => row.name.toLowerCase().includes(extraQuery));

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= ordered.length) return;
    setOrdered((prev) => {
      const next = [...prev];
      const t = next[idx];
      next[idx] = next[j]!;
      next[j] = t!;
      return next;
    });
  };

  const toggle = (id: string) => {
    setOrdered((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <Modal title={`Extras · ${compositionType.label}`} onClose={onClose} className="max-w-lg">
      <p className="mb-3 text-sm text-zinc-600">
        Choose which extras belong to this step. Order matches the list below (top = first in app).
      </p>
      <div className="mb-2">
        <Label htmlFor="assign-extras-search">Search extras</Label>
        <Input
          id="assign-extras-search"
          type="search"
          autoComplete="off"
          placeholder="Filter by name…"
          value={extraSearch}
          onChange={(e) => setExtraSearch(e.target.value)}
          className="mt-1"
        />
        {allExtras.length > 0 ? (
          <p className="mt-1 text-xs text-zinc-500">
            Showing {filteredExtras.length} of {allExtras.length}
            {extraQuery ? ` matching “${extraSearch.trim()}”` : ''}
          </p>
        ) : null}
      </div>
      <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 p-2">
        {allExtras.length === 0 ? (
          <p className="text-sm text-zinc-500">Create extras first.</p>
        ) : filteredExtras.length === 0 ? (
          <p className="text-sm text-zinc-500">No extras match this search.</p>
        ) : (
          filteredExtras.map((row) => (
            <label key={row.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-50">
              <input
                type="checkbox"
                checked={ordered.includes(row.id)}
                onChange={() => toggle(row.id)}
                className="rounded border-zinc-300"
              />
              <span className="text-sm">{row.name}</span>
            </label>
          ))
        )}
      </div>
      {ordered.length > 0 ? (
        <div className="mt-4">
          <Label>Order on this step</Label>
          <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/50 p-2">
            {ordered.map((id, idx) => {
              const row = allExtras.find((i) => i.id === id);
              return (
                <li key={id} className="flex shrink-0 items-center justify-between gap-2 rounded-md bg-white px-2 py-1.5 text-sm shadow-sm">
                  <span>{row?.name ?? id}</span>
                  <span className="flex gap-1">
                    <Button type="button" variant="ghost" className="px-2 py-0.5 text-xs" onClick={() => move(idx, -1)}>
                      ↑
                    </Button>
                    <Button type="button" variant="ghost" className="px-2 py-0.5 text-xs" onClick={() => move(idx, 1)}>
                      ↓
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      <div className="mt-4 flex gap-2">
        <Button type="button" className="flex-1" disabled={pending} onClick={() => onSave(ordered)}>
          {pending ? <Spinner className="h-4 w-4" /> : null}
          Save links
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
