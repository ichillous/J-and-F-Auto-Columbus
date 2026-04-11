import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const logoVariants = cva('inline-flex items-center leading-none', {
  variants: {
    size: {
      sm: 'text-lg',
      md: 'text-xl',
      lg: 'text-2xl',
      xl: 'text-[2rem]',
    },
    variant: {
      full: '',
      wordmark: '',
      icon: '',
    },
  },
  defaultVariants: {
    size: 'md',
    variant: 'full',
  },
});

const subtitleVariants = cva('mt-1 uppercase tracking-[0.34em] text-brand-dim', {
  variants: {
    size: {
      sm: 'text-[0.42rem]',
      md: 'text-[0.46rem]',
      lg: 'text-[0.5rem]',
      xl: 'text-[0.56rem]',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export interface LogoProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>,
    VariantProps<typeof logoVariants> {}

export function Logo({
  className,
  size,
  variant = 'full',
  ...props
}: LogoProps) {
  if (variant === 'icon') {
    return (
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white shadow-[0_12px_30px_rgba(0,0,0,0.24)]',
          className,
        )}
        {...props}
      >
        <span className="font-display text-sm tracking-[0.18em]">JF</span>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)} {...props}>
      <span className={cn(logoVariants({ size, variant }), 'font-display uppercase tracking-[0.08em] text-white')}>
        J&amp;F Auto
      </span>
      {variant === 'full' ? (
        <span className={subtitleVariants({ size })}>Curated Motor Collection</span>
      ) : null}
    </div>
  );
}
