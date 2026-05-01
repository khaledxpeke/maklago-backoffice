import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/shared/lib/cn';

export function Modal({
  title,
  children,
  onClose,
  className,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <button type="button" className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
      <div className="relative z-10 flex min-h-full items-start justify-center p-4 py-8 sm:items-center sm:py-10">
        <div
          className={cn(
            'flex max-h-[min(85vh,100dvh-4rem)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl sm:my-auto',
            className,
          )}
          role="document"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-6 py-4">
            <h2 id="modal-title" className="text-lg font-semibold text-zinc-900">
              {title}
            </h2>
            <Button variant="ghost" type="button" className="!p-1" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
