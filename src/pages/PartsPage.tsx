import React, { useState, useEffect } from 'react';
import { 
  CogIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  PlusIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useSocket, useCustomEvent } from '../contexts/SocketContext';
import PartsList from '../components/Parts/PartsList';
import PartForm from '../components/Parts/PartForm';
import PartBulkImport from '../components/Parts/PartBulkImport';
import PartsAnalyticsDashboard from '../components/Parts/PartsAnalyticsDashboard';
import { partRequestsAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  PartRequest,
  partRequestStatusTranslations,
  urgencyTranslations,
} from '../types/parts';
import { formatVND } from '../utils/vietnamese';

type PartsTab = 'management' | 'requests' | 'analytics';

const PartsPage: React.FC = () => {
  const { user } = useAuth();
  useSocket(); // Initialize socket connection for real-time events
  const [activeTab, setActiveTab] = useState<PartsTab>('management');
  const [showPartForm, setShowPartForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Part Requests state
  const [partRequests, setPartRequests] = useState<PartRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchPartRequests();
    }
  }, [activeTab, statusFilter, urgencyFilter]);

  // Listen for real-time updates
  useCustomEvent('partsRequested', (data) => {
    toast(`New part request: ${data.requestNumber}`, {
      icon: 'ℹ️',
    });
    if (activeTab === 'requests') {
      fetchPartRequests();
    }
  });

  useCustomEvent('partsApproved', (data) => {
    toast.success(`Part approved: ${data.requestNumber}`);
    if (activeTab === 'requests') {
      fetchPartRequests();
    }
  });

  const fetchPartRequests = async () => {
    try {
      setRequestsLoading(true);
      const filters: any = {};
      if (statusFilter) filters.status = statusFilter;
      if (urgencyFilter) filters.urgency = urgencyFilter;

      const response = await partRequestsAPI.getAll(filters);
      setPartRequests((response.data.data || response.data) as PartRequest[]);
    } catch (error) {
      console.error('Error fetching part requests:', error);
      toast.error('Failed to load part requests data');
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string, decision: string, notes?: string, alternatives?: any[]) => {
    try {
      await partRequestsAPI.approve(requestId, {
        decision,
        staffNotes: notes || '',
        alternativeParts: alternatives || []
      });
      toast.success('Part request approved successfully');
      fetchPartRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast.error(error.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleEditPart = async (part: any) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/parts/${part._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Full part data:', result.data); // Debug log
        setSelectedPart(result.data);
        setShowPartForm(true);
      } else {
        console.error('Failed to fetch part details');
        // Fallback to using the part from list
        setSelectedPart(part);
        setShowPartForm(true);
      }
    } catch (error) {
      console.error('Error fetching part details:', error);
      // Fallback to using the part from list
      setSelectedPart(part);
      setShowPartForm(true);
    }
  };

  const handleCloseForm = () => {
    setShowPartForm(false);
    setSelectedPart(null);
    setRefreshTrigger(prev => prev + 1); // Trigger refresh
  };

  const handleImportComplete = () => {
    setRefreshTrigger(prev => prev + 1); // Trigger refresh
  };

  const canManageParts = user?.role === 'staff' || user?.role === 'admin';

  const getTabTitle = () => {
    switch (activeTab) {
      case 'management':
        return 'Parts Management';
      case 'requests':
        return 'Part Requests';
      case 'analytics':
        return 'Analytics & Reports';
      default:
        return 'Parts Management';
    }
  };

  const getTabDescription = () => {
    switch (activeTab) {
      case 'management':
        return 'Manage parts inventory, stock levels, and compatibility';
      case 'requests':
        return 'View and approve part requests from technicians';
      case 'analytics':
        return 'Inventory statistics and low stock alerts';
      default:
        return 'Manage parts and inventory';
    }
  };

  const getRequestStatusBadge = (status: string) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'partially_approved': 'bg-dark-100 text-blue-800',
      'rejected': 'bg-red-100 text-red-800',
      'fulfilled': 'bg-emerald-100 text-emerald-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs text-text-muted ${
        colors[status as keyof typeof colors] || 'bg-dark-100 text-gray-800'
      }`}>
        {partRequestStatusTranslations[status] || status}
      </span>
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    const colors = {
      'low': 'bg-dark-100 text-gray-800',
      'normal': 'bg-dark-100 text-blue-800',
      'high': 'bg-orange-100 text-orange-800',
      'urgent': 'bg-red-100 text-red-800',
      'critical': 'bg-red-200 text-red-900',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs text-text-muted ${
        colors[urgency as keyof typeof colors] || 'bg-dark-100 text-gray-800'
      }`}>
        {urgencyTranslations[urgency] || urgency}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Parts Management</h1>
          <p className="text-text-secondary mt-2">Manage EV parts inventory and requests</p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-dark-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('management')}
                className={`py-2 px-1 border-b-2 text-text-muted text-sm ${
                  activeTab === 'management'
                    ? 'border-blue-500 text-lime-200'
                    : 'border-transparent text-text-muted hover:text-text-secondary hover:border-dark-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <CogIcon className="h-4 w-4" />
                  <span>Parts Management</span>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('requests')}
                className={`py-2 px-1 border-b-2 text-text-muted text-sm hidden ${
                  activeTab === 'requests'
                    ? 'border-blue-500 text-lime-200'
                    : 'border-transparent text-text-muted hover:text-text-secondary hover:border-dark-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <ClockIcon className="h-4 w-4" />
                  <span>Part Requests</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-2 px-1 border-b-2 text-text-muted text-sm ${
                  activeTab === 'analytics'
                    ? 'border-blue-500 text-lime-200'
                    : 'border-transparent text-text-muted hover:text-text-secondary hover:border-dark-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <ChartBarIcon className="h-4 w-4" />
                  <span>Analytics & Reports</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">{getTabTitle()}</h2>
              <p className="text-text-secondary mt-1">{getTabDescription()}</p>
            </div>
            
            {/* Action Buttons - Only show for management tab and if user can manage */}
            {activeTab === 'management' && canManageParts && (
              <div className="mt-4 sm:mt-0 flex space-x-3">
                <button
                  onClick={() => setShowBulkImport(true)}
                  className="inline-flex items-center px-4 py-2 border border-dark-300 rounded-md shadow-sm text-sm text-text-muted text-text-secondary bg-dark-300 hover:bg-dark-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-400"
                >
                  <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                  Import Excel
                </button>
                <button
                  onClick={() => setShowPartForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm text-dark-900 bg-lime-500 hover:bg-lime-400 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-400"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Part
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'management' && (
            <PartsManagementTab 
              key={refreshTrigger}
              onEditPart={canManageParts ? handleEditPart : undefined}
              canManage={canManageParts}
            />
          )}
          
          {activeTab === 'requests' && (
            <PartRequestsTab 
              requests={partRequests}
              loading={requestsLoading}
              onApprove={handleApproveRequest}
              canManage={canManageParts}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              urgencyFilter={urgencyFilter}
              setUrgencyFilter={setUrgencyFilter}
              getRequestStatusBadge={getRequestStatusBadge}
              getUrgencyBadge={getUrgencyBadge}
            />
          )}
          
          {activeTab === 'analytics' && (
            <AnalyticsTab 
              key={refreshTrigger}
              onEditPart={canManageParts ? handleEditPart : undefined}
              canManage={canManageParts}
            />
          )}
        </div>

        {/* Part Form Modal */}
        <PartForm
          part={selectedPart}
          isOpen={showPartForm}
          onClose={handleCloseForm}
        />

        {/* Bulk Import Modal */}
        <PartBulkImport
          isOpen={showBulkImport}
          onClose={() => setShowBulkImport(false)}
          onImportComplete={handleImportComplete}
        />
      </div>
    </div>
  );
};

// Parts Management Tab Component (Full CRUD management)
const PartsManagementTab: React.FC<{
  onEditPart?: (part: any) => void;
  canManage: boolean;
}> = ({ onEditPart, canManage }) => {
  return (
    <div>
      <PartsList 
        onEditPart={onEditPart}
        viewMode="management"
        showFilters={true}
        showActions={canManage}
      />
    </div>
  );
};

// Part Requests Tab Component
const PartRequestsTab: React.FC<{
  requests: PartRequest[];
  loading: boolean;
  onApprove: (requestId: string, decision: string, notes?: string, alternatives?: any[]) => void;
  canManage: boolean;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  urgencyFilter: string;
  setUrgencyFilter: (value: string) => void;
  getRequestStatusBadge: (status: string) => JSX.Element;
  getUrgencyBadge: (urgency: string) => JSX.Element;
}> = ({ 
  requests, 
  loading, 
  onApprove, 
  canManage,
  statusFilter,
  setStatusFilter,
  urgencyFilter,
  setUrgencyFilter,
  getRequestStatusBadge,
  getUrgencyBadge
}) => {
  return (
    <div className="bg-dark-300 shadow-sm rounded-lg border border-dark-200">
      {/* Filters */}
      <div className="p-4 border-b border-dark-200">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm text-text-muted text-text-secondary mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full bg-dark-300 text-white border border-dark-300 rounded-md shadow-sm focus:border-lime-400 focus:ring-lime-400 focus:ring-2 sm:text-sm"
            >
              <option value="">All statuses</option>
              {Object.entries(partRequestStatusTranslations).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-muted text-text-secondary mb-1">Priority</label>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="block w-full bg-dark-300 text-white border border-dark-300 rounded-md shadow-sm focus:border-lime-400 focus:ring-lime-400 focus:ring-2 sm:text-sm"
            >
              <option value="">All priorities</option>
              {Object.entries(urgencyTranslations).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setStatusFilter('');
                setUrgencyFilter('');
              }}
              className="w-full bg-dark-200 hover:bg-dark-300 text-text-secondary px-4 py-2 rounded-md text-sm"
            >
              Clear filters
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <ClockIcon className="mx-auto h-12 w-12 text-text-muted" />
            <h3 className="mt-2 text-sm font-semibold text-white">No part requests</h3>
            <p className="mt-1 text-sm text-text-muted">
              No part requests found.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request._id}
                className="border border-dark-200 rounded-lg p-4 hover:bg-dark-900 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-white">#{request.requestNumber}</h4>
                    <p className="text-sm text-text-muted">
                      Requested by: {request.requestedBy.firstName} {request.requestedBy.lastName}
                    </p>
                    <p className="text-sm text-text-muted">
                      Estimated cost: {formatVND(request.estimatedCost)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getRequestStatusBadge(request.status)}
                    {getUrgencyBadge(request.urgency)}
                  </div>
                </div>

                <div className="mb-4">
                  <h5 className="text-sm text-text-muted text-white mb-2">Requested parts:</h5>
                  <div className="space-y-2">
                    {request.requestedParts.map((part, index) => (
                      <div key={index} className="flex justify-between items-center bg-dark-900 p-2 rounded">
                        <div>
                          <span className="text-text-muted">{part.partInfo.name}</span>
                          <span className="text-text-muted ml-2">({part.partInfo.partNumber})</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">Quantity: {part.quantity}</div>
                          {part.shortfall > 0 && (
                            <div className="text-xs text-white bg-red-600 px-2 py-0.5 rounded">Short: {part.shortfall}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {request.status === 'pending' && canManage && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onApprove(request._id, 'approve_all')}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm text-text-muted rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Approve All
                    </button>
                    <button
                      onClick={() => onApprove(request._id, 'approve_partial')}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-semibold rounded-md text-black bg-lime-200 hover:bg-lime-100 transition-all duration-200 transform hover:scale-105"
                    >
                      Partial Approve
                    </button>
                    <button
                      onClick={() => onApprove(request._id, 'reject_insufficient_stock')}
                      className="inline-flex items-center px-3 py-2 border border-dark-300 text-sm text-text-muted rounded-md text-text-secondary bg-dark-300 hover:bg-dark-900"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Analytics Tab Component (Statistics and Low Stock)
const AnalyticsTab: React.FC<{
  onEditPart?: (part: any) => void;
  canManage: boolean;
}> = ({ onEditPart, canManage }) => {
  return (
    <PartsAnalyticsDashboard onEditPart={canManage ? onEditPart : undefined} />
  );
};

export default PartsPage;
