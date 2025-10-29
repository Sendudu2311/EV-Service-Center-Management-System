/**
 * SPLASH Theme - Dark Mode with Neon Lime Accent
 * Inspiration: SPLASH EV Chargers Sharing App (Behance)
 * 
 * Primary Colors:
 * - Neon Lime: #CCFF00 (Primary accent for all interactive elements)
 * - Dark: #0F1419 - #2A3038 (Background hierarchy)
 * - Text: #FFFFFF - #A0A0A0 (Text hierarchy)
 */

export const splashTheme = {
  // ============================================
  // PRIMARY COLORS (Neon Lime Accent System)
  // ============================================
  colors: {
    // Neon Lime - Main Brand Color
    lime: {
      50: '#F0FF66',      // Very light (backgrounds)
      100: '#E6FF33',     // Light (hover states)
      200: '#CCFF00',     // Main (primary actions, icons, accents)
      600: '#B3E600',     // Medium (active/pressed states)
      700: '#99CC00',     // Dark (disabled/alt states)
    },

    // Dark Mode Backgrounds
    dark: {
      50: '#4A5058',      // Lightest dark (used rarely)
      100: '#3A4048',     // Light borders, hover states
      200: '#2A3038',     // Borders, subtle backgrounds
      300: '#1A1F2E',     // Card backgrounds, elevated surfaces
      main: '#1A1F2E',    // Same as 300 (card bg)
      900: '#0F1419',     // Main background (darkest)
    },

    // Text Colors
    text: {
      primary: '#FFFFFF',   // Headings, main text
      secondary: '#F5F5F5', // Body text, secondary content
      tertiary: '#E0E0E0',  // Tertiary text, labels
      muted: '#A0A0A0',     // Disabled text, hints, secondary labels
    },

    // Semantic Colors (with neon lime accent for success)
    semantic: {
      success: {
        main: '#CCFF00',
        light: '#E6FF33',
        bg: 'rgba(204, 255, 0, 0.1)',
        text: '#E6FF33',
        border: '#CCFF00',
      },
      error: {
        main: '#FF4444',
        light: '#FF6666',
        bg: 'rgba(255, 68, 68, 0.1)',
        text: '#FF8888',
        border: '#FF4444',
      },
      warning: {
        main: '#FFB84D',
        light: '#FFD700',
        bg: 'rgba(255, 183, 77, 0.1)',
        text: '#FFD700',
        border: '#FFB84D',
      },
      info: {
        main: '#4BA3FF',
        light: '#66B3FF',
        bg: 'rgba(75, 163, 255, 0.1)',
        text: '#66B3FF',
        border: '#4BA3FF',
      },
    },

    // Special Effects
    effects: {
      glow: '#CCFF00',
      glowBlur: 'rgba(204, 255, 0, 0.2)',
      glowShadow: '0 0 20px rgba(204, 255, 0, 0.15)',
      darkShadow: 'rgba(0, 0, 0, 0.3)',
    },
  },

  // ============================================
  // SPACING SYSTEM
  // ============================================
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
  },

  // ============================================
  // TYPOGRAPHY
  // ============================================
  typography: {
    // Headings
    h1: 'text-4xl font-bold text-white',
    h2: 'text-3xl font-bold text-white',
    h3: 'text-2xl font-bold text-white',
    h4: 'text-xl font-semibold text-white',
    
    // Body
    body: 'text-base font-normal text-gray-100',
    bodySmall: 'text-sm font-normal text-gray-300',
    
    // Small
    small: 'text-xs font-normal text-gray-400',
  },

  // ============================================
  // BORDER RADIUS
  // ============================================
  borderRadius: {
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    full: '9999px',  // Full circle
  },

  // ============================================
  // SHADOWS
  // ============================================
  shadows: {
    none: 'none',
    sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px rgba(0, 0, 0, 0.15)',
    lg: '0 10px 25px rgba(0, 0, 0, 0.2)',
    xl: '0 20px 40px rgba(0, 0, 0, 0.25)',
    '2xl': '0 25px 50px rgba(0, 0, 0, 0.3)',
    glow: '0 0 20px rgba(204, 255, 0, 0.15)',
    'glow-strong': '0 0 30px rgba(204, 255, 0, 0.25)',
  },

  // ============================================
  // TRANSITIONS & ANIMATIONS
  // ============================================
  transitions: {
    fast: 'transition-all duration-150',
    normal: 'transition-all duration-300',
    slow: 'transition-all duration-500',
  },
};

