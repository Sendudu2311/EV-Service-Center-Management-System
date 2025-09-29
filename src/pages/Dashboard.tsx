import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { RoleGuard } from '../components/Common/RoleGuard';
import EnhancedCustomerDashboard from '../components/Dashboard/EnhancedCustomerDashboard';
import StaffDashboard from '../components/Dashboard/StaffDashboard';
import EnhancedTechnicianDashboard from '../components/Dashboard/EnhancedTechnicianDashboard';
import AdminDashboard from '../components/Dashboard/AdminDashboard';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Customer Dashboard */}
      <RoleGuard
        allowedRoles={['customer']}
        requireBootReady={true}
        fallback={null}
      >
        <EnhancedCustomerDashboard />
      </RoleGuard>

      {/* Staff Dashboard */}
      <RoleGuard
        allowedRoles={['staff']}
        requireBootReady={true}
        fallback={null}
      >
        <StaffDashboard />
      </RoleGuard>

      {/* Technician Dashboard */}
      <RoleGuard
        allowedRoles={['technician']}
        requireBootReady={true}
        fallback={null}
      >
        <EnhancedTechnicianDashboard />
      </RoleGuard>

      {/* Admin Dashboard */}
      <RoleGuard
        allowedRoles={['admin']}
        requireBootReady={true}
        fallback={null}
      >
        <AdminDashboard />
      </RoleGuard>

      {/* Loading state when no role matches or boot not ready */}
      {!user && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;