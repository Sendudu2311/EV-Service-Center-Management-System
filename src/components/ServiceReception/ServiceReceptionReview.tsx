import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircleIcon,
  XMarkIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { formatVND } from "../../utils/vietnamese";
import { partConflictsAPI } from "../../services/api";
import ExternalPartsManager from "./ExternalPartsManager";
import WorkflowHistoryViewer from "./WorkflowHistoryViewer";

interface ServiceReception {
  _id: string;
  receptionNumber: string;
  appointmentId: {
    _id: string;
    appointmentNumber: string;
  };
  customerId: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  vehicleId: {
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    vin: string;
  };
  vehicleCondition: {
    exterior: {
      condition: string;
      damages: Array<{
        location: string;
        type: string;
        severity: string;
        description: string;
      }>;
      notes: string;
    };
    interior: {
      condition: string;
      cleanliness: string;
      damages: Array<{
        location: string;
        type: string;
        description: string;
      }>;
      notes: string;
    };
    battery: {
      level: number;
      health: string;
      chargingStatus: string;
      notes: string;
    };
    mileage: {
      current: number;
    };
  };
  customerItems: Array<{
    item: string;
    location: string;
    value?: number;
    notes: string;
  }>;
  recommendedServices: Array<{
    serviceId:
      | {
          _id: string;
          name: string;
          category: string;
          estimatedDuration: number;
        }
      | string;
    serviceName: string;
    category: string;
    quantity: number;
    reason: string;
    estimatedDuration?: number;
    estimatedCost?: number;
  }>;
  requestedParts: Array<{
    partId:
      | {
          _id: string;
          name: string;
          partNumber: string;
          pricing: {
            retail: number;
          };
        }
      | string;
    partName: string;
    partNumber?: string;
    quantity: number;
    reason: string;
    estimatedCost?: number;
  }>;
  specialInstructions: {
    fromCustomer: string;
    fromStaff?: string;
    safetyPrecautions: string[];
    warningNotes: string[];
  };
  estimatedServiceTime: number;
  status: string;
  receivedBy: {
    firstName: string;
    lastName: string;
  };
  receivedAt: string;
  evChecklistItems?: Array<{
    id: string;
    label: string;
    category: "battery" | "charging" | "motor" | "safety" | "general";
    checked: boolean;
    status?: "good" | "warning" | "critical";
    notes?: string;
  }>;
  workflowHistory?: Array<{
    action: string;
    performedBy: any;
    timestamp: string | Date;
    changes?: any;
    notes?: string;
  }>;
}

interface ServiceReceptionReviewProps {
  receptions: ServiceReception[];
  onReview: (
    receptionId: string,
    decision: "approve" | "reject",
    notes: string,
    externalParts?: any[],
    extendedCompletionDate?: string,
    modifications?: {
      servicesChanges: any;
      partsChanges: any;
      modificationReason: string;
      modifiedServices: any[];
      modifiedParts: any[];
    } | null
  ) => Promise<void>;
  loading?: boolean;
  onReceptionUpdated?: () => void;
  currentUser?: any; // Current logged-in user for addedBy field
}

