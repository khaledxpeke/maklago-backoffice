import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';
import { Card, CardTitle } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';
import { Modal } from '@/shared/ui/Modal';
import { Spinner } from '@/shared/ui/Spinner';
import { Badge } from '@/shared/ui/Badge';
import { CompositionAdminSection } from './CompositionAdminSection';
import { ImagePicker } from './ImagePicker';

type Category = {
  id: string;
  name: string;
  sortOrder: number;
  position?: number;
  productCount: number;
  image: string | null;
  isActive?: boolean;
};
type Product = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
  priceCents: number;
  price?: number;
  taxRateBps: number | null;
  sortOrder: number;
  image: string | null;
  outOfStock?: boolean;
  visible?: boolean;
  kind?: 'simple' | 'composed';
  type?: string[];
  compositionStepCount?: number;
};

const money = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function CatalogPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'categories' | 'products' | 'extras' | 'compositionTypes'>('categories');
  const [catFilter, setCatFilter] = useState<string>('');

  const { data: catData, isLoading: catLoading } = useQuery({
    queryKey: ['catalog', 'categories'],
    queryFn: () => apiRequest<{ categories: Category[] }>('/api/v1/catalog/categories'),
  });

  const { data: prodData, isLoading: prodLoading } = useQuery({
    queryKey: ['catalog', 'products', catFilter],
    queryFn: () => {
      const q = catFilter ? `?categoryId=${encodeURIComponent(catFilter)}` : '';
      return apiRequest<{ products: Product[] }>(`/api/v1/catalog/products${q}`);
    },
  });

  const [catModal, setCatModal] = useState<'create' | { edit: Category } | null>(null);
  const [prodModal, setProdModal] = useState<'create' | { edit: Product } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const createCat = useMutation({
    mutationFn: (body: { name: string; sortOrder?: number; image?: string | null }) =>
      apiRequest('/api/v1/catalog/categories', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['catalog'] });
      setCatModal(null);
      setErr(null);
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Error'),
  });

  const patchCat = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiRequest(`/api/v1/catalog/categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['catalog'] });
      setCatModal(null);
      setErr(null);
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Error'),
  });

  const deleteCat = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/v1/catalog/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['catalog'] }),
  });

  const createProd = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest('/api/v1/catalog/products', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['catalog'] });
      setProdModal(null);
      setErr(null);
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Error'),
  });

  const patchProd = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiRequest(`/api/v1/catalog/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['catalog'] });
      setProdModal(null);
      setErr(null);
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Error'),
  });

  const deleteProd = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/v1/catalog/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['catalog'] }),
  });

  const categories = catData?.categories ?? [];
  const products = prodData?.products ?? [];
  const totalProductsListed = products.reduce((acc, p) => acc + (p.outOfStock ? 0 : 1), 0);
  const outOfStockCount = products.filter((p) => p.outOfStock).length;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">Catalog</h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-600">
            Organize menu categories and products. Images sync to your mobile app; upload files or paste URLs after save.
          </p>
        </div>
        <div
          className="flex max-w-full flex-wrap gap-1 rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-1 shadow-sm"
          role="tablist"
          aria-label="Catalog section"
        >
          {(
            [
              ['categories', 'Categories'],
              ['products', 'Products'],
              ['extras', 'Extras'],
              ['compositionTypes', 'Composition'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition-all sm:px-4',
                tab === id
                  ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/80'
                  : 'text-zinc-600 hover:text-zinc-900',
              )}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {tab === 'categories' || tab === 'products' ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200/80 bg-gradient-to-br from-white to-zinc-50/80 px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Categories</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">{categories.length}</p>
          </div>
          <div className="rounded-xl border border-zinc-200/80 bg-gradient-to-br from-white to-zinc-50/80 px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Products (this view)</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">{products.length}</p>
            {catFilter ? (
              <p className="mt-0.5 text-xs text-zinc-500">Filtered by one category</p>
            ) : null}
          </div>
          <div className="rounded-xl border border-zinc-200/80 bg-gradient-to-br from-white to-zinc-50/80 px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Availability</p>
            <p className="mt-1 text-sm text-zinc-700">
              <span className="font-semibold text-emerald-700 tabular-nums">{totalProductsListed}</span> in stock
              {outOfStockCount > 0 ? (
                <>
                  {' · '}
                  <span className="font-semibold text-amber-800 tabular-nums">{outOfStockCount}</span> out
                </>
              ) : null}
            </p>
          </div>
        </div>
      ) : null}

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-900 shadow-sm">
          {err}
        </div>
      )}

      {tab === 'categories' && (
        <section className="space-y-4" aria-labelledby="catalog-categories-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle id="catalog-categories-heading" className="text-base sm:text-lg">
              Categories
            </CardTitle>
            <Button type="button" onClick={() => setCatModal('create')}>
              Add category
            </Button>
          </div>

          {catLoading ? (
            <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50">
              <Spinner />
            </div>
          ) : categories.length === 0 ? (
            <EmptyCatalog
              title="No categories yet"
              description="Start by creating a category. You can add a cover image so it looks great in the app."
              actionLabel="Create category"
              onAction={() => setCatModal('create')}
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {categories.map((c) => (
                <li key={c.id}>
                  <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-[var(--color-surface-elevated)] shadow-sm transition-shadow hover:shadow-md">
                    <div className="relative aspect-[16/10] overflow-hidden bg-zinc-100">
                      <MediaThumb
                        src={c.image}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-80" />
                      <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2">
                        <h3 className="text-lg font-semibold text-white drop-shadow-sm">{c.name}</h3>
                        <Badge className="border border-white/20 bg-white/90 text-zinc-800 shadow-sm backdrop-blur-sm">
                          {c.productCount} {c.productCount === 1 ? 'item' : 'items'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <p className="text-xs text-zinc-500">
                        Sort order <span className="font-medium text-zinc-700">{c.sortOrder}</span>
                      </p>
                      <div className="mt-auto flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
                        <Button
                          variant="secondary"
                          type="button"
                          className="flex-1 sm:flex-none"
                          onClick={() => setCatModal({ edit: c })}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          type="button"
                          className="flex-1 text-red-700 hover:bg-red-50 sm:flex-none"
                          onClick={() => {
                            if (confirm('Deactivate this category and all of its products?')) deleteCat.mutate(c.id);
                          }}
                        >
                          Deactivate
                        </Button>
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'products' && (
        <section className="space-y-4" aria-labelledby="catalog-products-heading">
          <Card className="border-zinc-200/80 !p-4 sm:!p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <CardTitle id="catalog-products-heading" className="text-base sm:text-lg">
                  Products
                </CardTitle>
                <p className="mt-1 text-sm text-zinc-500">Filter by category or browse the full menu.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-[200px]">
                  <Label htmlFor="filter" className="text-xs font-medium text-zinc-600">
                    Category
                  </Label>
                  <select
                    id="filter"
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none ring-zinc-300 focus:ring-2"
                    value={catFilter}
                    onChange={(e) => setCatFilter(e.target.value)}
                  >
                    <option value="">All categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="button" className="w-full sm:w-auto" onClick={() => setProdModal('create')}>
                  Add product
                </Button>
              </div>
            </div>
          </Card>

          {prodLoading ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50">
              <Spinner />
            </div>
          ) : products.length === 0 ? (
            <EmptyCatalog
              title={catFilter ? 'No products in this category' : 'No products yet'}
              description={
                catFilter
                  ? 'Try another category or clear the filter to see the full menu.'
                  : 'Add a product and attach a photo so it stands out on mobile.'
              }
              actionLabel="Add product"
              onAction={() => setProdModal('create')}
              secondaryActionLabel={catFilter ? 'Clear filter' : undefined}
              onSecondaryAction={catFilter ? () => setCatFilter('') : undefined}
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((p) => (
                <li key={p.id}>
                  <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-[var(--color-surface-elevated)] shadow-sm transition-shadow hover:shadow-md">
                    <div className="relative aspect-[4/3] bg-zinc-100">
                      <MediaThumb
                        src={p.image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute left-2 top-2 flex flex-col gap-1">
                        <Badge
                          className={cn(
                            'border shadow-sm backdrop-blur-sm',
                            p.outOfStock
                              ? 'border-amber-200/80 bg-amber-50/95 text-amber-900'
                              : 'border-emerald-200/80 bg-emerald-50/95 text-emerald-900',
                          )}
                        >
                          {p.outOfStock ? 'Out of stock' : 'In stock'}
                        </Badge>
                        {p.kind === 'composed' ? (
                          <Badge className="border border-indigo-200/80 bg-indigo-50/95 text-indigo-900 shadow-sm backdrop-blur-sm">
                            Composed · {p.compositionStepCount ?? p.type?.length ?? 0} steps
                          </Badge>
                        ) : (
                          <Badge className="border border-zinc-200/80 bg-white/90 text-zinc-700 shadow-sm backdrop-blur-sm">
                            Simple
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="text-base font-semibold leading-snug text-zinc-900">{p.name}</h3>
                        <p className="shrink-0 text-lg font-semibold tabular-nums text-zinc-900">
                          {money.format(p.priceCents / 100)}
                        </p>
                      </div>
                      <Badge className="w-fit bg-zinc-100/90 text-zinc-700">{p.categoryName}</Badge>
                      {p.description ? (
                        <p className="line-clamp-2 text-sm leading-relaxed text-zinc-600">{p.description}</p>
                      ) : (
                        <p className="text-sm italic text-zinc-400">No description</p>
                      )}
                      <div className="mt-auto flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
                        <Button
                          variant="secondary"
                          type="button"
                          className="flex-1 sm:flex-none"
                          onClick={() => setProdModal({ edit: p })}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          type="button"
                          className="flex-1 text-red-700 hover:bg-red-50 sm:flex-none"
                          onClick={() => {
                            if (confirm('Deactivate this product?')) deleteProd.mutate(p.id);
                          }}
                        >
                          Deactivate
                        </Button>
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'extras' && <CompositionAdminSection activeTab="extras" onError={setErr} />}

      {tab === 'compositionTypes' && <CompositionAdminSection activeTab="types" onError={setErr} />}

      {catModal === 'create' && (
        <CategoryFormModal
          key="new-cat"
          title="New category"
          onClose={() => setCatModal(null)}
          onSave={({ name, sortOrder, image }) => createCat.mutate({ name, sortOrder, image })}
          pending={createCat.isPending}
        />
      )}
      {catModal && typeof catModal === 'object' && 'edit' in catModal && (
        <CategoryFormModal
          key={catModal.edit.id}
          title="Edit category"
          initial={catModal.edit}
          onClose={() => setCatModal(null)}
          onSave={({ name, sortOrder, image }) =>
            patchCat.mutate({ id: catModal.edit.id, body: { name, sortOrder, image } })
          }
          pending={patchCat.isPending}
        />
      )}

      {prodModal === 'create' && (
        <ProductFormModal
          key="new-prod"
          categories={categories}
          title="New product"
          onClose={() => setProdModal(null)}
          onSave={(body) => createProd.mutate(body)}
          pending={createProd.isPending}
        />
      )}
      {prodModal && typeof prodModal === 'object' && 'edit' in prodModal && (
        <ProductFormModal
          key={prodModal.edit.id}
          categories={categories}
          title="Edit product"
          initial={prodModal.edit}
          onClose={() => setProdModal(null)}
          onSave={(body) => patchProd.mutate({ id: prodModal.edit.id, body })}
          pending={patchProd.isPending}
        />
      )}
    </div>
  );
}

function EmptyCatalog({
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/40 px-6 py-16 text-center">
      <div
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-200/60 text-2xl text-zinc-500"
        aria-hidden
      >
        ◇
      </div>
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-600">{description}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={onAction}>
          {actionLabel}
        </Button>
        {secondaryActionLabel && onSecondaryAction ? (
          <Button variant="secondary" type="button" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function MediaThumb({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className={cn(
          'flex h-full min-h-[120px] w-full items-center justify-center bg-zinc-100 text-center text-xs font-medium text-zinc-400',
          className,
        )}
      >
        No image
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}

function CategoryFormModal({
  title,
  initial,
  onClose,
  onSave,
  pending,
}: {
  title: string;
  initial?: Category;
  onClose: () => void;
  onSave: (fields: { name: string; sortOrder: number; image: string | null }) => void;
  pending: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [sort, setSort] = useState(String(initial?.sortOrder ?? 0));
  const [image, setImage] = useState<string | null>(initial?.image ?? null);
  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ name, sortOrder: Number(sort) || 0, image });
        }}
      >
        <ImagePicker label="Image" value={image} onChange={setImage} disabled={pending} />
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label>Sort order</Label>
          <Input type="number" value={sort} onChange={(e) => setSort(e.target.value)} />
        </div>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? <Spinner className="h-4 w-4" /> : null}
          Save
        </Button>
      </form>
    </Modal>
  );
}

function ProductFormModal({
  title,
  categories,
  initial,
  onClose,
  onSave,
  pending,
}: {
  title: string;
  categories: Category[];
  initial?: Product;
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => void;
  pending: boolean;
}) {
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [price, setPrice] = useState(initial ? String(initial.priceCents / 100) : '');
  const [sort, setSort] = useState(String(initial?.sortOrder ?? 0));
  const [image, setImage] = useState<string | null>(initial?.image ?? null);
  const [outOfStock, setOutOfStock] = useState(initial?.outOfStock ?? false);
  const [kind, setKind] = useState<'simple' | 'composed'>(initial?.kind ?? 'simple');
  const [stepIds, setStepIds] = useState<string[]>(() =>
    initial?.type?.length ? [...initial.type] : [],
  );
  const [addStepId, setAddStepId] = useState('');
  const [stepSearch, setStepSearch] = useState('');

  const { data: compTypesData } = useQuery({
    queryKey: ['catalog', 'composition-types'],
    queryFn: () =>
      apiRequest<{ compositionTypes: { id: string; label: string; name: string; isActive?: boolean }[] }>(
        '/api/v1/catalog/composition-types?includeInactive=1',
      ),
  });

  const assignableTypes = (compTypesData?.compositionTypes ?? []).filter((t) => t.isActive !== false);
  const availableToAdd = assignableTypes.filter((t) => !stepIds.includes(t.id));
  const stepQ = stepSearch.trim().toLowerCase();
  const availableFiltered =
    stepQ === ''
      ? availableToAdd
      : availableToAdd.filter((t) => {
          const hay = `${t.label} ${t.name}`.toLowerCase();
          return hay.includes(stepQ);
        });

  const moveStep = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= stepIds.length) return;
    setStepIds((prev) => {
      const next = [...prev];
      const tmp = next[idx];
      next[idx] = next[j]!;
      next[j] = tmp!;
      return next;
    });
  };

  const removeStep = (idx: number) => {
    setStepIds((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <Modal title={title} onClose={onClose} className="max-w-lg">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const priceCents = Math.round(Number(price) * 100);
          if (Number.isNaN(priceCents)) return;
          if (kind === 'composed' && stepIds.length === 0) {
            return;
          }
          const body: Record<string, unknown> = {
            categoryId,
            name,
            description: description || null,
            priceCents,
            sortOrder: Number(sort) || 0,
            image,
            outOfStock,
            kind,
            ...(kind === 'composed' ? { compositionTypeIds: stepIds } : { compositionTypeIds: [] }),
          };
          onSave(body);
        }}
      >
        <ImagePicker label="Image" value={image} onChange={setImage} disabled={pending} />
        <div>
          <Label>Category</Label>
          <select
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Product type</Label>
          <select
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
            value={kind}
            onChange={(e) => {
              const k = e.target.value as 'simple' | 'composed';
              setKind(k);
              if (k === 'simple') setStepIds([]);
            }}
          >
            <option value="simple">Simple (add to cart directly; optional modifiers)</option>
            <option value="composed">Composed (customer picks extras per step)</option>
          </select>
          <p className="mt-1 text-xs text-zinc-500">
            Composed products need composition types defined under the Composition tab, with extras on each type.
          </p>
        </div>

        {kind === 'composed' ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3">
            <Label>Composition steps (order)</Label>
            {stepIds.length === 0 ? (
              <p className="mt-2 text-sm text-amber-800">Add at least one composition type as a step.</p>
            ) : (
              <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto pr-1">
                {stepIds.map((tid, idx) => {
                  const meta = assignableTypes.find((t) => t.id === tid);
                  return (
                    <li
                      key={tid}
                      className="flex shrink-0 items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm"
                    >
                      <span>
                        {idx + 1}. {meta?.label ?? meta?.name ?? tid}
                      </span>
                      <span className="flex gap-1">
                        <Button type="button" variant="ghost" className="px-2 py-0.5 text-xs" onClick={() => moveStep(idx, -1)}>
                          ↑
                        </Button>
                        <Button type="button" variant="ghost" className="px-2 py-0.5 text-xs" onClick={() => moveStep(idx, 1)}>
                          ↓
                        </Button>
                        <Button type="button" variant="ghost" className="px-2 py-0.5 text-xs text-red-700" onClick={() => removeStep(idx)}>
                          ✕
                        </Button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-3 space-y-2">
              <div>
                <Label htmlFor="add-step-search">Search composition types</Label>
                <Input
                  id="add-step-search"
                  type="search"
                  autoComplete="off"
                  placeholder="Filter by label or internal name…"
                  value={stepSearch}
                  onChange={(e) => setStepSearch(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex flex-wrap gap-2">
              <select
                className="min-w-[180px] flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                value={addStepId}
                onChange={(e) => setAddStepId(e.target.value)}
              >
                <option value="">Add step…</option>
                {availableFiltered.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({t.name})
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="secondary"
                disabled={!addStepId}
                onClick={() => {
                  if (!addStepId) return;
                  setStepIds((prev) => [...prev, addStepId]);
                  setAddStepId('');
                }}
              >
                Add
              </Button>
            </div>
              {availableToAdd.length > 0 && availableFiltered.length === 0 ? (
                <p className="text-xs text-zinc-500">No types match this search.</p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label>Description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <Label>Base price (major units)</Label>
          <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
        </div>
        <div>
          <Label>Sort order</Label>
          <Input type="number" value={sort} onChange={(e) => setSort(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={outOfStock}
            onChange={(e) => setOutOfStock(e.target.checked)}
            className="rounded border-zinc-300"
          />
          Out of stock
        </label>
        <Button type="submit" disabled={pending || (kind === 'composed' && stepIds.length === 0)} className="w-full">
          {pending ? <Spinner className="h-4 w-4" /> : null}
          Save
        </Button>
      </form>
    </Modal>
  );
}
