import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRoleBasedBoot } from '../../hooks/useRoleBasedBoot';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: ('customer' | 'staff' | 'technician' | 'admin')[];
  fallback?: React.ReactNode;
  requireBootReady?: boolean;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  fallback = null,
  requireBootReady = false
}) => {
  const { user, ready: authReady } = useAuth();
  const bootState = useRoleBasedBoot();

  // Wait for auth to be ready
  if (!authReady) {
    return null;
  }

  // If no user, deny access
  if (!user) {
    return <>{fallback}</>;
  }

  // Check if user role is allowed
  if (!allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  // If boot readiness is required, wait for it
  if (requireBootReady && !bootState.ready) {
    return null;
  }

  return <>{children}</>;
};

interface FeatureGuardProps {
  children: React.ReactNode;
  feature: string;
  userRole: string;
  fallback?: React.ReactNode;
}

// Feature-specific permission mapping
const FEATURE_PERMISSIONS: Record<string, string[]> = {
  // Dashboard features
  'dashboard.admin': ['admin'],
  'dashboard.staff': ['staff', 'admin'],
  'dashboard.technician': ['technician', 'admin'],
  'dashboard.customer': ['customer', 'admin'],

  // Appointment management
  'appointments.view_all': ['staff', 'admin'],
  'appointments.confirm': ['staff', 'admin'],
  'appointments.assign_technician': ['staff', 'admin'],
  'appointments.work_queue': ['technician', 'staff', 'admin'],
  'appointments.customer_own': ['customer'],

  // Parts management
  'parts.request': ['technician'],
  'parts.approve': ['staff', 'admin'],
  'parts.inventory': ['staff', 'admin'],

  // Service reception
  'service_reception.create': ['technician'],
  'service_reception.approve': ['staff', 'admin'],

  // Invoice management
  'invoices.generate': ['staff', 'admin'],
  'invoices.view_all': ['staff', 'admin'],
  'invoices.customer_own': ['customer'],

  // User management
  'users.manage': ['admin'],
  'users.view': ['staff', 'admin'],

  // System settings
  'settings.system': ['admin'],
  'settings.service_center': ['admin'],

  // Reports
  'reports.view': ['staff', 'admin'],
  'reports.export': ['admin']
};

export const FeatureGuard: React.FC<FeatureGuardProps> = ({
  children,
  feature,
  userRole,
  fallback = null
}) => {
  const allowedRoles = FEATURE_PERMISSIONS[feature];

  if (!allowedRoles || !allowedRoles.includes(userRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Hook for checking permissions
export const usePermissions = () => {
  const { user } = useAuth();

  const hasPermission = (feature: string): boolean => {
    if (!user) return false;

    const allowedRoles = FEATURE_PERMISSIONS[feature];
    return allowedRoles ? allowedRoles.includes(user.role) : false;
  };

  const hasAnyPermission = (features: string[]): boolean => {
    return features.some(feature => hasPermission(feature));
  };

  const hasAllPermissions = (features: string[]): boolean => {
    return features.every(feature => hasPermission(feature));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    userRole: user?.role
  };
};

// Component for conditional rendering based on permissions
interface ConditionalRenderProps {
  children: React.ReactNode;
  when: boolean;
  fallback?: React.ReactNode;
}

export const ConditionalRender: React.FC<ConditionalRenderProps> = ({
  children,
  when,
  fallback = null
}) => {
  return when ? <>{children}</> : <>{fallback}</>;
};