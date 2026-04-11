import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.22em]',
  {
    variants: {
      variant: {
        default: 'border-white/12 bg-white/[0.06] text-white',
        accent: 'border-accent/30 bg-accent/14 text-accent',
        success: 'border-emerald-400/25 bg-emerald-400/14 text-emerald-300',
        warning: 'border-amber-400/20 bg-amber-400/12 text-amber-200',
        secondary: 'border-white/10 bg-white/[0.03] text-brand-silver',
        destructive: 'border-destructive/25 bg-destructive/12 text-destructive',
        outline: 'border-white/14 bg-transparent text-brand-silver',
      },
      size: {
        sm: 'px-2.5 py-1 text-[0.58rem]',
        default: 'px-3 py-1 text-[0.62rem]',
        lg: 'px-4 py-1.5 text-[0.66rem]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
