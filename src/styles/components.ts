/**
 * SPLASH Component Classes
 * Reusable component styling patterns using theme tokens
 * Keep these patterns consistent across all component implementations
 */

// ============================================
// CARD COMPONENT CLASSES
// ============================================

export const Card = {
  /**
   * Card container - base elevated card with border and shadow
   */
  container: {
    default: 'bg-dark-300 border border-dark-200 rounded-xl shadow-lg transition-all duration-300',
    hover: 'hover:shadow-xl hover:border-lime-200',
    active: 'ring-2 ring-lime-200 ring-opacity-50',
  },

  /**
   * Card header section
   */
  header: {
    container: 'px-6 py-4 border-b border-dark-200',
    title: 'text-xl font-bold text-white',
    subtitle: 'text-sm text-text-muted mt-1',
  },

  /**
   * Card body/content section
   */
  body: {
    container: 'px-6 py-4',
    text: 'text-text-secondary',
  },

  /**
   * Card footer section
   */
  footer: {
    container: 'px-6 py-4 border-t border-dark-200 flex justify-end gap-2',
  },
};

// ============================================
// BUTTON COMPONENT CLASSES
// ============================================

export const Button = {
  base: 'font-semibold rounded-lg transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-lime-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',

  size: {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
  },

  variant: {
    primary: 'bg-lime-200 text-dark-900 hover:bg-lime-100 active:bg-lime-600 shadow-md hover:shadow-lg',
    secondary: 'bg-dark-300 text-lime-200 border border-lime-200 hover:bg-dark-100 active:bg-dark-200',
    outline: 'border-2 border-lime-200 text-lime-200 hover:bg-lime-200/10 active:bg-lime-200/20',
    ghost: 'text-text-primary border border-transparent hover:bg-dark-300 hover:border-dark-200 active:bg-dark-200',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-md hover:shadow-lg',
    success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 shadow-md hover:shadow-lg',
    warning: 'bg-yellow-600 text-white hover:bg-yellow-700 active:bg-yellow-800 shadow-md hover:shadow-lg',
    info: 'bg-dark-600 text-white hover:bg-dark-700 active:bg-dark-800 shadow-md hover:shadow-lg',
  },

  icon: {
    base: 'inline-flex items-center justify-center rounded-lg transition-all duration-200',
    size: {
      sm: 'w-8 h-8 text-base',
      md: 'w-10 h-10 text-lg',
      lg: 'w-12 h-12 text-xl',
    },
  },
};

// ============================================
// INPUT & FORM CLASSES
// ============================================

export const Input = {
  base: 'w-full px-4 py-2.5 rounded-lg border-2 bg-dark-300 text-text-primary placeholder-text-muted transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-lime-200 focus:border-transparent',

  state: {
    default: 'border-dark-200 hover:border-dark-100',
    focus: 'border-lime-200 ring-2 ring-lime-200 ring-opacity-50',
    error: 'border-red-600 focus:border-red-600 focus:ring-red-600',
    success: 'border-lime-200 focus:border-lime-200',
    disabled: 'opacity-50 cursor-not-allowed bg-dark-200',
  },

  label: 'block text-sm font-semibold text-text-primary mb-2',
  helperText: 'text-xs text-text-muted mt-1',
  errorText: 'text-xs text-red-400 mt-1',
  successText: 'text-xs text-lime-200 mt-1',
};

export const Textarea = {
  base: 'w-full px-4 py-3 rounded-lg border-2 bg-dark-300 text-text-primary placeholder-text-muted transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-lime-200 focus:border-transparent resize-none',
  state: {
    default: 'border-dark-200 hover:border-dark-100',
    focus: 'border-lime-200 ring-2 ring-lime-200 ring-opacity-50',
    error: 'border-red-600 focus:border-red-600',
    disabled: 'opacity-50 cursor-not-allowed bg-dark-200',
  },
};

export const Select = {
  base: 'w-full px-4 py-2.5 rounded-lg border-2 bg-dark-300 text-text-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-lime-200 appearance-none cursor-pointer',
  state: {
    default: 'border-dark-200 hover:border-dark-100',
    focus: 'border-lime-200 ring-2 ring-lime-200 ring-opacity-50',
    disabled: 'opacity-50 cursor-not-allowed bg-dark-200',
  },
};

