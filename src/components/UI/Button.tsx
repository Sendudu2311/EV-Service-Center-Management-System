import React from 'react';
import { cn } from '../../styles/theme';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'warning'
  | 'info';

type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Button - Reusable button component with SPLASH theme support
 * Variants: primary, secondary, outline, ghost, danger, success, warning, info
 * Sizes: xs, sm, md (default), lg, xl
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      icon,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'font-semibold rounded-lg transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';

    const sizes = {
      xs: 'px-2 py-1 text-xs',
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-base',
      lg: 'px-6 py-3 text-lg',
      xl: 'px-8 py-4 text-xl',
    };

    const variants = {
      primary:
        'bg-lime-200 text-dark-900 hover:bg-lime-100 active:bg-lime-600 shadow-md hover:shadow-lg',
      secondary:
        'bg-dark-300 text-lime-200 border border-lime-200 hover:bg-dark-100 active:bg-dark-200',
      outline: 'border-2 border-lime-200 text-lime-200 hover:bg-lime-200/10 active:bg-lime-200/20',
      ghost:
        'text-text-primary border border-transparent hover:bg-dark-300 hover:border-dark-200 active:bg-dark-200',
      danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-md hover:shadow-lg',
      success:
        'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 shadow-md hover:shadow-lg',
      warning:
        'bg-yellow-600 text-white hover:bg-yellow-700 active:bg-yellow-800 shadow-md hover:shadow-lg',
      info: 'bg-dark-600 text-white hover:bg-dark-700 active:bg-dark-800 shadow-md hover:shadow-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(baseClasses, sizes[size], variants[variant], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="w-4 h-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {!isLoading && icon && <span>{icon}</span>}
        <span>{children}</span>
      </button>
    );
  }
);

Button.displayName = 'Button';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  variant?: ButtonVariant;
  children: React.ReactNode;
}

/**
 * IconButton - Square button for icons only
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ size = 'md', variant = 'ghost', className, children, ...props }, ref) => {
    const sizeClasses = {
      sm: 'w-8 h-8 text-base',
      md: 'w-10 h-10 text-lg',
      lg: 'w-12 h-12 text-xl',
    };

    const variants = {
      primary: 'bg-lime-200 text-dark-900 hover:bg-lime-100 rounded-lg',
      secondary: 'bg-dark-300 text-lime-200 border border-lime-200 hover:bg-dark-100 rounded-lg',
      outline: 'border-2 border-lime-200 text-lime-200 hover:bg-lime-200/10 rounded-lg',
      ghost: 'text-text-primary hover:bg-dark-300 rounded-lg',
      danger: 'bg-red-600 text-white hover:bg-red-700 rounded-lg',
      success: 'bg-green-600 text-white hover:bg-green-700 rounded-lg',
      warning: 'bg-yellow-600 text-white hover:bg-yellow-700 rounded-lg',
      info: 'bg-dark-600 text-white hover:bg-dark-700 rounded-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
          sizeClasses[size],
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

export default Button;
