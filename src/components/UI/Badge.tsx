import React from 'react';
import { cn } from '../../styles/theme';

type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'default' | 'primary';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Badge - Reusable badge component for status/tags with SPLASH theme
 * Variants: success, error, warning, info, default, primary
 * Sizes: sm, md, lg
 */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'success', size = 'md', icon, className, children, ...props }, ref) => {
    const baseClasses =
      'inline-flex items-center gap-1.5 rounded-full font-semibold transition-all duration-200';

    const sizes = {
      sm: 'px-2 py-1 text-xs',
      md: 'px-3 py-1.5 text-sm',
      lg: 'px-4 py-2 text-base',
    };

    const variants = {
      success: 'bg-lime-200/10 text-lime-100 border border-lime-200',
      error: 'bg-red-600/10 text-red-300 border border-red-600',
      warning: 'bg-yellow-600/10 text-yellow-300 border border-yellow-600',
      info: 'bg-dark-600/10 text-blue-300 border border-blue-600',
      default: 'bg-dark-200 text-text-secondary border border-dark-100',
      primary: 'bg-lime-200/20 text-lime-200 border border-lime-200',
    };

    return (
      <span
        ref={ref}
        className={cn(baseClasses, sizes[size], variants[variant], className)}
        {...props}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span>{children}</span>
      </span>
    );
  }
);

Badge.displayName = 'Badge';

interface StatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: 'online' | 'offline' | 'busy' | 'pending';
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

/**
 * StatusDot - Small dot indicator for status
 */
export const StatusDot = React.forwardRef<HTMLSpanElement, StatusDotProps>(
  ({ status = 'online', size = 'md', className, ...props }, ref) => {
    const sizeClasses = {
      xs: 'w-1.5 h-1.5',
      sm: 'w-2 h-2',
      md: 'w-2.5 h-2.5',
      lg: 'w-3 h-3',
    };

    const statuses = {
      online: 'bg-lime-200 animate-pulse',
      offline: 'bg-dark-500',
      busy: 'bg-yellow-500 animate-pulse',
      pending: 'bg-dark-500 animate-pulse',
    };

    return (
      <span
        ref={ref}
        className={cn('rounded-full', sizeClasses[size], statuses[status], className)}
        {...props}
      />
    );
  }
);

StatusDot.displayName = 'StatusDot';

interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  onRemove?: () => void;
  color?: 'lime' | 'dark' | 'neutral';
  children: React.ReactNode;
}

/**
 * Pill - Closeable badge/pill component
 */
export const Pill = React.forwardRef<HTMLSpanElement, PillProps>(
  ({ onRemove, color = 'lime', className, children, ...props }, ref) => {
    const colors = {
      lime: 'bg-lime-200/20 text-lime-200 border border-lime-200',
      dark: 'bg-dark-200 text-text-secondary border border-dark-100',
      neutral: 'bg-dark-300 text-text-tertiary border border-dark-200',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm text-text-muted',
          colors[color],
          className
        )}
        {...props}
      >
        <span>{children}</span>
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-lg leading-none hover:opacity-75 transition-opacity"
            aria-label="Remove"
          >
            ×
          </button>
        )}
      </span>
    );
  }
);

Pill.displayName = 'Pill';

export default Badge;
