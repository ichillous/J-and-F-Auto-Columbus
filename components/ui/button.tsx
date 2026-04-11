import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold uppercase tracking-[0.18em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'border border-white/10 bg-white/6 text-white hover:border-white/20 hover:bg-white/10',
        accent:
          'border border-accent/30 bg-accent text-accent-foreground shadow-glow hover:-translate-y-0.5 hover:border-accent/60 hover:bg-[#95ebff] hover:shadow-glow-strong',
        destructive:
          'border border-destructive/25 bg-destructive/10 text-destructive hover:border-destructive/40 hover:bg-destructive/16',
        outline:
          'border border-white/10 bg-transparent text-brand-silver hover:border-accent/35 hover:bg-accent/8 hover:text-white',
        secondary:
          'border border-white/8 bg-white/[0.03] text-brand-silver hover:border-white/16 hover:bg-white/[0.06] hover:text-white',
        ghost:
          'border border-transparent bg-transparent text-brand-silver hover:bg-white/[0.05] hover:text-white',
        link:
          'rounded-none border-0 bg-transparent px-0 text-accent hover:text-white',
      },
      size: {
        sm: 'h-9 px-4 text-[0.64rem]',
        default: 'h-11 px-5 text-[0.68rem]',
        lg: 'h-12 px-6 text-[0.72rem]',
        xl: 'h-14 px-8 text-[0.76rem]',
        icon: 'h-11 w-11 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
