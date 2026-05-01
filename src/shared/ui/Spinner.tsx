import { cn } from '@/shared/lib/cn';

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-[var(--color-accent)]',
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );
}
