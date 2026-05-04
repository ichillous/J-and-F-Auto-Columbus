import Image from 'next/image';
import * as React from 'react';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

type LogoVariant = 'full' | 'wordmark' | 'icon';
type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

const logoHeights: Record<LogoSize, number> = {
  sm: 28,
  md: 36,
  lg: 48,
  xl: 60,
};

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
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  variant?: LogoVariant;
  size?: LogoSize;
}

export function Logo({
  className,
  size = 'md',
  variant = 'full',
  ...props
}: LogoProps) {
  if (variant === 'icon') {
    return (
      <div
        className={cn(
          'rounded-full bg-white border border-white/10 p-1 shadow-[0_12px_30px_rgba(0,0,0,0.24)] inline-flex items-center justify-center',
          className,
        )}
        {...props}
      >
        <Image
          src="/jfauto-logo.png"
          alt="J&F Auto Group"
          width={32}
          height={32}
          className="object-contain"
        />
      </div>
    );
  }

  const height = logoHeights[size];
  const width = Math.round(height * 1.5);
  const shouldPrioritize = variant === 'full' && (size === 'lg' || size === 'xl');

  return (
    <div
      className={cn('inline-flex items-center bg-white rounded-md px-2 py-1.5 shadow-sm', className)}
      {...props}
    >
      <div className="flex flex-col items-center">
        <Image
          src="/jfauto-logo.png"
          alt="J&F Auto Group"
          width={width}
          height={height}
          className="object-contain"
          {...(shouldPrioritize ? { priority: true } : {})}
        />
        {variant === 'full' ? (
          <p className={subtitleVariants({ size })}>Curated Motor Collection</p>
        ) : null}
      </div>
    </div>
  );
}
