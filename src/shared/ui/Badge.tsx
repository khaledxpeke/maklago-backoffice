import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700',
        className,
      )}
      {...props}
    />
  );
}