// ============================================
// HELPER FUNCTIONS FOR CLASS NAMES
// ============================================

/**
 * Combine class names safely
 */
export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Get card classes based on variant
 */
export const getCardClasses = (
  variant: 'elevated' | 'outlined' | 'filled' | 'glass' = 'elevated',
  state: 'default' | 'hover' | 'active' = 'default'
): string => {
  const baseClasses = 'rounded-xl transition-all duration-300';
  
  const variants = {
    elevated: 'bg-dark-300 border border-dark-200 shadow-lg',
    outlined: 'bg-transparent border-2 border-dark-200',
    filled: 'bg-dark-200',
    glass: 'bg-white/10 backdrop-blur-md border border-white/20',
  };

  const states = {
    default: '',
    hover: 'hover:border-lime-200 hover:shadow-glow hover:shadow-lime/10',
    active: 'border-lime-200 ring-2 ring-lime-200 ring-opacity-50',
  };

  return cn(baseClasses, variants[variant], states[state]);
};

/**
 * Get button classes based on variant and size
 */
export const getButtonClasses = (
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' = 'primary',
  size: 'sm' | 'md' | 'lg' = 'md',
  disabled: boolean = false
): string => {
  const baseClasses = 'font-semibold rounded-lg transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-lime-200';
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const variants = {
    primary: 'bg-lime-200 text-dark-900 hover:bg-lime-100 active:bg-lime-600',
    secondary: 'bg-dark-300 text-lime-200 border border-lime-200 hover:bg-dark-100',
    outline: 'border-2 border-lime-200 text-lime-200 hover:bg-lime-200/10',
    ghost: 'text-text-primary hover:bg-dark-300 border border-transparent hover:border-dark-200',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
  };

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return cn(baseClasses, sizes[size], variants[variant], disabledClasses);
};

/**
 * Get badge classes based on semantic color
 */
export const getBadgeClasses = (
  type: 'success' | 'error' | 'warning' | 'info' = 'success'
): string => {
  const baseClasses = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs text-text-muted';
  
  const types = {
    success: 'bg-lime-200/10 text-lime-100 border border-lime-200',
    error: 'bg-red-600/10 text-red-300 border border-red-600',
    warning: 'bg-yellow-600/10 text-yellow-300 border border-yellow-600',
    info: 'bg-dark-600/10 text-blue-300 border border-blue-600',
  };

  return cn(baseClasses, types[type]);
};

/**
 * Get status dot animation classes
 */
export const getStatusDotClasses = (status: 'online' | 'offline' | 'busy' = 'online'): string => {
  const baseClasses = 'w-2.5 h-2.5 rounded-full animate-pulse';
  
  const statuses = {
    online: 'bg-lime-200',
    offline: 'bg-dark-500',
    busy: 'bg-yellow-500',
  };

  return cn(baseClasses, statuses[status]);
};

/**
 * Get input classes
 */
export const getInputClasses = (
  variant: 'default' | 'error' | 'success' = 'default',
  disabled: boolean = false
): string => {
  const baseClasses = 'w-full px-4 py-2.5 rounded-lg border-2 bg-dark-300 text-text-primary placeholder-text-muted transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-lime-200';
  
  const variants = {
    default: 'border-dark-200 focus:border-lime-200',
    error: 'border-red-600 focus:border-red-600 focus:ring-red-600',
    success: 'border-lime-200 focus:border-lime-200',
  };

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed bg-dark-200' : '';

  return cn(baseClasses, variants[variant], disabledClasses);
};

export default splashTheme;
