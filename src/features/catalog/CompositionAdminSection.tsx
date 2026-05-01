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

export type IngredientRow = {
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
  ingredientIds: string[];
  ingredients: IngredientRow[];
};

type Tab = 'ingredients' | 'types';

export function CompositionAdminSection({
  activeTab,
  onError,
}: {
  activeTab: Tab;
  onError: (msg: string | null) => void;
}) {
  const qc = useQueryClient();

  const { data: ingData, isLoading: ingLoading } = useQuery({
    queryKey: ['catalog', 'ingredients'],
    queryFn: () => apiRequest<{ ingredients: IngredientRow[] }>('/api/v1/catalog/ingredients'),
  });

  const { data: typeData, isLoading: typeLoading } = useQuery({
    queryKey: ['catalog', 'composition-types'],
    queryFn: () =>
      apiRequest<{ compositionTypes: CompositionTypeRow[] }>('/api/v1/catalog/composition-types?includeInactive=1'),
  });

  const [ingModal, setIngModal] = useState<'create' | { edit: IngredientRow } | null>(null);
  const [typeModal, setTypeModal] = useState<'create' | { edit: CompositionTypeRow } | null>(null);
  const [assignType, setAssignType] = useState<CompositionTypeRow | null>(null);

  const createIng = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest('/api/v1/catalog/ingredients', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['catalog'] });
      setIngModal(null);
      onError(null);
    },
    onError: (e) => onError(e instanceof ApiError ? e.message : 'Error'),
  });

  const patchIng = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiRequest(`/api/v1/catalog/ingredients/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['catalog'] });
      setIngModal(null);
      onError(null);
    },
    onError: (e) => onError(e instanceof ApiError ? e.message : 'Error'),
  });

  const deleteIng = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/v1/catalog/ingredients/${id}`, { method: 'DELETE' }),
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

  const putTypeIngredients = useMutation({
    mutationFn: ({ id, ingredientIds }: { id: string; ingredientIds: string[] }) =>
      apiRequest(`/api/v1/catalog/composition-types/${id}/ingredients`, {
        method: 'PUT',
        body: JSON.stringify({ ingredientIds }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['catalog'] });
      setAssignType(null);
      onError(null);
    },
    onError: (e) => onError(e instanceof ApiError ? e.message : 'Error'),
  });

  const ingredients = ingData?.ingredients ?? [];
  const types = typeData?.compositionTypes ?? [];

  if (activeTab === 'ingredients') {
    return (
      <>
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg">Ingredients</CardTitle>
              <p className="mt-1 text-sm text-zinc-600">
                Items customers pick inside a composition step (e.g. sauces). Use <strong>Supp. price</strong> when the
                step has &quot;Payment&quot; off; use <strong>Price</strong> when the step has &quot;Payment&quot; on.
              </p>
            </div>
            <Button type="button" onClick={() => setIngModal('create')}>
              Add ingredient
            </Button>
          </div>

          {ingLoading ? (
            <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-zinc-200">
              <Spinner />
            </div>
          ) : ingredients.length === 0 ? (
            <Card className="border-dashed !py-12 text-center text-sm text-zinc-600">
              No ingredients yet. Create one, then attach it to a composition type.
            </Card>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {ingredients.map((ing) => (
                <li key={ing.id}>
                  <Card className="!p-4">
                    <div className="flex gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                        {ing.image ? (
                          <img src={ing.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-zinc-400">—</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-zinc-900">{ing.name}</p>
                        <p className="mt-1 text-xs text-zinc-600">
                          Price {money.format(ing.priceCents / 100)} · Supp. {money.format(ing.suppPriceCents / 100)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {!ing.visible ? <Badge className="bg-zinc-200 text-zinc-700">Hidden</Badge> : null}
                          {ing.outOfStock ? <Badge className="bg-amber-100 text-amber-900">Out of stock</Badge> : null}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
                      <Button variant="secondary" type="button" className="text-sm" onClick={() => setIngModal({ edit: ing })}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        type="button"
                        className="text-sm text-red-700"
                        onClick={() => {
                          if (confirm(`Delete ingredient “${ing.name}”? It will be removed from all composition types.`)) {
                            deleteIng.mutate(ing.id);
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

        {ingModal === 'create' && (
          <IngredientFormModal
            title="New ingredient"
            onClose={() => setIngModal(null)}
            onSave={(body) => createIng.mutate(body)}
            pending={createIng.isPending}
          />
        )}
        {ingModal && typeof ingModal === 'object' && 'edit' in ingModal && (
          <IngredientFormModal
            title="Edit ingredient"
            initial={ingModal.edit}
            onClose={() => setIngModal(null)}
            onSave={(body) => patchIng.mutate({ id: ingModal.edit.id, body })}
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
              Steps shown on composed products (e.g. &quot;Sauce&quot; with min/max picks). Link ingredients to each
              type, then order these types on each product.
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
            No composition types yet. Create one, assign ingredients, then use it on a composed product.
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
                        Pick {t.min}–{t.max} · {t.ingredients.length} ingredient(s) · Mode {t.mode}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" type="button" className="text-sm" onClick={() => setAssignType(t)}>
                        Ingredients
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
        <AssignIngredientsModal
          compositionType={assignType}
          allIngredients={ingredients}
          onClose={() => setAssignType(null)}
          onSave={(ingredientIds) => putTypeIngredients.mutate({ id: assignType.id, ingredientIds })}
          pending={putTypeIngredients.isPending}
        />
      ) : null}
    </>
  );
}

function IngredientFormModal({
  title,
  initial,
  onClose,
  onSave,
  pending,
}: {
  title: string;
  initial?: IngredientRow;
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
            Payment on (use ingredient <span className="font-semibold">Price</span> field)
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

function AssignIngredientsModal({
  compositionType,
  allIngredients,
  onClose,
  onSave,
  pending,
}: {
  compositionType: CompositionTypeRow;
  allIngredients: IngredientRow[];
  onClose: () => void;
  onSave: (ids: string[]) => void;
  pending: boolean;
}) {
  const [ordered, setOrdered] = useState<string[]>(() => [...compositionType.ingredientIds]);

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
    <Modal title={`Ingredients · ${compositionType.label}`} onClose={onClose}>
      <p className="mb-3 text-sm text-zinc-600">
        Choose which ingredients belong to this step. Order matches the list below (top = first in app).
      </p>
      <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 p-2">
        {allIngredients.length === 0 ? (
          <p className="text-sm text-zinc-500">Create ingredients first.</p>
        ) : (
          allIngredients.map((ing) => (
            <label key={ing.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-50">
              <input
                type="checkbox"
                checked={ordered.includes(ing.id)}
                onChange={() => toggle(ing.id)}
                className="rounded border-zinc-300"
              />
              <span className="text-sm">{ing.name}</span>
            </label>
          ))
        )}
      </div>
      {ordered.length > 0 ? (
        <div className="mt-4">
          <Label>Order on this step</Label>
          <ul className="mt-2 space-y-1 rounded-lg border border-zinc-200 bg-zinc-50/50 p-2">
            {ordered.map((id, idx) => {
              const ing = allIngredients.find((i) => i.id === id);
              return (
                <li key={id} className="flex items-center justify-between gap-2 rounded-md bg-white px-2 py-1.5 text-sm shadow-sm">
                  <span>{ing?.name ?? id}</span>
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
