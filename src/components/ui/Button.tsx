import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonStyles = cva(
  'button inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-ivory disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'button--primary',
        secondary: 'button--secondary',
        outline: 'button--outline',
        text: 'button--text',
      },
      size: {
        sm: 'button--sm',
        md: 'button--md',
        lg: 'button--lg',
        icon: 'button--icon',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonStyles> {}

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return <button className={cn(buttonStyles({ variant, size }), className)} type={type} {...props} />;
}

export interface ButtonLinkProps extends LinkProps, VariantProps<typeof buttonStyles> {
  className?: string;
  children: ReactNode;
}

export function ButtonLink({ className, variant, size, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={cn(buttonStyles({ variant, size }), className)} {...props}>
      {children}
    </Link>
  );
}