const ServiceReceptionReview: React.FC<ServiceReceptionReviewProps> = ({
  receptions,
  onReview,
  loading = false,
  onReceptionUpdated,
  currentUser,
}) => {
  const [selectedReception, setSelectedReception] =
    useState<ServiceReception | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [externalParts, setExternalParts] = useState<any[]>([]);
  const [extendedCompletionDate, setExtendedCompletionDate] = useState<string>("");

  // Staff editing states
  const [isEditingServices, setIsEditingServices] = useState(false);
  const [isEditingParts, setIsEditingParts] = useState(false);
  const [editedServices, setEditedServices] = useState<any[]>([]);
  const [editedParts, setEditedParts] = useState<any[]>([]);
  const [modificationReason, setModificationReason] = useState("");

  // Add service/part picker states
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [showPartPicker, setShowPartPicker] = useState(false);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [availableParts, setAvailableParts] = useState<any[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Part stock information
  const [partStockInfo, setPartStockInfo] = useState<Map<string, { currentStock: number; loading: boolean }>>(new Map());

  // Service details (to access commonParts)
  const [serviceDetails, setServiceDetails] = useState<Map<string, any>>(new Map());

  // Fetch stock info for parts
  const fetchPartStockInfo = async (partIds: string[]) => {
    if (partIds.length === 0) return;

    try {
      // Mark as loading
      const loadingMap = new Map(partStockInfo);
      partIds.forEach(id => {
        loadingMap.set(id, { currentStock: 0, loading: true });
      });
      setPartStockInfo(loadingMap);

      // Fetch all parts data
      const response = await fetch('/api/parts?limit=1000', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const stockMap = new Map();  // ✅ FIX: Create new Map instead of copying old state

        // Update stock info for each part
        partIds.forEach(partId => {
          const partData = data.data?.find((p: any) => p._id === partId);
          if (partData) {
            stockMap.set(partId, {
              currentStock: partData.inventory?.currentStock || 0,
              loading: false
            });
          } else {
            stockMap.set(partId, { currentStock: 0, loading: false });
          }
        });

        setPartStockInfo(stockMap);
      }
    } catch (error) {
      console.error('Error fetching part stock info:', error);
      // Mark as not loading even on error
      const errorMap = new Map();  // ✅ FIX: Create new Map instead of copying old state
      partIds.forEach(id => {
        errorMap.set(id, { currentStock: 0, loading: false });
      });
      setPartStockInfo(errorMap);
    }
  };

  // Fetch service details including common parts
  const fetchServiceDetails = async (serviceIds: string[]) => {
    if (serviceIds.length === 0) return;

    try {
      // Fetch services to get commonParts info
      const response = await fetch('/api/services?limit=1000', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const services = data.data || [];

        // Store service details
        const detailsMap = new Map(serviceDetails);
        const partIdsFromServices: string[] = [];

        serviceIds.forEach(serviceId => {
          const service = services.find((s: any) => s._id === serviceId);
          if (service) {
            detailsMap.set(serviceId, service);

            // Collect part IDs from commonParts
            if (service.commonParts) {
              service.commonParts.forEach((cp: any) => {
                if (cp.partId) {
                  partIdsFromServices.push(cp.partId);
                }
              });
            }
          }
        });

        setServiceDetails(detailsMap);

        // Fetch stock info for these parts
        if (partIdsFromServices.length > 0) {
          fetchPartStockInfo(partIdsFromServices);
        }
      }
    } catch (error) {
      console.error('Error fetching service details:', error);
    }
  };

  // Helper: Initialize editing state when modal opens
  const handleOpenReviewModal = (reception: ServiceReception) => {
    console.log('\n🔍 [Frontend] handleOpenReviewModal - Reception data received:');
    console.log('   Reception ID:', reception._id);
    console.log('   Requested Parts Count:', reception.requestedParts?.length || 0);

    if (reception.requestedParts && reception.requestedParts.length > 0) {
      reception.requestedParts.forEach((part, index) => {
        console.log(`\n   Part ${index + 1}:`);
        console.log('      partName:', part.partName);
        console.log('      partId type:', typeof part.partId);
        console.log('      partId:', part.partId);

        if (typeof part.partId === 'object' && part.partId !== null) {
          console.log('      partId._id:', (part.partId as any)._id);
          console.log('      partId.name:', (part.partId as any).name);
          console.log('      partId.partNumber:', (part.partId as any).partNumber);
          console.log('      partId.pricing:', (part.partId as any).pricing);
          console.log('      partId.inventory:', (part.partId as any).inventory);
          console.log('      partId.inventory?.currentStock:', (part.partId as any).inventory?.currentStock);
        }

        console.log('      isAvailable:', part.isAvailable);
        console.log('      availableQuantity:', part.availableQuantity);
        console.log('      quantity:', part.quantity);
      });
    }

    setSelectedReception(reception);
    setEditedServices([...(reception.recommendedServices || [])]);
    setEditedParts([...(reception.requestedParts || [])]);
    setReviewNotes("");
    setModificationReason("");
    setIsEditingServices(false);
    setIsEditingParts(false);

    // Fetch stock info for all parts in this reception
    const partIds = (reception.requestedParts || [])
      .map(p => typeof p.partId === 'object' ? p.partId._id : p.partId)
      .filter(Boolean);

    console.log('   Part IDs to fetch:', partIds);

    if (partIds.length > 0) {
      fetchPartStockInfo(partIds);
    }

    // Fetch service details to get commonParts info
    const serviceIds = (reception.recommendedServices || [])
      .map(s => typeof s.serviceId === 'object' ? s.serviceId._id : s.serviceId)
      .filter(Boolean);

    if (serviceIds.length > 0) {
      fetchServiceDetails(serviceIds);
    }
  };

  // Helper: Detect if services were modified
  const getServicesChanges = () => {
    if (!selectedReception) return null;

    const original = selectedReception.recommendedServices || [];
    const edited = editedServices;

    const added = edited.filter(e => !original.find(o =>
      (typeof o.serviceId === 'object' ? o.serviceId._id : o.serviceId) ===
      (typeof e.serviceId === 'object' ? e.serviceId._id : e.serviceId)
    ));

    const removed = original.filter(o => !edited.find(e =>
      (typeof o.serviceId === 'object' ? o.serviceId._id : o.serviceId) ===
      (typeof e.serviceId === 'object' ? e.serviceId._id : e.serviceId)
    ));

    const modified = edited.filter(e => {
      const orig = original.find(o =>
        (typeof o.serviceId === 'object' ? o.serviceId._id : o.serviceId) ===
        (typeof e.serviceId === 'object' ? e.serviceId._id : e.serviceId)
      );
      return orig && (orig.quantity !== e.quantity);
    }).map(e => {
      const orig = original.find(o =>
        (typeof o.serviceId === 'object' ? o.serviceId._id : o.serviceId) ===
        (typeof e.serviceId === 'object' ? e.serviceId._id : e.serviceId)
      );
      return { before: orig, after: e };
    });

    const hasChanges = added.length > 0 || removed.length > 0 || modified.length > 0;
    return hasChanges ? { added, removed, modified } : null;
  };

  // Helper: Detect if parts were modified
  const getPartsChanges = () => {
    if (!selectedReception) return null;

    const original = selectedReception.requestedParts || [];
    const edited = editedParts;

    const added = edited.filter(e => !original.find(o =>
      (typeof o.partId === 'object' ? o.partId._id : o.partId) ===
      (typeof e.partId === 'object' ? e.partId._id : e.partId)
    ));

    const removed = original.filter(o => !edited.find(e =>
      (typeof o.partId === 'object' ? o.partId._id : o.partId) ===
      (typeof e.partId === 'object' ? e.partId._id : e.partId)
    ));

    const modified = edited.filter(e => {
      const orig = original.find(o =>
        (typeof o.partId === 'object' ? o.partId._id : o.partId) ===
        (typeof e.partId === 'object' ? e.partId._id : e.partId)
      );
      return orig && (orig.quantity !== e.quantity);
    }).map(e => {
      const orig = original.find(o =>
        (typeof o.partId === 'object' ? o.partId._id : o.partId) ===
        (typeof e.partId === 'object' ? e.partId._id : e.partId)
      );
      return { before: orig, after: e };
    });

    const hasChanges = added.length > 0 || removed.length > 0 || modified.length > 0;
    return hasChanges ? { added, removed, modified } : null;
  };

  // Check if any modifications exist
  const hasAnyModifications = () => {
    return getServicesChanges() !== null || getPartsChanges() !== null;
  };

  // Helper functions for editing actions
  const handleRemoveService = (index: number) => {
    setEditedServices(editedServices.filter((_, i) => i !== index));
  };

  const handleUpdateServiceQuantity = (index: number, newQuantity: number) => {
    const updated = [...editedServices];
    updated[index] = { ...updated[index], quantity: Math.max(1, newQuantity) };
    setEditedServices(updated);
  };

  const handleRemovePart = (index: number) => {
    setEditedParts(editedParts.filter((_, i) => i !== index));
  };

  const handleUpdatePartQuantity = (index: number, newQuantity: number) => {
    const updated = [...editedParts];
    updated[index] = { ...updated[index], quantity: Math.max(1, newQuantity) };
    setEditedParts(updated);
  };

  // Helper to get item status for color coding
  const getServiceStatus = (service: any) => {
    if (!selectedReception) return 'unchanged';
    const original = selectedReception.recommendedServices || [];
    const serviceId = typeof service.serviceId === 'object' ? service.serviceId._id : service.serviceId;

    const inOriginal = original.find(o =>
      (typeof o.serviceId === 'object' ? o.serviceId._id : o.serviceId) === serviceId
    );

    if (!inOriginal) return 'added';
    if (inOriginal.quantity !== service.quantity) return 'modified';
    return 'unchanged';
  };

  const getPartStatus = (part: any) => {
    if (!selectedReception) return 'unchanged';
    const original = selectedReception.requestedParts || [];
    const partId = typeof part.partId === 'object' ? part.partId._id : part.partId;

    const inOriginal = original.find(o =>
      (typeof o.partId === 'object' ? o.partId._id : o.partId) === partId
    );

    if (!inOriginal) return 'added';
    if (inOriginal.quantity !== part.quantity) return 'modified';
    return 'unchanged';
  };

  // Helper: Get stock info for a part
  const getPartStockInfo = (partId: string) => {
    const info = partStockInfo.get(partId);
    return info || { currentStock: 0, loading: false };
  };

  // Helper: Get common parts for a service
  const getServiceCommonParts = (serviceId: string) => {
    const service = serviceDetails.get(serviceId);
    return service?.commonParts || [];
  };

  // Helper: Check if there are any parts with stock issues
  const hasStockIssues = () => {
    if (!selectedReception) return false;

    // ✅ FIX: Use isAvailable and availableQuantity from reception data
    // These fields are already set by backend and are more reliable than populate
    const partsIssues = editedParts.some(part => {
      // Use data already in the reception (set by backend when creating reception)
      const isOutOfStock = part.isAvailable === false;
      const isLowStock = part.isAvailable === true &&
                        (part.availableQuantity || 0) < part.quantity;

      console.log(`🔍 [hasStockIssues] Checking part: ${part.partName}`);
      console.log(`   isAvailable: ${part.isAvailable}, availableQuantity: ${part.availableQuantity}, requested: ${part.quantity}`);
      console.log(`   → isOutOfStock: ${isOutOfStock}, isLowStock: ${isLowStock}`);

      return isOutOfStock || isLowStock;
    });

    // Check service common parts - still use stockInfo from API for these
    const servicePartsIssues = editedServices.some(service => {
      const serviceId = typeof service.serviceId === 'object' ? service.serviceId._id : service.serviceId;
      const commonParts = getServiceCommonParts(serviceId);

      return commonParts.some((cp: any) => {
        const stockInfo = getPartStockInfo(cp.partId);
        const requiredQty = (cp.quantity || 1) * service.quantity;
        const isOutOfStock = !stockInfo.loading && stockInfo.currentStock === 0;
        const isLowStock = !stockInfo.loading && stockInfo.currentStock > 0 && stockInfo.currentStock < requiredQty;

        if ((isOutOfStock || isLowStock) && !cp.isOptional) {
          console.log(`🔍 [hasStockIssues] Service common part issue: ${cp.partId}`);
          console.log(`   currentStock: ${stockInfo.currentStock}, required: ${requiredQty}, optional: ${cp.isOptional}`);
        }

        return (isOutOfStock || isLowStock) && !cp.isOptional; // Only block if part is not optional
      });
    });

    const hasIssues = partsIssues || servicePartsIssues;
    console.log(`📊 [hasStockIssues] Final result: ${hasIssues} (partsIssues: ${partsIssues}, servicePartsIssues: ${servicePartsIssues})`);

    return hasIssues;
  };

  // Fetch services catalog
  const fetchServicesCatalog = async () => {
    try {
      setLoadingCatalog(true);
      const response = await fetch('/api/services', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        const allServices = data.data || [];

        // Filter out services already in the reception
        const existingServiceIds = editedServices.map(s =>
          typeof s.serviceId === 'string' ? s.serviceId : s.serviceId._id
        );
        const filtered = allServices.filter((service: any) =>
          !existingServiceIds.includes(service._id)
        );

        setAvailableServices(filtered);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Không thể tải danh sách dịch vụ');
    } finally {
      setLoadingCatalog(false);
    }
  };

  // Fetch parts catalog
  const fetchPartsCatalog = async () => {
    try {
      setLoadingCatalog(true);
      const response = await fetch('/api/parts', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        const allParts = data.data || [];

        // Filter out parts already in the reception
        const existingPartIds = editedParts.map(p =>
          typeof p.partId === 'string' ? p.partId : p.partId._id
        );
        const filtered = allParts.filter((part: any) =>
          !existingPartIds.includes(part._id)
        );

        setAvailableParts(filtered);
      }
    } catch (error) {
      console.error('Error fetching parts:', error);
      toast.error('Không thể tải danh sách phụ tùng');
    } finally {
      setLoadingCatalog(false);
    }
  };

  // Add service to edited list
  const handleAddService = (service: any) => {
    if (!currentUser?._id) {
      toast.error('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      return;
    }

    const newService = {
      serviceId: service._id,
      serviceName: service.name,
      category: service.category,
      quantity: 1,
      reason: '',
      estimatedCost: service.basePrice,
      estimatedDuration: service.estimatedDuration,
      addedBy: currentUser._id, // Required field - must be valid ObjectId
    };
    setEditedServices([...editedServices, newService]);
    setShowServicePicker(false);
    toast.success(`Đã thêm dịch vụ: ${service.name}`);
  };

  // Add part to edited list
  const handleAddPart = (part: any) => {
    if (!currentUser?._id) {
      toast.error('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      return;
    }

    const newPart = {
      partId: part._id,
      partName: part.name,
      partNumber: part.partNumber,
      quantity: 1,
      reason: '',
      isApproved: true,
      isAvailable: (part.inventory?.currentStock || 0) > 0,
      availableQuantity: part.inventory?.currentStock || 0,
      customerApprovalRequired: false,
      estimatedCost: part.pricing?.retail || 0,
      addedBy: currentUser._id, // Required field - must be valid ObjectId
    };
    setEditedParts([...editedParts, newPart]);
    setShowPartPicker(false);
    toast.success(`Đã thêm phụ tùng: ${part.name}`);
  };

  const handleReviewSubmit = async (decision: "approve" | "reject") => {
    if (!selectedReception) return;

    try {
      setIsSubmitting(true);

      // Validate modification reason if there are changes
      if (hasAnyModifications() && !modificationReason.trim()) {
        toast.error("Vui lòng nhập lý do thay đổi services/parts");
        setIsSubmitting(false);
        return;
      }

      // Prepare modification data
      const modificationsData = hasAnyModifications() ? {
        servicesChanges: getServicesChanges(),
        partsChanges: getPartsChanges(),
        modificationReason: modificationReason.trim(),
        modifiedServices: editedServices,
        modifiedParts: editedParts
      } : null;

      // REMOVED: Part conflict checking logic
      // New approach: Staff approves receptions sequentially (first-come-first-served)
      // When staff approves a reception, parts stock is deducted immediately
      // Subsequent receptions will naturally see reduced stock and receive warnings if insufficient

      await onReview(
        selectedReception._id,
        decision,
        reviewNotes,
        externalParts,
        extendedCompletionDate,
        modificationsData
      );

      toast.success(
        decision === "approve"
          ? "Đã duyệt phiếu tiếp nhận"
          : "Đã từ chối phiếu tiếp nhận"
      );

      setSelectedReception(null);
      setReviewNotes("");
      setExternalParts([]);
      setExtendedCompletionDate("");
      if (onReceptionUpdated) {
        onReceptionUpdated();
      }
    } catch (error: any) {
      console.error("Error submitting review:", error);

      // Show specific error message from API if available
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Không thể submit đánh giá";

      toast.error(errorMessage, {
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (receptions.length === 0) {
    return (
      <div className="text-center py-12 bg-dark-900 rounded-lg">
        <DocumentTextIcon className="mx-auto h-12 w-12 text-text-muted mb-4" />
        <h3 className="text-lg text-text-muted text-white mb-2">
          Không có phiếu tiếp nhận nào cần duyệt
        </h3>
        <p className="text-text-muted">
          Tất cả phiếu tiếp nhận đã được xử lý hoặc chưa có phiếu nào được tạo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Reception List */}
      <div className="grid gap-6">
        {receptions.map((reception) => (
          <div
            key={reception._id}
            className="bg-dark-300 border border-dark-200 rounded-lg shadow-sm hover:shadow-md transition-all"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Phiếu #{reception.receptionNumber}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      Lịch hẹn #{reception.appointmentId.appointmentNumber}
                    </p>
                  </div>
                  {/* REMOVED: Conflict badge - no longer using part conflict system */}
                </div>
                {/* REMOVED: Conflict warning - approve directly without conflict checking */}
                <button
                  onClick={() => handleOpenReviewModal(reception)}
                  className="text-lime-600 hover:text-lime-700 text-sm text-text-muted"
                >
                  Xem chi tiết & duyệt
                </button>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h4 className="text-text-muted text-text-secondary">
                    Khách hàng
                  </h4>
                  <p className="text-white">
                    {reception.customerId.firstName}{" "}
                    {reception.customerId.lastName}
                  </p>
                  <p className="text-text-secondary">
                    {reception.customerId.phone}
                  </p>
                </div>
                <div>
                  <h4 className="text-text-muted text-text-secondary">Xe</h4>
                  <p className="text-white">
                    {reception.vehicleId.year} {reception.vehicleId.make}{" "}
                    {reception.vehicleId.model}
                  </p>
                  <p className="text-text-secondary">
                    {reception.vehicleId.licensePlate}
                  </p>
                </div>
                <div>
                  <h4 className="text-text-muted text-text-secondary">
                    Người tiếp nhận
                  </h4>
                  <p className="text-white">
                    {reception.receivedBy.firstName}{" "}
                    {reception.receivedBy.lastName}
                  </p>
                  <p className="text-text-secondary">
                    {new Date(reception.receivedAt).toLocaleString("vi-VN")}
                  </p>
                </div>
              </div>

              {/* Services Summary */}
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-text-muted text-text-secondary mb-2">
                  Dịch vụ đề xuất
                </h4>
                <div className="flex flex-wrap gap-2">
                  {reception.recommendedServices &&
                  reception.recommendedServices.length > 0 ? (
                    reception.recommendedServices.map((service, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs text-text-muted bg-dark-200 text-lime-600"
                      >
                        {service.serviceName}
                        {service.quantity > 1 && ` (${service.quantity})`}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-text-muted">
                      Không có dịch vụ đề xuất
                    </span>
                  )}
                </div>
                {reception.requestedParts &&
                  reception.requestedParts.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-text-muted text-text-secondary text-sm">
                          Phụ tùng yêu cầu
                        </h4>
                        {/* REMOVED: Conflict badge - no longer showing conflict warnings */}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {reception.requestedParts.map((part, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs text-text-muted bg-purple-100 text-purple-800"
                          >
                            {part.partName} (x{part.quantity})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                <p className="text-sm text-text-secondary mt-2">
                  Thời gian ước tính: {reception.estimatedServiceTime} phút
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Review Modal */}
      {selectedReception && (
        <div className="fixed inset-0 bg-dark-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center py-8">
          <div className="relative mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-dark-300 my-auto max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Duyệt Phiếu Tiếp Nhận #{selectedReception.receptionNumber}
                </h2>
                <p className="text-sm text-text-secondary">
                  Lịch hẹn #{selectedReception.appointmentId.appointmentNumber}{" "}
                  -{selectedReception.customerId.firstName}{" "}
                  {selectedReception.customerId.lastName}
                </p>
              </div>
              <button
                onClick={() => setSelectedReception(null)}
                className="text-text-muted hover:text-text-secondary"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Vehicle Information & EV Checklist */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Thông tin xe
                  </h3>

                  {/* Vehicle Basic Info */}
                  <div className="bg-dark-900 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-text-secondary">Xe:</span>{" "}
                        <span className="text-white">
                          {selectedReception.vehicleId.year}{" "}
                          {selectedReception.vehicleId.make}{" "}
                          {selectedReception.vehicleId.model}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-secondary">Biển số:</span>{" "}
                        <span className="text-white">
                          {selectedReception.vehicleId.licensePlate}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-secondary">VIN:</span>{" "}
                        <span className="text-white">
                          {selectedReception.vehicleId.vin}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-secondary">Số km:</span>{" "}
                        <span className="text-white">
                          {selectedReception.vehicleCondition?.mileage?.current?.toLocaleString() ||
                            "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* EV Checklist Section */}
                  {selectedReception.evChecklistItems &&
                    selectedReception.evChecklistItems.length > 0 && (
                      <div className="bg-dark-300 border border-dark-200 rounded-lg p-4 mb-4">
                        <h4 className="text-text-muted text-gray-800 mb-3">
                          EV Checklist
                        </h4>
                        <div className="space-y-3">
                          {[
                            "battery",
                            "charging",
                            "motor",
                            "safety",
                            "general",
                          ].map((category) => {
                            const categoryItems =
                              selectedReception.evChecklistItems?.filter(
                                (item) =>
                                  item.category === category && item.checked
                              ) || [];
                            if (categoryItems.length === 0) return null;

                            const categoryLabels: Record<string, string> = {
                              battery: "🔋 Hệ thống Pin",
                              charging: "⚡ Hệ thống Sạc",
                              motor: "🔧 Động cơ",
                              safety: "🛡️ An toàn Cao thế",
                              general: "🚗 Kiểm tra Chung",
                            };

                            return (
                              <div
                                key={category}
                                className="border-l-4 border-blue-500 pl-3"
                              >
                                <h5 className="text-text-muted text-sm text-text-secondary mb-2">
                                  {categoryLabels[category]}
                                </h5>
                                <div className="space-y-2">
                                  {categoryItems.map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-start space-x-2 text-sm"
                                    >
                                      <CheckCircleIcon
                                        className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                                          item.status === "critical"
                                            ? "text-red-600"
                                            : item.status === "warning"
                                            ? "text-yellow-500"
                                            : "text-green-500"
                                        }`}
                                      />
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <span className="text-white">
                                            {item.label}
                                          </span>
                                          {item.status && (
                                            <span
                                              className={`text-xs px-2 py-0.5 rounded ${
                                                item.status === "critical"
                                                  ? "bg-dark-300 text-red-600"
                                                  : item.status === "warning"
                                                  ? "bg-dark-300 text-yellow-600"
                                                  : "bg-dark-300 text-green-600"
                                              }`}
                                            >
                                              {item.status === "critical"
                                                ? "Nghiêm trọng"
                                                : item.status === "warning"
                                                ? "Cảnh báo"
                                                : "Tốt"}
                                            </span>
                                          )}
                                        </div>
                                        {item.notes && (
                                          <p className="text-xs text-text-secondary mt-1 italic">
                                            {item.notes}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Summary */}
                        <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-2 text-center">
                          <div>
                            <div className="text-lg font-bold text-green-600">
                              {selectedReception.evChecklistItems?.filter(
                                (i) => i.status === "good"
                              ).length || 0}
                            </div>
                            <div className="text-xs text-text-secondary">
                              Tốt
                            </div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-yellow-600">
                              {selectedReception.evChecklistItems?.filter(
                                (i) => i.status === "warning"
                              ).length || 0}
                            </div>
                            <div className="text-xs text-text-secondary">
                              Cảnh báo
                            </div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-red-600">
                              {selectedReception.evChecklistItems?.filter(
                                (i) => i.status === "critical"
                              ).length || 0}
                            </div>
                            <div className="text-xs text-text-secondary">
                              Nghiêm trọng
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Customer Items */}
                  {selectedReception.customerItems &&
                    selectedReception.customerItems.length > 0 && (
                      <div>
                        <h4 className="text-text-muted text-gray-800 mb-2">
                          Đồ đạc khách hàng
                        </h4>
                        <div className="bg-dark-300 border rounded-lg p-3">
                          <div className="space-y-2">
                            {selectedReception.customerItems.map(
                              (item, index) => (
                                <div
                                  key={index}
                                  className="text-sm bg-dark-900 p-2 rounded"
                                >
                                  <div className="text-text-muted">
                                    {item.item}
                                  </div>
                                  <div className="text-text-secondary">
                                    Vị trí: {item.location}
                                  </div>
                                  {item.value && (
                                    <div className="text-text-secondary">
                                      Giá trị: {formatVND(item.value)}
                                    </div>
                                  )}
                                  {item.notes && (
                                    <div className="text-text-secondary">
                                      Ghi chú: {item.notes}
                                    </div>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              </div>

              {/* Right Column - Services & Review */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Dịch vụ & Duyệt
                  </h3>

                  {/* Services - Editable */}
                  <div className="bg-dark-900 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-text-muted text-gray-800">
                        Dịch vụ đề xuất sau kiểm tra
                      </h4>
                      <button
                        onClick={() => setIsEditingServices(!isEditingServices)}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${
                          isEditingServices
                            ? 'bg-blue-600 text-white'
                            : 'bg-dark-300 text-blue-400 hover:bg-dark-200'
                        }`}
                      >
                        {isEditingServices ? '✓ Xong' : '✏️ Chỉnh sửa'}
                      </button>
                    </div>

                    <div className="space-y-2">
                      {editedServices && editedServices.length > 0 ? (
                        editedServices.map((service, index) => {
                          const status = getServiceStatus(service);
                          const serviceId = typeof service.serviceId === 'object' ? service.serviceId._id : service.serviceId;
                          const commonParts = getServiceCommonParts(serviceId);

                          // Check if any common parts are out of stock or low stock
                          const partsStockIssues = commonParts
                            .map((cp: any) => {
                              const stockInfo = getPartStockInfo(cp.partId);
                              const requiredQty = (cp.quantity || 1) * service.quantity;
                              return {
                                partName: cp.partName,
                                requiredQty,
                                stockInfo,
                                isOutOfStock: !stockInfo.loading && stockInfo.currentStock === 0,
                                isLowStock: !stockInfo.loading && stockInfo.currentStock > 0 && stockInfo.currentStock < requiredQty,
                              };
                            })
                            .filter((p: any) => p.isOutOfStock || p.isLowStock);

                          const bgColorClass =
                            status === 'added' ? 'bg-green-100 dark:bg-green-900/30 border-green-500' :
                            status === 'modified' ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500' :
                            'bg-dark-300 border-dark-200';

                          return (
                            <div
                              key={index}
                              className={`rounded p-3 text-sm border ${bgColorClass} ${
                                status !== 'unchanged' ? 'border-2' : ''
                              }`}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-text-muted">
                                      {status === 'added' && <span className="text-green-600 mr-1">🟢</span>}
                                      {status === 'modified' && <span className="text-yellow-600 mr-1">🟡</span>}
                                      {service.serviceName}
                                    </span>
                                    {/* Show warning if service has parts with stock issues */}
                                    {partsStockIssues.length > 0 && (
                                      <span className="text-xs px-2 py-0.5 rounded bg-orange-900/30 text-orange-400 font-semibold">
                                        ⚠️ {partsStockIssues.length} part thiếu
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right ml-4">
                                  {(() => {
                                    const duration =
                                      typeof service.serviceId === "object"
                                        ? service.serviceId.estimatedDuration
                                        : service.estimatedDuration;
                                    return duration ? (
                                      <div className="text-text-secondary">
                                        {duration * service.quantity} phút
                                      </div>
                                    ) : null;
                                  })()}
                                  {service.estimatedCost && (
                                    <div className="text-lime-600">
                                      {(
                                        service.estimatedCost * service.quantity
                                      ).toLocaleString("vi-VN")}{" "}
                                      VNĐ
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="text-text-secondary flex items-center justify-between">
                                <div>
                                  Danh mục: {service.category}
                                  {!isEditingServices && (
                                    <span> • Số lượng: {service.quantity}</span>
                                  )}
                                </div>

                                {isEditingServices && (
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs text-text-muted">Số lượng:</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={service.quantity}
                                      onChange={(e) => handleUpdateServiceQuantity(index, parseInt(e.target.value) || 1)}
                                      className="w-16 px-2 py-1 text-sm bg-dark-200 text-white border border-dark-100 rounded"
                                    />
                                    <button
                                      onClick={() => handleRemoveService(index)}
                                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                      title="Xóa dịch vụ"
                                    >
                                      ❌ Xóa
                                    </button>
                                  </div>
                                )}
                              </div>

                              {service.reason && (
                                <div className="text-text-muted text-xs mt-1">
                                  Lý do: {service.reason}
                                </div>
                              )}

                              {/* Show common parts if any */}
                              {commonParts.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-dark-200">
                                  <div className="text-xs text-text-secondary mb-1 font-semibold">
                                    🔧 Parts thường dùng cho dịch vụ này:
                                  </div>
                                  <div className="space-y-1">
                                    {commonParts.map((cp: any, cpIndex: number) => {
                                      const stockInfo = getPartStockInfo(cp.partId);
                                      const requiredQty = (cp.quantity || 1) * service.quantity;
                                      const isOutOfStock = !stockInfo.loading && stockInfo.currentStock === 0;
                                      const isLowStock = !stockInfo.loading && stockInfo.currentStock > 0 && stockInfo.currentStock < requiredQty;

                                      return (
                                        <div key={cpIndex} className="flex items-center gap-2 text-xs bg-dark-900/50 p-1.5 rounded">
                                          <span className="text-text-muted flex-1">
                                            • {cp.partName} {cp.isOptional && '(tùy chọn)'} - Cần: {requiredQty}
                                          </span>
                                          {stockInfo.loading ? (
                                            <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">
                                              ...
                                            </span>
                                          ) : isOutOfStock ? (
                                            <span className="px-1.5 py-0.5 rounded bg-red-900/30 text-red-400 font-semibold">
                                              ⚠️ Hết (0)
                                            </span>
                                          ) : isLowStock ? (
                                            <span className="px-1.5 py-0.5 rounded bg-yellow-900/30 text-yellow-400 font-semibold">
                                              ⚠️ Kho: {stockInfo.currentStock}
                                            </span>
                                          ) : (
                                            <span className="px-1.5 py-0.5 rounded bg-green-900/30 text-green-400">
                                              ✓ Kho: {stockInfo.currentStock}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {status === 'modified' && (
                                <div className="text-yellow-600 text-xs mt-1 italic">
                                  📝 Số lượng đã thay đổi
                                </div>
                              )}
                              {status === 'added' && (
                                <div className="text-green-600 text-xs mt-1 italic">
                                  ✨ Dịch vụ mới thêm
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="bg-dark-300 rounded p-3 text-sm text-text-muted text-center">
                          Không có dịch vụ đề xuất
                        </div>
                      )}

                      {isEditingServices && (
                        <button
                          onClick={() => {
                            setShowServicePicker(true);
                            fetchServicesCatalog();
                          }}
                          className="w-full px-3 py-2 text-sm bg-green-600/20 text-green-400 border border-green-600/50 rounded hover:bg-green-600/30 transition-colors"
                        >
                          + Thêm dịch vụ
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Special Instructions */}
                  {selectedReception.specialInstructions.fromCustomer && (
                    <div className="mb-6">
                      <h4 className="text-text-muted text-text-secondary mb-2">
                        Yêu cầu từ khách hàng
                      </h4>
                      <div className="bg-dark-300 border border-yellow-600 rounded-lg p-3 text-sm text-text-secondary">
                        {selectedReception.specialInstructions.fromCustomer}
                      </div>
                    </div>
                  )}

                  {/* Parts Requested - Editable */}
                  {editedParts && editedParts.length > 0 && (
                    <div className="bg-dark-300 rounded-lg p-4 mb-6 border border-dark-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-text-muted text-text-secondary">
                          Phụ tùng yêu cầu
                        </h4>
                        <button
                          onClick={() => setIsEditingParts(!isEditingParts)}
                          className={`px-3 py-1 text-xs rounded-md transition-colors ${
                            isEditingParts
                              ? 'bg-blue-600 text-white'
                              : 'bg-dark-300 text-blue-400 hover:bg-dark-200'
                          }`}
                        >
                          {isEditingParts ? '✓ Xong' : '✏️ Chỉnh sửa'}
                        </button>
                      </div>

                      <div className="space-y-2">
                        {editedParts.map((part, index) => {
                          const status = getPartStatus(part);
                          // ✅ Use isAvailable and availableQuantity from reception data
                          const isOutOfStock = part.isAvailable === false;
                          const isLowStock = part.isAvailable === true && (part.availableQuantity || 0) < part.quantity;
                          const currentStock = part.availableQuantity || 0;

                          const bgColorClass =
                            status === 'added' ? 'bg-green-100 dark:bg-green-900/30 border-green-500' :
                            status === 'modified' ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500' :
                            'bg-dark-300 border-dark-200';

                          return (
                            <div
                              key={index}
                              className={`rounded p-3 text-sm border ${bgColorClass} ${
                                status !== 'unchanged' ? 'border-2' : ''
                              }`}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-text-muted">
                                      {status === 'added' && <span className="text-green-600 mr-1">🟢</span>}
                                      {status === 'modified' && <span className="text-yellow-600 mr-1">🟡</span>}
                                      {part.partName}
                                    </span>
                                    {/* Stock info badge - using data from reception */}
                                    {isOutOfStock ? (
                                      <span className="text-xs px-2 py-0.5 rounded bg-red-900/30 text-red-400 font-semibold">
                                        ⚠️ Hết hàng
                                      </span>
                                    ) : isLowStock ? (
                                      <span className="text-xs px-2 py-0.5 rounded bg-yellow-900/30 text-yellow-400 font-semibold">
                                        ⚠️ Kho: {currentStock} (cần {part.quantity})
                                      </span>
                                    ) : (
                                      <span className="text-xs px-2 py-0.5 rounded bg-green-900/30 text-green-400">
                                        ✓ Kho: {currentStock}
                                      </span>
                                    )}
                                  </div>
                                  {part.partNumber && (
                                    <div className="text-xs text-text-secondary mt-0.5">
                                      #{part.partNumber}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right ml-4">
                                  <div className="text-purple-600 text-text-muted">
                                    {(
                                      (part.estimatedCost || 0) *
                                      part.quantity
                                    ).toLocaleString("vi-VN")}{" "}
                                    VNĐ
                                  </div>
                                </div>
                              </div>

                              <div className="text-text-secondary flex items-center justify-between">
                                <div>
                                  {!isEditingParts && (
                                    <span>Số lượng: {part.quantity}</span>
                                  )}
                                </div>

                                {isEditingParts && (
                                  <div className="flex items-center gap-2 ml-auto">
                                    <label className="text-xs text-text-muted">Số lượng:</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={part.quantity}
                                      onChange={(e) => handleUpdatePartQuantity(index, parseInt(e.target.value) || 1)}
                                      className="w-16 px-2 py-1 text-sm bg-dark-200 text-white border border-dark-100 rounded"
                                    />
                                    <button
                                      onClick={() => handleRemovePart(index)}
                                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                      title="Xóa phụ tùng"
                                    >
                                      ❌ Xóa
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div className="text-text-muted text-xs mt-1">
                                Lý do: {part.reason}
                              </div>

                              {status === 'modified' && (
                                <div className="text-yellow-600 text-xs mt-1 italic">
                                  📝 Số lượng đã thay đổi
                                </div>
                              )}
                              {status === 'added' && (
                                <div className="text-green-600 text-xs mt-1 italic">
                                  ✨ Phụ tùng mới thêm
                                </div>
                              )}

                              {/* Out of stock warning */}
                              {isOutOfStock && (
                                <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-400">
                                  <strong>⚠️ Cảnh báo:</strong> Phụ tùng này hiện đã hết hàng trong kho. Cần đặt hàng từ nhà cung cấp hoặc thêm vào danh sách linh kiện đặt ngoài.
                                </div>
                              )}

                              {/* Low stock warning */}
                              {isLowStock && (
                                <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded text-xs text-yellow-400">
                                  <strong>⚠️ Cảnh báo:</strong> Số lượng trong kho ({currentStock}) không đủ so với yêu cầu ({part.quantity}). Thiếu {part.quantity - currentStock} cái.
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {isEditingParts && (
                          <button
                            onClick={() => {
                              setShowPartPicker(true);
                              fetchPartsCatalog();
                            }}
                            className="w-full px-3 py-2 text-sm bg-purple-600/20 text-purple-400 border border-purple-600/50 rounded hover:bg-purple-600/30 transition-colors"
                          >
                            + Thêm phụ tùng
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* External Parts Manager - Always show if technician has note */}
                  {selectedReception.specialInstructions?.fromStaff && (
                    <div className="mb-6">
                      <ExternalPartsManager
                        technicianNote={selectedReception.specialInstructions.fromStaff}
                        existingParts={(selectedReception as any).externalParts || []}
                        onChange={setExternalParts}
                      />
                    </div>
                  )}

                  {/* Workflow History Viewer */}
                  {selectedReception.workflowHistory &&
                    selectedReception.workflowHistory.length > 0 && (
                      <div className="mb-6">
                        <WorkflowHistoryViewer
                          history={selectedReception.workflowHistory}
                        />
                      </div>
                    )}

                  {/* Review Section */}
                  <div className="bg-dark-900 rounded-lg p-4">
                    <h4 className="text-text-muted text-gray-800 mb-4">
                      Đánh giá phiếu tiếp nhận
                    </h4>

                    <div className="space-y-4">
                      {/* Total Cost Summary */}
                      {(() => {
                        // Use edited services/parts if editing, otherwise use original data
                        const servicesToCalculate = isEditingServices ? editedServices : (selectedReception.recommendedServices || []);
                        const partsToCalculate = isEditingParts ? editedParts : (selectedReception.requestedParts || []);

                        const servicesCost = servicesToCalculate.reduce(
                          (total, service) =>
                            total +
                            (service.estimatedCost || 0) * service.quantity,
                          0
                        );
                        const partsCost = partsToCalculate.reduce(
                          (total, part) =>
                            total + (part.estimatedCost || 0) * part.quantity,
                          0
                        );
                        const externalPartsCost = (externalParts || []).reduce(
                          (total, part) => total + (part.totalPrice || 0),
                          0
                        );
                        const totalCost = servicesCost + partsCost + externalPartsCost;

                        return totalCost > 0 ? (
                          <div className="bg-dark-900 border border-blue-200 rounded-lg p-4 mb-4">
                            <h5 className="text-white font-semibold mb-3">
                              Tóm tắt chi phí
                            </h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-text-secondary">
                                  Dịch vụ đề xuất:
                                </span>
                                <span className="text-white">
                                  {servicesCost.toLocaleString("vi-VN")} VNĐ
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-text-secondary">
                                  Phụ tùng:
                                </span>
                                <span className="text-white">
                                  {partsCost.toLocaleString("vi-VN")} VNĐ
                                </span>
                              </div>
                              {externalPartsCost > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-amber-600 flex items-center gap-1">
                                    <span>🛒</span>
                                    Linh kiện đặt ngoài:
                                  </span>
                                  <span className="text-amber-500 font-semibold">
                                    {externalPartsCost.toLocaleString("vi-VN")} VNĐ
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between font-semibold border-t border-dark-200 pt-2 mt-2">
                                <span className="text-white">Tổng cộng:</span>
                                <span className="text-lime-600">
                                  {totalCost.toLocaleString("vi-VN")} VNĐ
                                </span>
                              </div>
                              <div className="flex justify-between text-xs border-t border-dark-200 pt-2 mt-2">
                                <span className="text-text-secondary">
                                  Bao gồm VAT 10%:
                                </span>
                                <span className="text-lime-500">
                                  {(totalCost * 1.1).toLocaleString("vi-VN")}{" "}
                                  VNĐ
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : null;
                      })()}

                      {/* Extended Completion Date - Show when there are external parts OR technician note about external parts */}
                      {(externalParts.length > 0 ||
                        (selectedReception as any).externalParts?.length > 0 ||
                        selectedReception.specialInstructions?.fromStaff) && (
                        <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4">
                          <label className="block text-sm font-medium text-amber-400 mb-2">
                            📅 Ngày hoàn thành dự kiến mới (có part ngoài)
                          </label>
                          <input
                            type="date"
                            value={extendedCompletionDate}
                            onChange={(e) => setExtendedCompletionDate(e.target.value)}
                            className="block w-full rounded-md bg-dark-300 text-white border-amber-600/50 shadow-sm focus:border-amber-400 focus:ring-amber-400"
                            placeholder="Chọn ngày hoàn thành mới..."
                          />
                          <p className="mt-2 text-xs text-amber-300">
                            💡 Chọn ngày dự kiến hoàn thành mới (giờ sẽ giữ theo lịch hẹn gốc). Vì cần đặt linh kiện ngoài nên xe có thể phải để lại lâu hơn.
                          </p>
                        </div>
                      )}

                      {/* Modification Reason - Required if there are changes */}
                      {hasAnyModifications() && (
                        <div className="border-2 border-yellow-600/50 bg-yellow-900/20 rounded-lg p-4">
                          <label className="block text-sm font-medium text-yellow-400 mb-2">
                            ⚠️ Lý do thay đổi services/parts (bắt buộc)
                          </label>
                          <textarea
                            value={modificationReason}
                            onChange={(e) => setModificationReason(e.target.value)}
                            className="w-full bg-dark-300 text-white border border-yellow-600/50 rounded-lg p-3 focus:border-yellow-400 focus:ring-yellow-400"
                            rows={3}
                            placeholder="Giải thích lý do bạn thay đổi services/parts..."
                            required
                          />
                          <p className="mt-2 text-xs text-yellow-300">
                            💡 Vui lòng giải thích tại sao bạn thay đổi dịch vụ hoặc phụ tùng so với đề xuất ban đầu của kỹ thuật viên
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm text-text-muted text-text-secondary mb-2">
                          Ghi chú đánh giá{" "}
                          <span className="text-text-muted font-normal">
                            (không bắt buộc)
                          </span>
                        </label>
                        <textarea
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          rows={4}
                          className="block w-full rounded-md bg-dark-300 text-white border-dark-300 shadow-sm focus:border-lime-400 focus:ring-lime-400"
                          placeholder="Nhập ghi chú về quyết định duyệt/từ chối (nếu cần)..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col items-end mt-8 pt-6 border-t">
              {/* Stock issue warning */}
              {hasStockIssues() && (
                <div className="w-full mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-red-400 font-semibold mb-1">
                        Không thể duyệt - Phụ tùng thiếu hàng
                      </h4>
                      <p className="text-red-300 text-sm">
                        Có phụ tùng trong phiếu hoặc dịch vụ đang thiếu hàng trong kho.
                        Vui lòng xử lý một trong các cách sau:
                      </p>
                      <ul className="text-red-300 text-sm mt-2 ml-4 list-disc space-y-1">
                        <li>Xóa hoặc giảm số lượng phụ tùng thiếu trong tab "Chỉnh sửa"</li>
                        <li>Thêm phụ tùng thiếu vào danh sách "Linh kiện đặt ngoài"</li>
                        <li>Hoặc từ chối phiếu và yêu cầu kỹ thuật viên cập nhật lại</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-4 w-full">
                <button
                  onClick={() => setSelectedReception(null)}
                  className="px-6 py-2 border border-dark-200 rounded-md text-text-secondary hover:bg-dark-900"
                >
                  Đóng
                </button>
                <button
                  onClick={() => handleReviewSubmit("reject")}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
                >
                  {isSubmitting ? (
                    <ClockIcon className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <XMarkIcon className="w-4 h-4 mr-2" />
                  )}
                  Từ chối
                </button>
                <button
                  onClick={() => handleReviewSubmit("approve")}
                  disabled={isSubmitting || hasStockIssues()}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center relative group"
                  title={hasStockIssues() ? "Không thể duyệt vì có phụ tùng thiếu hàng" : ""}
                >
                  {isSubmitting ? (
                    <ClockIcon className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircleIcon className="w-4 h-4 mr-2" />
                  )}
                  Duyệt
                  {hasStockIssues() && !isSubmitting && (
                    <span className="ml-2">
                      <ExclamationTriangleIcon className="w-4 h-4 text-yellow-300" />
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Picker Modal */}
      {showServicePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-75 overflow-y-auto h-full w-full z-[60] flex items-center justify-center">
          <div className="relative mx-auto p-6 border w-11/12 max-w-2xl shadow-lg rounded-md bg-dark-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Chọn dịch vụ để thêm</h3>
              <button
                onClick={() => setShowServicePicker(false)}
                className="text-text-muted hover:text-white"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {loadingCatalog ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {availableServices.map((service) => (
                  <div
                    key={service._id}
                    className="bg-dark-900 rounded-lg p-4 hover:bg-dark-200 transition-colors cursor-pointer"
                    onClick={() => handleAddService(service)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="text-white font-semibold">{service.name}</h4>
                        <p className="text-text-secondary text-sm">{service.category}</p>
                        {service.description && (
                          <p className="text-text-muted text-xs mt-1">{service.description}</p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-lime-600 font-semibold">
                          {(service.basePrice || 0).toLocaleString('vi-VN')} VNĐ
                        </div>
                        <div className="text-text-secondary text-xs">
                          {service.estimatedDuration} phút
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {availableServices.length === 0 && (
                  <div className="text-center py-8 text-text-muted">
                    Không có dịch vụ nào
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Part Picker Modal */}
      {showPartPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-75 overflow-y-auto h-full w-full z-[60] flex items-center justify-center">
          <div className="relative mx-auto p-6 border w-11/12 max-w-2xl shadow-lg rounded-md bg-dark-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Chọn phụ tùng để thêm</h3>
              <button
                onClick={() => setShowPartPicker(false)}
                className="text-text-muted hover:text-white"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {loadingCatalog ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {availableParts.map((part) => (
                  <div
                    key={part._id}
                    className="bg-dark-900 rounded-lg p-4 hover:bg-dark-200 transition-colors cursor-pointer"
                    onClick={() => handleAddPart(part)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="text-white font-semibold">{part.name}</h4>
                        <p className="text-text-secondary text-sm">#{part.partNumber}</p>
                        {part.description && (
                          <p className="text-text-muted text-xs mt-1">{part.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            (part.inventory?.currentStock || 0) > 0
                              ? 'bg-green-900/30 text-green-400'
                              : 'bg-red-900/30 text-red-400'
                          }`}>
                            {(part.inventory?.currentStock || 0) > 0
                              ? `Còn ${part.inventory.currentStock} cái`
                              : 'Hết hàng'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-purple-600 font-semibold">
                          {(part.pricing?.retail || 0).toLocaleString('vi-VN')} VNĐ
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {availableParts.length === 0 && (
                  <div className="text-center py-8 text-text-muted">
                    Không có phụ tùng nào
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceReceptionReview;
