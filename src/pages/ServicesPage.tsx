import React, { useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import ServicesList from '../components/Services/ServicesList';
import ServiceForm from '../components/Services/ServiceForm';

const ServicesPage: React.FC = () => {
  const { user } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loadingService, setLoadingService] = useState(false);

  const handleEditService = async (service: any) => {
    try {
      setLoadingService(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/services/${service._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Full service data:', result.data); // Debug log
        setSelectedService(result.data);
        setShowCreateForm(true);
      } else {
        console.error('Failed to fetch service details');
        // Fallback to using the service from list
        setSelectedService(service);
        setShowCreateForm(true);
      }
    } catch (error) {
      console.error('Error fetching service details:', error);
      // Fallback to using the service from list
      setSelectedService(service);
      setShowCreateForm(true);
    } finally {
      setLoadingService(false);
    }
  };

  const handleFormClose = () => {
    setShowCreateForm(false);
    setSelectedService(null);
    setRefreshTrigger(prev => prev + 1); // Trigger refresh
  };

  const canManageServices = user?.role === 'staff' || user?.role === 'admin';

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Quản lý dịch vụ</h1>
              <p className="mt-2 text-text-secondary">
                Quản lý và theo dõi các dịch vụ và tình trạng sẵn có
              </p>
            </div>
            {canManageServices && (
              <div className="mt-4 sm:mt-0">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm text-dark-900 bg-lime-500 hover:bg-lime-400 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-500"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Thêm dịch vụ
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Services List */}
        <ServicesList
          key={refreshTrigger}
          onEditService={canManageServices ? handleEditService : undefined}
        />

        {/* Create/Edit Service Modal */}
        {showCreateForm && (
          <ServiceForm
            service={selectedService}
            isOpen={showCreateForm}
            onClose={handleFormClose}
          />
        )}
      </div>
    </div>
  );
};

export default ServicesPage;
