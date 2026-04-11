import * as React from 'react';
import Image from 'next/image';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import logoImage from '@/public/assets/jfautologo-transparent.png';

const logoVariants = cva('relative flex items-center', {
  variants: {
    size: {
      sm: 'h-5 w-auto',
      md: 'h-6 w-auto',
      lg: 'h-7 w-auto',
      xl: 'h-8 w-auto',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export interface LogoProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>,
    VariantProps<typeof logoVariants> {
  variant?: 'full' | 'icon' | 'wordmark';
}

export function Logo({
  className,
  size,
  variant = 'full',
  ...props
}: LogoProps) {
  const heightMap = {
    sm: 20,
    md: 24,
    lg: 28,
    xl: 32,
  };

  const height = heightMap[size || 'md'];

  return (
    <div
      className={cn(logoVariants({ size }), variant === 'icon' && 'w-8 overflow-hidden', className)}
      {...props}
    >
      <Image
        src={logoImage}
        alt="J&F Auto"
        height={height}
        width={height * 3.3}
        priority
        className="h-auto w-auto object-contain"
      />
    </div>
  );
}
