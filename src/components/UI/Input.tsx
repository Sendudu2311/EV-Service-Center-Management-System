import React from 'react';
import { cn } from '../../styles/theme';

type InputVariant = 'default' | 'error' | 'success';
type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: InputVariant;
  size?: InputSize;
  label?: string;
  helperText?: string;
  errorText?: string;
  icon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

/**
 * Input - Reusable input component with SPLASH theme support
 * Variants: default, error, success
 * Sizes: sm, md (default), lg
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = 'default',
      size = 'md',
      label,
      helperText,
      errorText,
      icon,
      endIcon,
      className,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'w-full px-4 py-2.5 rounded-lg border-2 bg-dark-300 text-text-primary placeholder-text-muted transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-lime-200 focus:border-transparent';

    const sizes = {
      sm: 'py-1.5 text-sm px-3',
      md: 'py-2.5 text-base px-4',
      lg: 'py-3 text-lg px-5',
    };

    const variants = {
      default: 'border-dark-200 hover:border-dark-100',
      error: 'border-red-600 focus:border-red-600 focus:ring-red-600',
      success: 'border-lime-200 focus:border-lime-200',
    };

    const containerClasses = cn(
      'w-full flex flex-col gap-2',
      icon ? 'relative' : '',
      endIcon ? 'relative' : ''
    );

    const inputContainerClasses = 'relative flex items-center';
    const iconClasses = 'absolute text-text-muted text-lg pointer-events-none';
    const inputClasses = cn(
      baseClasses,
      sizes[size],
      variants[variant],
      icon ? 'pl-10' : '',
      endIcon ? 'pr-10' : '',
      className
    );

    return (
      <div className={containerClasses}>
        {label && (
          <label className={cn('block text-sm font-semibold text-text-primary')}>
            {label}
          </label>
        )}

        <div className={inputContainerClasses}>
          {icon && <span className={cn(iconClasses, 'left-3')}>{icon}</span>}

          <input ref={ref} className={inputClasses} {...props} />

          {endIcon && <span className={cn(iconClasses, 'right-3')}>{endIcon}</span>}
        </div>

        {errorText && (
          <p className="text-xs text-red-400 mt-1">{errorText}</p>
        )}

        {helperText && !errorText && (
          <p className="text-xs text-text-muted mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: InputVariant;
  label?: string;
  helperText?: string;
  errorText?: string;
}

/**
 * Textarea - Reusable textarea component with SPLASH theme
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { variant = 'default', label, helperText, errorText, className, ...props },
    ref
  ) => {
    const baseClasses =
      'w-full px-4 py-3 rounded-lg border-2 bg-dark-300 text-text-primary placeholder-text-muted transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-lime-200 focus:border-transparent resize-none';

    const variants = {
      default: 'border-dark-200 hover:border-dark-100',
      error: 'border-red-600 focus:border-red-600 focus:ring-red-600',
      success: 'border-lime-200 focus:border-lime-200',
    };

    return (
      <div className="w-full flex flex-col gap-2">
        {label && (
          <label className="block text-sm font-semibold text-text-primary">
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          className={cn(baseClasses, variants[variant], className)}
          {...props}
        />

        {errorText && <p className="text-xs text-red-400 mt-1">{errorText}</p>}

        {helperText && !errorText && (
          <p className="text-xs text-text-muted mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  errorText?: string;
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
}

/**
 * Select - Reusable select component with SPLASH theme
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, helperText, errorText, options = [], className, children, ...props },
    ref
  ) => {
    const baseClasses =
      'w-full px-4 py-2.5 rounded-lg border-2 bg-dark-300 text-text-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-lime-200 appearance-none cursor-pointer border-dark-200 hover:border-dark-100 focus:border-transparent';

    return (
      <div className="w-full flex flex-col gap-2">
        {label && (
          <label className="block text-sm font-semibold text-text-primary">
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            className={cn(baseClasses, className)}
            {...props}
          >
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
            {children}
          </select>

          {/* Dropdown arrow */}
          <svg
            className="absolute right-3 top-3 w-4 h-4 text-text-muted pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>

        {errorText && <p className="text-xs text-red-400 mt-1">{errorText}</p>}

        {helperText && !errorText && (
          <p className="text-xs text-text-muted mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Input;
