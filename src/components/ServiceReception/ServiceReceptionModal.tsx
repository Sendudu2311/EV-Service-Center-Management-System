import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  PhotoIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { DetailedAppointmentStatus } from "../../types/appointment";
import { servicesAPI, partsAPI } from "../../services/api";
import EVChecklistTab from "./EVChecklistTab";

interface VehicleCondition {
  exterior: {
    condition: "excellent" | "good" | "fair" | "poor";
    damages: Array<{
      location: string;
      type:
        | "scratch"
        | "dent"
        | "crack"
        | "rust"
        | "paint_damage"
        | "missing_part";
      severity: "minor" | "moderate" | "major";
      description: string;
    }>;
    notes: string;
  };
  interior: {
    condition: "excellent" | "good" | "fair" | "poor";
    cleanliness: "very_clean" | "clean" | "moderate" | "dirty" | "very_dirty";
    damages: Array<{
      location: string;
      type: "stain" | "tear" | "wear" | "burn" | "missing_part";
      description: string;
    }>;
    notes: string;
  };
  battery: {
    level: number;
    health: "excellent" | "good" | "fair" | "poor" | "replace_soon";
    temperature?: number;
    chargingStatus: "not_charging" | "charging" | "fully_charged" | "error";
    notes: string;
  };
  mileage: {
    current: number;
    lastService?: number;
    mileageSinceLastService?: number;
  };
}

interface ChecklistItem {
  id: string;
  label: string;
  category: "battery" | "charging" | "motor" | "safety" | "general";
  checked: boolean;
  status?: "good" | "warning" | "critical";
  notes?: string;
}

interface ServiceReceptionData {
  evChecklistItems: ChecklistItem[];
  vehicleCondition: VehicleCondition;
  customerItems: Array<{
    item: string;
    location: string;
    value?: number;
    notes: string;
  }>;
  specialInstructions: {
    fromCustomer: string;
    fromStaff?: string;
    safetyPrecautions: string[];
    warningNotes: string[];
  };
  estimatedServiceTime: number;
  // NOTE: Initial booked service is already paid, not included in reception
  // Only services discovered during inspection are recommended
  recommendedServices: Array<{
    serviceId: string;
    serviceName: string;
    quantity: number;
    reason: string;
    discoveredDuring?: string;
    estimatedCost?: number;
    estimatedPrice?: number;
    estimatedDuration?: number;
  }>;
  requestedParts: Array<{
    partId: string;
    partName: string;
    partNumber?: string;
    quantity: number;
    reason: string;
    estimatedCost: number;
    isAvailable: boolean;
    availableQuantity: number;
  }>;
}

interface ServiceReceptionModalProps {
  appointment: {
    _id: string;
    appointmentNumber: string;
    customerId: {
      firstName: string;
      lastName: string;
      phone: string;
    };
    vehicleId: {
      make: string;
      model: string;
      year: number;
      vin: string;
      licensePlate: string;
    };
    services: Array<{
      serviceId: {
        _id: string;
        name: string;
        category: string;
        estimatedDuration: number;
        basePrice?: number;
      };
      quantity: number;
    }>;
  };
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ServiceReceptionData) => Promise<void>;
  isLoading?: boolean;
}

