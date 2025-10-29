import React from 'react';
import { cn } from '../../styles/theme';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'outlined' | 'filled' | 'glass';
  hover?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Card - Reusable card component with SPLASH theme support
 * Variants: elevated (default), outlined, filled, glass
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'elevated', hover = true, className, children, ...props }, ref) => {
    const variantClasses = {
      elevated: 'bg-dark-300 border border-dark-200 rounded-xl shadow-lg',
      outlined: 'bg-transparent border-2 border-dark-200 rounded-xl',
      filled: 'bg-dark-200 rounded-xl',
      glass: 'bg-dark-300/10 backdrop-blur-md border border-white/20 rounded-xl',
    };

    const hoverClasses = hover
      ? 'hover:shadow-lg hover:border-lime-200 transition-all duration-300'
      : 'transition-all duration-300';

    return (
      <div
        ref={ref}
        className={cn(variantClasses[variant], hoverClasses, className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * CardHeader - Header section of a card with title, subtitle, and action
 */
export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, subtitle, action, className, children, ...props }, ref) => {
    if (children) {
      return (
        <div
          ref={ref}
          className={cn('px-6 py-4 border-b border-dark-200', className)}
          {...(props as React.HTMLAttributes<HTMLDivElement>)}
        >
          {children}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn('px-6 py-4 border-b border-dark-200 flex justify-between items-start', className)}
        {...(props as React.HTMLAttributes<HTMLDivElement>)}
      >
        <div>
          {title && <h3 className="text-xl font-bold text-white">{title}</h3>}
          {subtitle && <p className="text-sm text-text-muted mt-1">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * CardBody - Body/content section of a card
 */
export const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('px-6 py-4 text-text-secondary', className)} {...props}>
      {children}
    </div>
  )
);

CardBody.displayName = 'CardBody';

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * CardFooter - Footer section of a card
 */
export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-6 py-4 border-t border-dark-200 flex justify-end gap-2', className)}
      {...props}
    >
      {children}
    </div>
  )
);

CardFooter.displayName = 'CardFooter';

export default Card;
