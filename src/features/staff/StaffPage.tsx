import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';
import type { StaffRole } from '@/app/auth-context';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';
import { Modal } from '@/shared/ui/Modal';
import { Spinner } from '@/shared/ui/Spinner';
import { Badge } from '@/shared/ui/Badge';

type StaffRow = {
  id: string;
  email: string;
  fullName: string;
  role: StaffRole;
  isActive: boolean;
  createdAt: string;
};

export function StaffPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'create' | { edit: StaffRow } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => apiRequest<{ staff: StaffRow[] }>('/api/v1/staff'),
  });

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest('/api/v1/staff', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['staff'] });
      setModal(null);
      setErr(null);
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Error'),
  });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiRequest(`/api/v1/staff/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['staff'] });
      setModal(null);
      setErr(null);
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Error'),
  });

  const rows = data?.staff ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Staff</h1>
          <p className="text-sm text-zinc-500">Invite and manage team members.</p>
        </div>
        <Button type="button" onClick={() => setModal('create')}>
          Add staff
        </Button>
      </div>

      {err && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</div>}

      <Card>
        {isLoading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="border-b border-zinc-100">
                    <td className="py-2 font-medium">{s.fullName}</td>
                    <td className="py-2">{s.email}</td>
                    <td className="py-2">
                      <Badge>{s.role}</Badge>
                    </td>
                    <td className="py-2">{s.isActive ? 'Active' : 'Inactive'}</td>
                    <td className="py-2 text-right">
                      <Button variant="ghost" type="button" className="text-sm" onClick={() => setModal({ edit: s })}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modal === 'create' && (
        <StaffFormModal
          key="new"
          title="New staff"
          onClose={() => setModal(null)}
          onSave={(body) => create.mutate(body)}
          pending={create.isPending}
        />
      )}
      {modal !== null && modal !== 'create' && 'edit' in modal && (
        <StaffFormModal
          key={modal.edit.id}
          title="Edit staff"
          initial={modal.edit}
          onClose={() => setModal(null)}
          onSave={(body) => patch.mutate({ id: modal.edit.id, body })}
          pending={patch.isPending}
        />
      )}
    </div>
  );
}

function StaffFormModal({
  title,
  initial,
  onClose,
  onSave,
  pending,
}: {
  title: string;
  initial?: StaffRow;
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => void;
  pending: boolean;
}) {
  const [email, setEmail] = useState(initial?.email ?? '');
  const [fullName, setFullName] = useState(initial?.fullName ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<StaffRole>(initial?.role ?? 'CASHIER');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (initial) {
            const body: Record<string, unknown> = { email, fullName, role, isActive };
            if (password.length >= 8) body.password = password;
            onSave(body);
          } else {
            if (password.length < 8) {
              return;
            }
            onSave({ email, password, fullName, role });
          }
        }}
      >
        <div>
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <Label>Full name</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div>
          <Label>Role</Label>
          <select
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as StaffRole)}
          >
            <option value="CASHIER">CASHIER</option>
            <option value="MANAGER">MANAGER</option>
            <option value="OWNER">OWNER</option>
          </select>
        </div>
        <div>
          <Label>{initial ? 'New password (optional, min 8 chars)' : 'Password (min 8 chars)'}</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!initial} />
        </div>
        {initial && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? <Spinner className="h-4 w-4" /> : null}
          Save
        </Button>
      </form>
    </Modal>
  );
}