const ServiceReceptionModal: React.FC<ServiceReceptionModalProps> = ({
  appointment,
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ServiceReceptionData>({
    evChecklistItems: [],
    vehicleCondition: {
      exterior: {
        condition: "good",
        damages: [],
        notes: "",
      },
      interior: {
        condition: "good",
        cleanliness: "clean",
        damages: [],
        notes: "",
      },
      battery: {
        level: 80,
        health: "good",
        chargingStatus: "not_charging",
        notes: "",
      },
      mileage: {
        current: 0,
      },
    },
    customerItems: [],
    specialInstructions: {
      fromCustomer: "",
      fromStaff: "",
      safetyPrecautions: [],
      warningNotes: [],
    },
    estimatedServiceTime: 120,
    recommendedServices: [],
    requestedParts: [],
  });

  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [availableParts, setAvailableParts] = useState<any[]>([]);
  const [loadingParts, setLoadingParts] = useState(false);

  // Calculate totals
  // NOTE: Initial booked service is NOT included - it's already paid
  // Only calculate recommended services + parts
  const calculateTotalTime = () => {
    let totalTime = 0;

    // Add time from recommended services (discovered during inspection)
    formData.recommendedServices.forEach((service) => {
      const serviceData = availableServices.find(
        (s) => s._id === service.serviceId
      );
      if (serviceData) {
        totalTime +=
          (service.estimatedDuration || serviceData.estimatedDuration) *
          service.quantity;
      }
    });

    return totalTime;
  };

  const calculateTotalCost = () => {
    let totalServiceCost = 0;
    let totalPartsCost = 0;

    // Calculate cost of recommended services
    formData.recommendedServices.forEach((service) => {
      const serviceData = availableServices.find(
        (s) => s._id === service.serviceId
      );
      if (serviceData) {
        totalServiceCost +=
          (service.estimatedPrice || serviceData.price) * service.quantity;
      }
    });

    // Calculate cost of requested parts
    formData.requestedParts.forEach((part) => {
      totalPartsCost += part.estimatedCost * part.quantity;
    });

    return {
      serviceCost: totalServiceCost,
      partsCost: totalPartsCost,
      total: totalServiceCost + totalPartsCost,
    };
  };

  const totalTime = calculateTotalTime();
  const totalCost = calculateTotalCost();

  // Load available services from API
  useEffect(() => {
    const loadServices = async () => {
      try {
        setLoadingServices(true);
        const response = await servicesAPI.getAll();
        setAvailableServices(response.data.data || []);
      } catch (error) {
        console.error("Error loading services:", error);
      } finally {
        setLoadingServices(false);
      }
    };

    if (isOpen) {
      loadServices();
    }
  }, [isOpen]);

  // Load available parts from API - FILTER OUT parts with stock = 0
  useEffect(() => {
    const loadParts = async () => {
      try {
        setLoadingParts(true);
        const response = await partsAPI.getAll();

        // Filter to only show parts with current stock > 0
        const partsInStock = (response.data.data || []).filter(
          (part: any) => (part.inventory?.currentStock || 0) > 0
        );

        setAvailableParts(partsInStock);
      } catch (error) {
        console.error("Error loading parts:", error);
      } finally {
        setLoadingParts(false);
      }
    };

    if (isOpen) {
      loadParts();
    }
  }, [isOpen]);

  const totalSteps = 4;

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    // Update formData with calculated totals before submitting
    const updatedFormData = {
      ...formData,
      estimatedServiceTime: totalTime,
    };

    await onSubmit(updatedFormData);
  };

  const addCustomerItem = () => {
    setFormData((prev) => ({
      ...prev,
      customerItems: [
        ...prev.customerItems,
        { item: "", location: "", notes: "" },
      ],
    }));
  };

  const removeCustomerItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      customerItems: prev.customerItems.filter((_, i) => i !== index),
    }));
  };

  const addDamage = (section: "exterior" | "interior") => {
    const newDamage =
      section === "exterior"
        ? {
            location: "",
            type: "scratch" as const,
            severity: "minor" as const,
            description: "",
          }
        : { location: "", type: "stain" as const, description: "" };

    setFormData((prev) => ({
      ...prev,
      vehicleCondition: {
        ...prev.vehicleCondition,
        [section]: {
          ...prev.vehicleCondition[section],
          damages: [...prev.vehicleCondition[section].damages, newDamage],
        },
      },
    }));
  };

  const removeDamage = (section: "exterior" | "interior", index: number) => {
    setFormData((prev) => ({
      ...prev,
      vehicleCondition: {
        ...prev.vehicleCondition,
        [section]: {
          ...prev.vehicleCondition[section],
          damages: prev.vehicleCondition[section].damages.filter(
            (_, i) => i !== index
          ),
        },
      },
    }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-lg text-text-muted text-white">EV Checklist</h3>
            <EVChecklistTab
              value={formData.evChecklistItems}
              onChange={(items) =>
                setFormData((prev) => ({ ...prev, evChecklistItems: items }))
              }
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg text-text-muted text-white">
              Đồ đạc khách hàng
            </h3>

            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-text-secondary">
                  Ghi nhận các đồ đạc cá nhân của khách hàng để trong xe
                </p>
                <button
                  onClick={addCustomerItem}
                  className="text-sm text-lime-600 hover:text-lime-700"
                >
                  + Thêm đồ đạc
                </button>
              </div>

              {formData.customerItems.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-dark-300 rounded-lg">
                  <p className="text-text-muted">
                    Chưa có đồ đạc nào được ghi nhận
                  </p>
                  <button
                    onClick={addCustomerItem}
                    className="mt-2 text-lime-600 hover:text-lime-700"
                  >
                    Thêm đồ đạc đầu tiên
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.customerItems.map((item, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 bg-dark-900"
                    >
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <input
                          type="text"
                          placeholder="Tên đồ vật (VD: Laptop, Điện thoại)"
                          value={item.item}
                          onChange={(e) => {
                            const newItems = [...formData.customerItems];
                            newItems[index] = { ...item, item: e.target.value };
                            setFormData((prev) => ({
                              ...prev,
                              customerItems: newItems,
                            }));
                          }}
                          className="block w-full rounded-md bg-dark-300 text-white border-dark-300 shadow-sm focus:border-lime-400 focus:ring-lime-400 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Vị trí (VD: Ghế sau, Cốp xe)"
                          value={item.location}
                          onChange={(e) => {
                            const newItems = [...formData.customerItems];
                            newItems[index] = {
                              ...item,
                              location: e.target.value,
                            };
                            setFormData((prev) => ({
                              ...prev,
                              customerItems: newItems,
                            }));
                          }}
                          className="block w-full rounded-md bg-dark-300 text-white border-dark-300 shadow-sm focus:border-lime-400 focus:ring-lime-400 text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <input
                          type="number"
                          placeholder="Giá trị (VND)"
                          value={item.value || ""}
                          onChange={(e) => {
                            const newItems = [...formData.customerItems];
                            newItems[index] = {
                              ...item,
                              value: parseFloat(e.target.value) || undefined,
                            };
                            setFormData((prev) => ({
                              ...prev,
                              customerItems: newItems,
                            }));
                          }}
                          className="block w-full rounded-md bg-dark-300 text-white border-dark-300 shadow-sm focus:border-lime-400 focus:ring-lime-400 text-sm"
                        />
                        <div></div>
                        <button
                          onClick={() => removeCustomerItem(index)}
                          className="text-red-600 hover:text-red-700 text-sm justify-self-end"
                        >
                          Xóa
                        </button>
                      </div>

                      <textarea
                        placeholder="Ghi chú thêm..."
                        value={item.notes}
                        onChange={(e) => {
                          const newItems = [...formData.customerItems];
                          newItems[index] = { ...item, notes: e.target.value };
                          setFormData((prev) => ({
                            ...prev,
                            customerItems: newItems,
                          }));
                        }}
                        rows={2}
                        className="block w-full rounded-md bg-dark-300 text-white border-dark-300 shadow-sm focus:border-lime-400 focus:ring-lime-400 text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg text-text-muted text-white">
              Dịch vụ đề xuất sau kiểm tra
            </h3>

            {/* Service Summary */}
            <div className="bg-dark-900 rounded-lg p-4">
              <h4 className="text-md text-text-muted text-white mb-3">
                Dịch vụ đã đặt
              </h4>
              <div className="space-y-2">
                {appointment.services.map((service, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center text-sm"
                  >
                    <span>
                      {service.serviceId.name}{" "}
                      {service.quantity > 1 ? `(x${service.quantity})` : ""}
                    </span>
                    <div className="text-text-secondary">
                      {service.serviceId.estimatedDuration * service.quantity}{" "}
                      phút
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">
                    Tổng thời gian dịch vụ đã đặt:
                  </span>
                  <span>
                    {appointment.services.reduce(
                      (total, service) =>
                        total +
                        service.serviceId.estimatedDuration * service.quantity,
                      0
                    )}{" "}
                    phút
                  </span>
                </div>
              </div>
            </div>

            {/* Additional Services */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md text-text-muted text-white">
                  Dịch vụ đề xuất cần thực hiện
                </h4>
                <button
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      recommendedServices: [
                        ...prev.recommendedServices,
                        {
                          serviceId: "",
                          serviceName: "",
                          quantity: 1,
                          reason: "",
                          estimatedCost: 0,
                          estimatedPrice: 0,
                          estimatedDuration: 60,
                        },
                      ],
                    }))
                  }
                  disabled={loadingServices}
                  className="text-sm text-lime-600 hover:text-lime-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingServices ? "Đang tải..." : "+ Thêm dịch vụ"}
                </button>
              </div>

              {formData.recommendedServices.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-dark-300 rounded-lg">
                  <p className="text-text-muted">Chưa có dịch vụ bổ sung nào</p>
                  <button
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        recommendedServices: [
                          ...prev.recommendedServices,
                          {
                            serviceId: "",
                            serviceName: "",
                            quantity: 1,
                            reason: "",
                            estimatedCost: 0,
                            estimatedPrice: 0,
                            estimatedDuration: 60,
                          },
                        ],
                      }))
                    }
                    disabled={loadingServices}
                    className="mt-2 text-lime-600 hover:text-lime-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingServices
                      ? "Đang tải dịch vụ..."
                      : "Thêm dịch vụ đầu tiên"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.recommendedServices.map((service, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 bg-dark-900"
                    >
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <select
                          value={service.serviceId}
                          onChange={(e) => {
                            const selectedService = availableServices.find(
                              (s) => s._id === e.target.value
                            );
                            const newServices = [
                              ...formData.recommendedServices,
                            ];
                            newServices[index] = {
                              ...service,
                              serviceId: e.target.value,
                              serviceName: selectedService?.name || "",
                              estimatedCost: selectedService?.basePrice || 0,
                              estimatedPrice: selectedService?.basePrice || 0,
                              estimatedDuration:
                                selectedService?.estimatedDuration || 60,
                            };
                            setFormData((prev) => ({
                              ...prev,
                              recommendedServices: newServices,
                            }));
                          }}
                          className="block w-full rounded-md bg-dark-300 text-white border-dark-300 shadow-sm focus:border-lime-400 focus:ring-lime-400 text-sm"
                          disabled={loadingServices}
                        >
                          <option value="">Chọn dịch vụ...</option>
                          {availableServices.map((availableService) => (
                            <option
                              key={availableService._id}
                              value={availableService._id}
                            >
                              {availableService.name} -{" "}
                              {availableService.basePrice?.toLocaleString(
                                "vi-VN"
                              )}{" "}
                              VNĐ
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="1"
                          placeholder="Số lượng"
                          value={service.quantity}
                          onChange={(e) => {
                            const newServices = [
                              ...formData.recommendedServices,
                            ];
                            newServices[index] = {
                              ...service,
                              quantity: parseInt(e.target.value) || 1,
                            };
                            setFormData((prev) => ({
                              ...prev,
                              recommendedServices: newServices,
                            }));
                          }}
                          className="block w-full rounded-md bg-dark-300 text-white border-dark-300 shadow-sm focus:border-lime-400 focus:ring-lime-400 text-sm"
                        />
                        <button
                          onClick={() => {
                            const newServices =
                              formData.recommendedServices.filter(
                                (_, i) => i !== index
                              );
                            setFormData((prev) => ({
                              ...prev,
                              recommendedServices: newServices,
                            }));
                          }}
                          className="text-red-600 hover:text-red-700 text-sm justify-self-end"
                        >
                          Xóa
                        </button>
                      </div>

                      <div className="mb-3">
                        <textarea
                          placeholder="Lý do cần thiết cho dịch vụ này..."
                          value={service.reason}
                          onChange={(e) => {
                            const newServices = [
                              ...formData.recommendedServices,
                            ];
                            newServices[index] = {
                              ...service,
                              reason: e.target.value,
                            };
                            setFormData((prev) => ({
                              ...prev,
                              recommendedServices: newServices,
                            }));
                          }}
                          rows={2}
                          className="block w-full rounded-md bg-dark-300 text-white border-dark-300 shadow-sm focus:border-lime-400 focus:ring-lime-400 text-sm"
                        />
                      </div>

                      {/* Service price info */}
                      {service.serviceId && (
                        <div className="p-3 bg-dark-800 rounded-md">
                          <div className="flex justify-between text-sm">
                            <span className="text-text-muted">Đơn giá:</span>
                            <span className="text-white font-medium">
                              {(service.estimatedPrice || 0).toLocaleString(
                                "vi-VN"
                              )}{" "}
                              VNĐ
                            </span>
                          </div>
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-text-muted">Tổng giá:</span>
                            <span className="text-white font-medium">
                              {(
                                (service.estimatedPrice || 0) * service.quantity
                              ).toLocaleString("vi-VN")}{" "}
                              VNĐ
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Service Time & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-muted text-text-secondary mb-2">
                  Thời gian dự kiến (phút) - Tự động tính
                </label>
                <input
                  type="number"
                  value={totalTime}
                  readOnly
                  className="block w-full rounded-md border-dark-300 shadow-sm bg-dark-900 text-text-secondary cursor-not-allowed"
                />
                <p className="text-xs text-text-muted mt-1">
                  Bao gồm thời gian của tất cả dịch vụ đã đặt và bổ sung
                </p>
              </div>
            </div>

            {/* Special Instructions */}
            <div>
              <label className="block text-sm text-text-muted text-text-secondary mb-2">
                Yêu cầu từ khách hàng
              </label>
              <textarea
                value={formData.specialInstructions.fromCustomer}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    specialInstructions: {
                      ...prev.specialInstructions,
                      fromCustomer: e.target.value,
                    },
                  }))
                }
                rows={3}
                className="block w-full rounded-md bg-dark-300 text-white border-dark-300 shadow-sm focus:border-lime-400 focus:ring-lime-400"
                placeholder="Ghi chú các yêu cầu đặc biệt từ khách hàng..."
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg text-text-muted text-white">
              Yêu cầu phụ tùng
            </h3>

            {/* Part Request Management */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md text-text-muted text-white">
                  Phụ tùng cần thiết
                </h4>
                <button
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      requestedParts: [
                        ...prev.requestedParts,
                        {
                          partId: "",
                          partName: "",
                          partNumber: "",
                          quantity: 1,
                          reason: "",
                          estimatedCost: 0,
                          isAvailable: false,
                          availableQuantity: 0,
                        },
                      ],
                    }))
                  }
                  disabled={loadingParts}
                  className="text-sm text-lime-600 hover:text-lime-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingParts ? "Đang tải..." : "+ Thêm phụ tùng"}
                </button>
              </div>

              {formData.requestedParts.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-dark-300 rounded-lg">
                  <p className="text-text-muted">
                    Chưa có yêu cầu phụ tùng nào
                  </p>
                  <button
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        requestedParts: [
                          ...prev.requestedParts,
                          {
                            partId: "",
                            partName: "",
                            partNumber: "",
                            quantity: 1,
                            reason: "",
                            estimatedCost: 0,
                            isAvailable: false,
                            availableQuantity: 0,
                          },
                        ],
                      }))
                    }
                    disabled={loadingParts}
                    className="mt-2 text-lime-600 hover:text-lime-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingParts
                      ? "Đang tải phụ tùng..."
                      : "Thêm yêu cầu đầu tiên"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.requestedParts.map((part, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 bg-dark-900"
                    >
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="col-span-2">
                          <select
                            value={part.partId}
                            onChange={(e) => {
                              const selectedPart = availableParts.find(
                                (p) => p._id === e.target.value
                              );

                              const newParts = [...formData.requestedParts];
                              newParts[index] = {
                                ...part,
                                partId: e.target.value,
                                partName: selectedPart?.name || "",
                                partNumber: selectedPart?.partNumber || "",
                                estimatedCost:
                                  selectedPart?.pricing?.retail || 0,
                                isAvailable:
                                  (selectedPart?.inventory?.currentStock ||
                                    0) >= part.quantity,
                                availableQuantity:
                                  selectedPart?.inventory?.currentStock || 0,
                              };

                              setFormData((prev) => ({
                                ...prev,
                                requestedParts: newParts,
                              }));
                            }}
                            className="block w-full rounded-md bg-dark-300 text-white border-dark-300 shadow-sm focus:border-lime-400 focus:ring-lime-400 text-sm"
                            disabled={loadingParts}
                          >
                            <option value="">Chọn phụ tùng...</option>
                            {availableParts.map((availablePart) => (
                              <option
                                key={availablePart._id}
                                value={availablePart._id}
                              >
                                {availablePart.name} ({availablePart.partNumber}
                                ) -{" "}
                                {availablePart.pricing?.retail?.toLocaleString(
                                  "vi-VN"
                                )}{" "}
                                VNĐ
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => {
                            const newParts = formData.requestedParts.filter(
                              (_, i) => i !== index
                            );
                            setFormData((prev) => ({
                              ...prev,
                              requestedParts: newParts,
                            }));
                          }}
                          className="text-red-600 hover:text-red-700 text-sm justify-self-end"
                        >
                          Xóa
                        </button>
                      </div>

                      <div className="mb-3">
                        <input
                          type="number"
                          min="1"
                          placeholder="Số lượng"
                          value={part.quantity}
                          onChange={(e) => {
                            const newParts = [...formData.requestedParts];
                            const newQuantity = parseInt(e.target.value) || 1;
                            // Keep availableQuantity for comparison (it's from real-time Part model)
                            newParts[index] = {
                              ...part,
                              quantity: newQuantity,
                              isAvailable:
                                (part.availableQuantity || 0) >= newQuantity,
                            };
                            setFormData((prev) => ({
                              ...prev,
                              requestedParts: newParts,
                            }));
                          }}
                          className="block w-full rounded-md bg-dark-300 text-white border-dark-300 shadow-sm focus:border-lime-400 focus:ring-lime-400 text-sm"
                        />
                      </div>

                      {/* Part price and availability info */}
                      {part.partId && (
                        <div className="mb-3 p-3 bg-dark-800 rounded-md space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-text-muted">Đơn giá:</span>
                            <span className="text-white font-medium">
                              {part.estimatedCost.toLocaleString("vi-VN")} VNĐ
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-text-muted">Tổng giá:</span>
                            <span className="text-white font-medium">
                              {(
                                part.estimatedCost * part.quantity
                              ).toLocaleString("vi-VN")}{" "}
                              VNĐ
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-text-muted">Tồn kho:</span>
                            <span
                              className={`font-medium ${(part.availableQuantity || 0) >= part.quantity ? "text-green-400" : "text-red-400"}`}
                            >
                              {part.availableQuantity || 0}{" "}
                              {(part.availableQuantity || 0) >= part.quantity
                                ? "(Đủ hàng)"
                                : "(Thiếu hàng)"}
                            </span>
                          </div>
                        </div>
                      )}

                      <div>
                        <textarea
                          placeholder="Lý do cần thiết cho phụ tùng này..."
                          value={part.reason}
                          onChange={(e) => {
                            const newParts = [...formData.requestedParts];
                            newParts[index] = {
                              ...part,
                              reason: e.target.value,
                            };
                            setFormData((prev) => ({
                              ...prev,
                              requestedParts: newParts,
                            }));
                          }}
                          rows={2}
                          className="block w-full rounded-md bg-dark-300 text-white border-dark-300 shadow-sm focus:border-lime-400 focus:ring-lime-400 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="bg-dark-300 rounded-lg p-4 border border-dark-200">
              <h4 className="text-md text-text-muted text-white mb-2">
                Tóm tắt
              </h4>
              <div className="text-sm text-text-secondary space-y-2">
                <p>• Dịch vụ đã đặt: {appointment.services.length} dịch vụ</p>
                <p>
                  • Dịch vụ đề xuất: {formData.recommendedServices.length} dịch
                  vụ
                </p>
                <p>
                  • Phụ tùng yêu cầu: {formData.requestedParts.length} phụ tùng
                </p>
                <p className="text-white font-medium">
                  • Tổng thời gian dự kiến: {totalTime} phút
                </p>
                <div className="border-t border-dark-200 pt-2 mt-2">
                  <p className="text-text-muted">
                    Chi phí dịch vụ đề xuất:{" "}
                    <span className="text-white font-medium">
                      {totalCost.serviceCost.toLocaleString("vi-VN")} VNĐ
                    </span>
                  </p>
                  <p className="text-text-muted">
                    Chi phí phụ tùng:{" "}
                    <span className="text-white font-medium">
                      {totalCost.partsCost.toLocaleString("vi-VN")} VNĐ
                    </span>
                  </p>
                  <p className="text-white font-bold text-base mt-1">
                    Tổng chi phí dự kiến:{" "}
                    {totalCost.total.toLocaleString("vi-VN")} VNĐ
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    (Chưa bao gồm dịch vụ đã đặt trước)
                  </p>
                </div>
              </div>
            </div>

            {/* External Parts Note - Large text area for technician notes about external parts */}
            <div className="bg-amber-50 rounded-lg p-4 border-2 border-amber-300">
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-md font-semibold text-amber-900">
                  Ghi chú về linh kiện đặt ngoài
                </h4>
                <span className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded">
                  (Dành cho linh kiện không có sẵn trong kho)
                </span>
              </div>
              <textarea
                value={formData.specialInstructions.fromStaff || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    specialInstructions: {
                      ...prev.specialInstructions,
                      fromStaff: e.target.value,
                    },
                  }))
                }
                rows={4}
                className="block w-full rounded-md bg-white text-gray-900 border-amber-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 text-sm"
                placeholder="Ví dụ: Cần đặt ngoài linh kiện pin lithium 72V 100Ah từ nhà cung cấp ABC. Khách hàng đồng ý để xe lại. Dự kiến giao hàng 3-5 ngày..."
              />
              <p className="mt-2 text-xs text-amber-700">
                💡 Ghi rõ: tên linh kiện cần đặt, lý do, thời gian dự kiến, và
                xác nhận khách đồng ý để xe
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-dark-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-dark-300 mb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <div>
            <h2 className="text-xl font-bold text-white">
              Tạo Phiếu Tiếp Nhận Dịch Vụ
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Lịch hẹn #{appointment.appointmentNumber} -{" "}
              {appointment.customerId.firstName}{" "}
              {appointment.customerId.lastName}
            </p>
            <p className="text-sm text-text-secondary">
              Xe: {appointment.vehicleId.year} {appointment.vehicleId.make}{" "}
              {appointment.vehicleId.model} (
              {appointment.vehicleId.licensePlate})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-secondary"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm text-text-muted ${
                    step <= currentStep
                      ? "bg-lime-600 text-dark-900"
                      : "bg-dark-200 text-text-secondary"
                  }`}
                >
                  {step}
                </div>
                {step < 4 && (
                  <div
                    className={`h-1 w-24 ${
                      step < currentStep ? "bg-lime-600" : "bg-dark-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-text-secondary">
            <span>EV Checklist</span>
            <span>Đồ đạc</span>
            <span>Dịch vụ đề xuất</span>
            <span>Yêu cầu phụ tùng</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-96 mb-6">{renderStepContent()}</div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="px-4 py-2 text-sm text-text-muted text-text-secondary bg-dark-300 border border-dark-200 rounded-md hover:bg-dark-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Quay lại
          </button>

          <div className="flex space-x-3">
            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 text-sm text-dark-900 bg-lime-600 rounded-md hover:bg-dark-9000 hover:text-dark-900 transition-all duration-200 transform hover:scale-105"
              >
                Tiếp theo
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-6 py-2 text-sm text-text-muted text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isLoading ? (
                  <>
                    <ClockIcon className="w-4 h-4 mr-2 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-4 h-4 mr-2" />
                    Tạo phiếu tiếp nhận
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceReceptionModal;
