import type { InputHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20',
        className,
      )}
      {...props}
    />
  );
}
