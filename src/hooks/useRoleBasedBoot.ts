import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dashboardAPI, appointmentsAPI, techniciansAPI, partRequestsAPI } from '../services/api';
import toast from 'react-hot-toast';

interface BootState {
  loading: boolean;
  error: string | null;
  ready: boolean;
}

/**
 * Role-based boot sequence hook
 * Prevents components from making unauthorized API calls by ensuring
 * only role-appropriate endpoints are called after auth is ready
 */
export const useRoleBasedBoot = () => {
  const { user, ready: authReady } = useAuth();
  const [bootState, setBootState] = useState<BootState>({
    loading: true,
    error: null,
    ready: false
  });

  useEffect(() => {
    if (!authReady) {
      return; // Wait for auth to be ready
    }

    if (!user) {
      // User not authenticated, boot complete
      setBootState({ loading: false, error: null, ready: true });
      return;
    }

    const performRoleBasedBoot = async () => {
      try {
        setBootState({ loading: true, error: null, ready: false });

        switch (user.role) {
          case 'technician':
            await performTechnicianBoot(user);
            break;
          case 'staff':
            await performStaffBoot(user);
            break;
          case 'admin':
            await performAdminBoot(user);
            break;
          case 'customer':
            await performCustomerBoot(user);
            break;
          default:
            console.warn(`Unknown role: ${user.role}`);
        }

        setBootState({ loading: false, error: null, ready: true });
      } catch (error) {
        console.error('Boot sequence failed:', error);
        const errorMessage = (error as any)?.response?.data?.message || 'Failed to initialize dashboard';
        setBootState({ loading: false, error: errorMessage, ready: false });

        // Show Vietnamese error message
        toast.error('Không thể khởi tạo dashboard. Vui lòng thử lại.');
      }
    };

    performRoleBasedBoot();
  }, [authReady, user]);

  return bootState;
};

/**
 * Technician boot sequence - only calls technician-allowed endpoints
 */
const performTechnicianBoot = async (user: any) => {
  console.log('🔧 Performing technician boot sequence...');

  const bootCalls = [
    // Technician dashboard stats
    dashboardAPI.getStats('technician'),

    // Work queue for assigned appointments
    appointmentsAPI.getWorkQueue({ technicianId: user._id }),

    // Technician profile
    techniciansAPI.getProfile()
  ];

  await Promise.all(bootCalls);
  console.log('✅ Technician boot sequence completed');
};

/**
 * Staff boot sequence - calls staff-allowed endpoints
 */
const performStaffBoot = async (user: any) => {
  console.log('👨‍💼 Performing staff boot sequence...');

  const bootCalls = [
    // Staff dashboard stats
    dashboardAPI.getStats('staff'),

    // Pending staff confirmations
    appointmentsAPI.getPendingStaffConfirmation({ limit: 20 }),

    // Available technicians for assignment
    appointmentsAPI.getAvailableTechnicians(
      user.serviceCenterId || 'default',
      new Date().toISOString().split('T')[0], // Today
      '08:00',
      60
    ),

    // Pending part requests for approval
    partRequestsAPI.getPendingApprovals({ limit: 10 })
  ];

  await Promise.all(bootCalls);
  console.log('✅ Staff boot sequence completed');
};

/**
 * Admin boot sequence - calls admin-allowed endpoints
 */
const performAdminBoot = async (user: any) => {
  console.log('👑 Performing admin boot sequence...');

  const bootCalls = [
    // Admin dashboard stats
    dashboardAPI.getStats('admin'),

    // All pending confirmations
    appointmentsAPI.getPendingStaffConfirmation({ limit: 50 }),

    // System-wide technician workload
    techniciansAPI.getWorkloadDistribution(),

    // All pending part requests
    partRequestsAPI.getPendingApprovals({ limit: 50 })
  ];

  await Promise.all(bootCalls);
  console.log('✅ Admin boot sequence completed');
};

/**
 * Customer boot sequence - calls customer-allowed endpoints
 */
const performCustomerBoot = async (user: any) => {
  console.log('🏠 Performing customer boot sequence...');

  const bootCalls = [
    // Customer dashboard stats
    dashboardAPI.getCustomerDashboard(),

    // Customer appointments
    appointmentsAPI.getCustomerAppointments({ limit: 10 }),

    // Customer stats
    appointmentsAPI.getCustomerStats()
  ];

  await Promise.all(bootCalls);
  console.log('✅ Customer boot sequence completed');
};