export const Checkbox = {
  container: 'flex items-center gap-2 cursor-pointer',
  input: 'w-5 h-5 rounded-md border-2 border-dark-200 bg-dark-300 cursor-pointer accent-lime-200 transition-all duration-200 hover:border-lime-200 focus:ring-2 focus:ring-lime-200',
  label: 'text-text-primary cursor-pointer select-none',
};

export const Radio = {
  container: 'flex items-center gap-2 cursor-pointer',
  input: 'w-5 h-5 rounded-full border-2 border-dark-200 bg-dark-300 cursor-pointer accent-lime-200 transition-all duration-200 hover:border-lime-200',
  label: 'text-text-primary cursor-pointer select-none',
};

// ============================================
// BADGE & LABEL CLASSES
// ============================================

export const Badge = {
  base: 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200',

  variant: {
    success: 'bg-lime-200/10 text-lime-100 border border-lime-200',
    error: 'bg-red-600/10 text-red-300 border border-red-600',
    warning: 'bg-yellow-600/10 text-yellow-300 border border-yellow-600',
    info: 'bg-dark-600/10 text-blue-300 border border-blue-600',
    default: 'bg-dark-200 text-text-secondary border border-dark-100',
    primary: 'bg-lime-200/20 text-lime-200 border border-lime-200',
  },

  size: {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  },
};

export const StatusDot = {
  base: 'w-2.5 h-2.5 rounded-full',
  variant: {
    online: 'bg-lime-200 animate-pulse',
    offline: 'bg-dark-500',
    busy: 'bg-yellow-500 animate-pulse',
    pending: 'bg-dark-500 animate-pulse',
  },
};

// ============================================
// ALERT & NOTIFICATION CLASSES
// ============================================

export const Alert = {
  container: 'rounded-lg border-2 p-4 transition-all duration-200',

  variant: {
    success: 'bg-lime-200/10 border-lime-200 text-lime-100',
    error: 'bg-red-600/10 border-red-600 text-red-300',
    warning: 'bg-yellow-600/10 border-yellow-600 text-yellow-300',
    info: 'bg-dark-600/10 border-blue-600 text-blue-300',
  },

  icon: 'text-lg mr-3 flex-shrink-0',
  title: 'font-semibold text-base mb-1',
  content: 'text-sm',
  closeButton: 'ml-auto text-lg hover:opacity-75 transition-opacity cursor-pointer',
};

export const Toast = {
  container: 'fixed bottom-4 right-4 rounded-lg border-2 p-4 shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-300',
  variant: {
    success: 'bg-dark-300 border-lime-200 text-lime-100',
    error: 'bg-dark-300 border-red-600 text-red-300',
    warning: 'bg-dark-300 border-yellow-600 text-yellow-300',
    info: 'bg-dark-300 border-blue-600 text-blue-300',
  },
};

// ============================================
// MODAL & DIALOG CLASSES
// ============================================

export const Modal = {
  backdrop: 'fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity',
  container: 'fixed inset-0 flex items-center justify-center z-50',
  content: 'bg-dark-300 rounded-2xl border border-dark-200 shadow-2xl max-w-2xl w-full mx-4',
  header: 'px-6 py-4 border-b border-dark-200 flex justify-between items-center',
  headerTitle: 'text-xl font-bold text-white',
  closeButton: 'text-text-muted hover:text-white transition-colors cursor-pointer text-2xl',
  body: 'px-6 py-4 max-h-[60vh] overflow-y-auto',
  footer: 'px-6 py-4 border-t border-dark-200 flex justify-end gap-2',
};

// ============================================
// TABLE CLASSES
// ============================================

export const Table = {
  container: 'w-full border-collapse',
  header: 'bg-dark-200 border-b-2 border-dark-100',
  headerCell: 'px-4 py-3 text-left text-sm font-semibold text-text-primary',
  body: 'divide-y divide-dark-200',
  row: 'hover:bg-dark-300 transition-colors duration-200',
  rowActive: 'bg-dark-300 border-l-4 border-lime-200',
  cell: 'px-4 py-3 text-sm text-text-secondary',
  cellMuted: 'px-4 py-3 text-sm text-text-muted',
};

// ============================================
// AVATAR & IMAGE CLASSES
// ============================================

export const Avatar = {
  container: 'relative inline-flex items-center justify-center rounded-full font-semibold text-white transition-all duration-200',

  size: {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-2xl',
  },

  variant: {
    default: 'bg-lime-200/20 text-lime-200 border border-lime-200',
    primary: 'bg-lime-200 text-dark-900',
    dark: 'bg-dark-200 text-text-secondary border border-dark-100',
  },

  status: 'absolute bottom-0 right-0 rounded-full border-2 border-dark-300',
  statusSize: {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  },
};

// ============================================
// NAVIGATION CLASSES
// ============================================

export const Nav = {
  container: 'bg-dark-300 border-b border-dark-200 shadow-md',
  wrapper: 'max-w-7xl mx-auto px-4 flex items-center justify-between h-16',
  link: {
    default: 'text-text-secondary px-3 py-2 rounded-lg transition-all duration-200 hover:bg-dark-200 hover:text-lime-200',
    active: 'text-lime-200 bg-dark-200 border-l-4 border-lime-200',
  },
  dropdown: 'absolute top-full left-0 mt-2 bg-dark-300 border border-dark-200 rounded-lg shadow-lg z-40 overflow-hidden',
  dropdownItem: 'block w-full text-left px-4 py-2 text-text-secondary hover:bg-dark-200 hover:text-lime-200 transition-all duration-200',
};

// ============================================
// PAGINATION CLASSES
// ============================================

export const Pagination = {
  container: 'flex items-center justify-center gap-1',
  button: 'px-3 py-2 rounded-lg border border-dark-200 text-text-secondary transition-all duration-200 hover:border-lime-200 hover:text-lime-200',
  buttonActive: 'bg-lime-200 text-dark-900 border-lime-200 font-semibold',
  buttonDisabled: 'opacity-50 cursor-not-allowed',
};

// ============================================
// LOADING CLASSES
// ============================================

export const Loading = {
  spinner: 'inline-block w-4 h-4 border-2 border-lime-200 border-t-transparent rounded-full animate-spin',
  skeletonBar: 'bg-gradient-to-r from-dark-200 to-dark-300 animate-pulse rounded-lg',
  overlay: 'absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center rounded-lg',
};

// ============================================
// LAYOUT UTILITY CLASSES
// ============================================

export const Layout = {
  container: 'max-w-7xl mx-auto px-4',
  grid: {
    '2col': 'grid grid-cols-1 md:grid-cols-2 gap-6',
    '3col': 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
    '4col': 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6',
  },
  flex: {
    center: 'flex items-center justify-center',
    between: 'flex items-center justify-between',
    start: 'flex items-start justify-start gap-4',
  },
};

// ============================================
// BACKGROUND & EFFECTS
// ============================================

export const Effects = {
  gradient: {
    limeGlow: 'bg-gradient-to-r from-lime-200/20 to-lime-200/0',
    darkGlow: 'bg-gradient-to-b from-dark-300 to-dark-900',
    neonEdge: 'border-l-4 border-lime-200',
  },
  glass: 'bg-white/10 backdrop-blur-md border border-white/20',
  glow: 'shadow-lg shadow-lime-200/20',
  'glow-strong': 'shadow-2xl shadow-lime-200/40',
};

// ============================================
// TEXT UTILITY CLASSES
// ============================================

export const Text = {
  primary: 'text-text-primary',
  secondary: 'text-text-secondary',
  tertiary: 'text-text-tertiary',
  muted: 'text-text-muted',
  lime: 'text-lime-200',
  error: 'text-red-300',
  success: 'text-lime-100',
  warning: 'text-yellow-300',
  info: 'text-blue-300',
  truncate: 'truncate',
  nowrap: 'whitespace-nowrap',
  uppercase: 'uppercase text-xs font-semibold tracking-wide',
};

export default {
  Card,
  Button,
  Input,
  Textarea,
  Select,
  Checkbox,
  Radio,
  Badge,
  StatusDot,
  Alert,
  Toast,
  Modal,
  Table,
  Avatar,
  Nav,
  Pagination,
  Loading,
  Layout,
  Effects,
  Text,
};
