import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  PhotoIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';
import { DetailedAppointmentStatus } from '../../types/appointment';
import { servicesAPI, partsAPI } from '../../services/api';

interface VehicleCondition {
  exterior: {
    condition: 'excellent' | 'good' | 'fair' | 'poor';
    damages: Array<{
      location: string;
      type: 'scratch' | 'dent' | 'crack' | 'rust' | 'paint_damage' | 'missing_part';
      severity: 'minor' | 'moderate' | 'major';
      description: string;
    }>;
    notes: string;
  };
  interior: {
    condition: 'excellent' | 'good' | 'fair' | 'poor';
    cleanliness: 'very_clean' | 'clean' | 'moderate' | 'dirty' | 'very_dirty';
    damages: Array<{
      location: string;
      type: 'stain' | 'tear' | 'wear' | 'burn' | 'missing_part';
      description: string;
    }>;
    notes: string;
  };
  battery: {
    level: number;
    health: 'excellent' | 'good' | 'fair' | 'poor' | 'replace_soon';
    temperature?: number;
    chargingStatus: 'not_charging' | 'charging' | 'fully_charged' | 'error';
    notes: string;
  };
  mileage: {
    current: number;
    lastService?: number;
    mileageSinceLastService?: number;
  };
}

interface ServiceReceptionData {
  vehicleCondition: VehicleCondition;
  customerItems: Array<{
    item: string;
    location: string;
    value?: number;
    notes: string;
  }>;
  specialInstructions: {
    fromCustomer: string;
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
    estimatedDuration?: number;
  }>;
  requestedParts: Array<{
    partId: string;
    partName: string;
    partNumber?: string;
    quantity: number;
    reason: string;
    estimatedCost?: number;
    isAvailable?: boolean;
    availableQuantity?: number;
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
  isLoading = false
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ServiceReceptionData>({
    vehicleCondition: {
      exterior: {
        condition: 'good',
        damages: [],
        notes: ''
      },
      interior: {
        condition: 'good',
        cleanliness: 'clean',
        damages: [],
        notes: ''
      },
      battery: {
        level: 80,
        health: 'good',
        chargingStatus: 'not_charging',
        notes: ''
      },
      mileage: {
        current: 0
      }
    },
    customerItems: [],
    specialInstructions: {
      fromCustomer: '',
      safetyPrecautions: [],
      warningNotes: []
    },
    estimatedServiceTime: 120,
    recommendedServices: [],
    requestedParts: []
  });

  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [availableParts, setAvailableParts] = useState<any[]>([]);
  const [loadingParts, setLoadingParts] = useState(false);

  // Calculate totals
  // NOTE: Initial booked service is NOT included - it's already paid
  // Only calculate recommended services + parts
  const calculateTotals = () => {
    let totalTime = 0;
    let totalCost = 0;

    // Add time and cost from recommended services (discovered during inspection)
    formData.recommendedServices.forEach(service => {
      const serviceData = availableServices.find(s => s._id === service.serviceId);
      if (serviceData) {
        totalTime += (service.estimatedDuration || serviceData.estimatedDuration) * service.quantity;
        totalCost += (service.estimatedCost || serviceData.basePrice) * service.quantity;
      }
    });

    // Add cost from requested parts
    formData.requestedParts.forEach(part => {
      const partData = availableParts.find(p => p._id === part.partId);
      if (partData) {
        totalCost += (part.estimatedCost || partData.pricing?.retail || 0) * part.quantity;
      }
    });

    return { totalTime, totalCost };
  };

  const { totalTime, totalCost } = calculateTotals();

  // Load available services from API
  useEffect(() => {
    const loadServices = async () => {
      try {
        setLoadingServices(true);
        const response = await servicesAPI.getAll();
        setAvailableServices(response.data.data || []);
      } catch (error) {
        console.error('Error loading services:', error);
      } finally {
        setLoadingServices(false);
      }
    };

    if (isOpen) {
      loadServices();
    }
  }, [isOpen]);

  // Load available parts from API
  useEffect(() => {
    const loadParts = async () => {
      try {
        setLoadingParts(true);
        const response = await partsAPI.getAll();
        setAvailableParts(response.data.data || []);
      } catch (error) {
        console.error('Error loading parts:', error);
      } finally {
        setLoadingParts(false);
      }
    };

    if (isOpen) {
      loadParts();
    }
  }, [isOpen]);

  const totalSteps = 5;

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
      estimatedServiceTime: totalTime
    };
    await onSubmit(updatedFormData);
  };

  const addCustomerItem = () => {
    setFormData(prev => ({
      ...prev,
      customerItems: [...prev.customerItems, { item: '', location: '', notes: '' }]
    }));
  };

  const removeCustomerItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      customerItems: prev.customerItems.filter((_, i) => i !== index)
    }));
  };

  const addDamage = (section: 'exterior' | 'interior') => {
    const newDamage = section === 'exterior'
      ? { location: '', type: 'scratch' as const, severity: 'minor' as const, description: '' }
      : { location: '', type: 'stain' as const, description: '' };

    setFormData(prev => ({
      ...prev,
      vehicleCondition: {
        ...prev.vehicleCondition,
        [section]: {
          ...prev.vehicleCondition[section],
          damages: [...prev.vehicleCondition[section].damages, newDamage]
        }
      }
    }));
  };

  const removeDamage = (section: 'exterior' | 'interior', index: number) => {
    setFormData(prev => ({
      ...prev,
      vehicleCondition: {
        ...prev.vehicleCondition,
        [section]: {
          ...prev.vehicleCondition[section],
          damages: prev.vehicleCondition[section].damages.filter((_, i) => i !== index)
        }
      }
    }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Thông tin xe - Ngoại thất</h3>

            {/* Exterior Condition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tình trạng ngoại thất
              </label>
              <select
                value={formData.vehicleCondition.exterior.condition}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  vehicleCondition: {
                    ...prev.vehicleCondition,
                    exterior: {
                      ...prev.vehicleCondition.exterior,
                      condition: e.target.value as any
                    }
                  }
                }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="excellent">Xuất sắc</option>
                <option value="good">Tốt</option>
                <option value="fair">Trung bình</option>
                <option value="poor">Kém</option>
              </select>
            </div>

            {/* Exterior Damages */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Hỏng hóc ngoại thất
                </label>
                <button
                  onClick={() => addDamage('exterior')}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Thêm hỏng hóc
                </button>
              </div>

              {formData.vehicleCondition.exterior.damages.map((damage, index) => (
                <div key={index} className="border rounded-lg p-4 mb-3 bg-gray-50">
                  <div className="grid grid-cols-2 gap-4 mb-2">
                    <input
                      type="text"
                      placeholder="Vị trí (VD: Cửa trước bên trái)"
                      value={damage.location}
                      onChange={(e) => {
                        const newDamages = [...formData.vehicleCondition.exterior.damages];
                        newDamages[index] = { ...damage, location: e.target.value };
                        setFormData(prev => ({
                          ...prev,
                          vehicleCondition: {
                            ...prev.vehicleCondition,
                            exterior: {
                              ...prev.vehicleCondition.exterior,
                              damages: newDamages
                            }
                          }
                        }));
                      }}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    />
                    <select
                      value={damage.type}
                      onChange={(e) => {
                        const newDamages = [...formData.vehicleCondition.exterior.damages];
                        newDamages[index] = { ...damage, type: e.target.value as any };
                        setFormData(prev => ({
                          ...prev,
                          vehicleCondition: {
                            ...prev.vehicleCondition,
                            exterior: {
                              ...prev.vehicleCondition.exterior,
                              damages: newDamages
                            }
                          }
                        }));
                      }}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    >
                      <option value="scratch">Trầy xước</option>
                      <option value="dent">Móp méo</option>
                      <option value="crack">Nứt</option>
                      <option value="rust">Rỉ sét</option>
                      <option value="paint_damage">Hỏng sơn</option>
                      <option value="missing_part">Thiếu bộ phận</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-2">
                    <select
                      value={damage.severity}
                      onChange={(e) => {
                        const newDamages = [...formData.vehicleCondition.exterior.damages];
                        newDamages[index] = { ...damage, severity: e.target.value as any };
                        setFormData(prev => ({
                          ...prev,
                          vehicleCondition: {
                            ...prev.vehicleCondition,
                            exterior: {
                              ...prev.vehicleCondition.exterior,
                              damages: newDamages
                            }
                          }
                        }));
                      }}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    >
                      <option value="minor">Nhỏ</option>
                      <option value="moderate">Trung bình</option>
                      <option value="major">Lớn</option>
                    </select>
                    <button
                      onClick={() => removeDamage('exterior', index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Xóa
                    </button>
                  </div>

                  <textarea
                    placeholder="Mô tả chi tiết..."
                    value={damage.description}
                    onChange={(e) => {
                      const newDamages = [...formData.vehicleCondition.exterior.damages];
                      newDamages[index] = { ...damage, description: e.target.value };
                      setFormData(prev => ({
                        ...prev,
                        vehicleCondition: {
                          ...prev.vehicleCondition,
                          exterior: {
                            ...prev.vehicleCondition.exterior,
                            damages: newDamages
                          }
                        }
                      }));
                    }}
                    rows={2}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  />
                </div>
              ))}
            </div>

            {/* Exterior Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ghi chú ngoại thất
              </label>
              <textarea
                value={formData.vehicleCondition.exterior.notes}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  vehicleCondition: {
                    ...prev.vehicleCondition,
                    exterior: {
                      ...prev.vehicleCondition.exterior,
                      notes: e.target.value
                    }
                  }
                }))}
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Ghi chú thêm về tình trạng ngoại thất..."
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Thông tin xe - Nội thất & Pin</h3>

            {/* Interior Condition */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tình trạng nội thất
                </label>
                <select
                  value={formData.vehicleCondition.interior.condition}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    vehicleCondition: {
                      ...prev.vehicleCondition,
                      interior: {
                        ...prev.vehicleCondition.interior,
                        condition: e.target.value as any
                      }
                    }
                  }))}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="excellent">Xuất sắc</option>
                  <option value="good">Tốt</option>
                  <option value="fair">Trung bình</option>
                  <option value="poor">Kém</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Độ sạch sẽ
                </label>
                <select
                  value={formData.vehicleCondition.interior.cleanliness}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    vehicleCondition: {
                      ...prev.vehicleCondition,
                      interior: {
                        ...prev.vehicleCondition.interior,
                        cleanliness: e.target.value as any
                      }
                    }
                  }))}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="very_clean">Rất sạch</option>
                  <option value="clean">Sạch</option>
                  <option value="moderate">Trung bình</option>
                  <option value="dirty">Bẩn</option>
                  <option value="very_dirty">Rất bẩn</option>
                </select>
              </div>
            </div>

            {/* Battery Information */}
            <div className="border-t pt-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">Thông tin Pin</h4>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mức pin (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.vehicleCondition.battery.level}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      vehicleCondition: {
                        ...prev.vehicleCondition,
                        battery: {
                          ...prev.vehicleCondition.battery,
                          level: parseInt(e.target.value) || 0
                        }
                      }
                    }))}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tình trạng pin
                  </label>
                  <select
                    value={formData.vehicleCondition.battery.health}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      vehicleCondition: {
                        ...prev.vehicleCondition,
                        battery: {
                          ...prev.vehicleCondition.battery,
                          health: e.target.value as any
                        }
                      }
                    }))}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="excellent">Xuất sắc</option>
                    <option value="good">Tốt</option>
                    <option value="fair">Trung bình</option>
                    <option value="poor">Kém</option>
                    <option value="replace_soon">Cần thay sớm</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trạng thái sạc
                  </label>
                  <select
                    value={formData.vehicleCondition.battery.chargingStatus}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      vehicleCondition: {
                        ...prev.vehicleCondition,
                        battery: {
                          ...prev.vehicleCondition.battery,
                          chargingStatus: e.target.value as any
                        }
                      }
                    }))}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="not_charging">Không sạc</option>
                    <option value="charging">Đang sạc</option>
                    <option value="fully_charged">Đã sạc đầy</option>
                    <option value="error">Lỗi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số km hiện tại
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.vehicleCondition.mileage.current}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      vehicleCondition: {
                        ...prev.vehicleCondition,
                        mileage: {
                          ...prev.vehicleCondition.mileage,
                          current: parseInt(e.target.value) || 0
                        }
                      }
                    }))}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="VD: 25000"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ghi chú về pin
                </label>
                <textarea
                  value={formData.vehicleCondition.battery.notes}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    vehicleCondition: {
                      ...prev.vehicleCondition,
                      battery: {
                        ...prev.vehicleCondition.battery,
                        notes: e.target.value
                      }
                    }
                  }))}
                  rows={2}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Ghi chú thêm về tình trạng pin..."
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Đồ đạc khách hàng</h3>

            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">Ghi nhận các đồ đạc cá nhân của khách hàng để trong xe</p>
                <button
                  onClick={addCustomerItem}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Thêm đồ đạc
                </button>
              </div>

              {formData.customerItems.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500">Chưa có đồ đạc nào được ghi nhận</p>
                  <button
                    onClick={addCustomerItem}
                    className="mt-2 text-blue-600 hover:text-blue-700"
                  >
                    Thêm đồ đạc đầu tiên
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.customerItems.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <input
                          type="text"
                          placeholder="Tên đồ vật (VD: Laptop, Điện thoại)"
                          value={item.item}
                          onChange={(e) => {
                            const newItems = [...formData.customerItems];
                            newItems[index] = { ...item, item: e.target.value };
                            setFormData(prev => ({ ...prev, customerItems: newItems }));
                          }}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Vị trí (VD: Ghế sau, Cốp xe)"
                          value={item.location}
                          onChange={(e) => {
                            const newItems = [...formData.customerItems];
                            newItems[index] = { ...item, location: e.target.value };
                            setFormData(prev => ({ ...prev, customerItems: newItems }));
                          }}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <input
                          type="number"
                          placeholder="Giá trị (VND)"
                          value={item.value || ''}
                          onChange={(e) => {
                            const newItems = [...formData.customerItems];
                            newItems[index] = { ...item, value: parseFloat(e.target.value) || undefined };
                            setFormData(prev => ({ ...prev, customerItems: newItems }));
                          }}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
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
                          setFormData(prev => ({ ...prev, customerItems: newItems }));
                        }}
                        rows={2}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Dịch vụ đề xuất sau kiểm tra</h3>

            {/* Service Summary */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-md font-medium text-gray-900 mb-3">Dịch vụ đã đặt</h4>
              <div className="space-y-2">
                {appointment.services.map((service, index) => {
                  const price = service.serviceId.basePrice ||
                    availableServices.find(s => s._id === service.serviceId._id)?.basePrice || 0;
                  const totalServicePrice = price * service.quantity;
                  return (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span>{service.serviceId.name} {service.quantity > 1 ? `(${service.quantity})` : ''}</span>
                      <div className="text-right">
                        <div className="text-gray-600">{service.serviceId.estimatedDuration * service.quantity} phút</div>
                        <div className="text-blue-600 font-medium">{totalServicePrice.toLocaleString('vi-VN')} VNĐ</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Tổng thời gian dịch vụ đã đặt:</span>
                  <span>{appointment.services.reduce((total, service) => total + (service.serviceId.estimatedDuration * service.quantity), 0)} phút</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="font-medium">Tổng chi phí dịch vụ đã đặt:</span>
                  <span className="text-blue-600 font-semibold">
                    {appointment.services.reduce((total, service) => {
                      const price = service.serviceId.basePrice ||
                        availableServices.find(s => s._id === service.serviceId._id)?.basePrice || 0;
                      return total + (price * service.quantity);
                    }, 0).toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>
              </div>
            </div>

            {/* Additional Services */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900">Dịch vụ đề xuất cần thực hiện</h4>
                <button
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    recommendedServices: [...prev.recommendedServices, {
                      serviceId: '',
                      serviceName: '',
                      quantity: 1,
                      reason: '',
                      estimatedCost: 0
                    }]
                  }))}
                  disabled={loadingServices}
                  className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingServices ? 'Đang tải...' : '+ Thêm dịch vụ'}
                </button>
              </div>

              {formData.recommendedServices.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500">Chưa có dịch vụ bổ sung nào</p>
                  <button
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      recommendedServices: [...prev.recommendedServices, {
                        serviceId: '',
                        serviceName: '',
                        quantity: 1,
                        reason: '',
                        estimatedCost: 0
                      }]
                    }))}
                    disabled={loadingServices}
                    className="mt-2 text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingServices ? 'Đang tải dịch vụ...' : 'Thêm dịch vụ đầu tiên'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.recommendedServices.map((service, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <select
                          value={service.serviceId}
                          onChange={(e) => {
                            const selectedService = availableServices.find(s => s._id === e.target.value);
                            const newServices = [...formData.recommendedServices];
                            newServices[index] = {
                              ...service,
                              serviceId: e.target.value,
                              serviceName: selectedService?.name || '',
                              estimatedCost: selectedService?.basePrice || 0
                            };
                            setFormData(prev => ({ ...prev, recommendedServices: newServices }));
                          }}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          disabled={loadingServices}
                        >
                          <option value="">Chọn dịch vụ...</option>
                          {availableServices.map((availableService) => (
                            <option key={availableService._id} value={availableService._id}>
                              {availableService.name} - {availableService.basePrice?.toLocaleString('vi-VN')} VNĐ
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="1"
                          placeholder="Số lượng"
                          value={service.quantity}
                          onChange={(e) => {
                            const newServices = [...formData.recommendedServices];
                            newServices[index] = { ...service, quantity: parseInt(e.target.value) || 1 };
                            setFormData(prev => ({ ...prev, recommendedServices: newServices }));
                          }}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        />
                        <button
                          onClick={() => {
                            const newServices = formData.recommendedServices.filter((_, i) => i !== index);
                            setFormData(prev => ({ ...prev, recommendedServices: newServices }));
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
                            const newServices = [...formData.recommendedServices];
                            newServices[index] = { ...service, reason: e.target.value };
                            setFormData(prev => ({ ...prev, recommendedServices: newServices }));
                          }}
                          rows={2}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        />
                      </div>

                      {(service.estimatedCost || 0) > 0 && (
                        <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                          <span className="font-medium">Giá dịch vụ: </span>
                          <span className="text-blue-700 font-semibold">
                            {(service.estimatedCost || 0).toLocaleString('vi-VN')} VNĐ
                          </span>
                          <span className="text-gray-500 ml-2">
                            (Tổng: {((service.estimatedCost || 0) * service.quantity).toLocaleString('vi-VN')} VNĐ)
                          </span>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thời gian dự kiến (phút) - Tự động tính
                </label>
                <input
                  type="number"
                  value={totalTime}
                  readOnly
                  className="block w-full rounded-md border-gray-300 shadow-sm bg-gray-50 text-gray-700 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Bao gồm thời gian của tất cả dịch vụ đã đặt và bổ sung
                </p>
              </div>

            </div>

            {/* Special Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yêu cầu từ khách hàng
              </label>
              <textarea
                value={formData.specialInstructions.fromCustomer}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  specialInstructions: {
                    ...prev.specialInstructions,
                    fromCustomer: e.target.value
                  }
                }))}
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Ghi chú các yêu cầu đặc biệt từ khách hàng..."
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Yêu cầu phụ tùng</h3>

            {/* Part Request Management */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900">Phụ tùng cần thiết</h4>
                <button
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    requestedParts: [...prev.requestedParts, {
                      partId: '',
                      partName: '',
                      partNumber: '',
                      quantity: 1,
                      reason: '',
                      estimatedCost: 0,
                      isAvailable: undefined,
                      availableQuantity: undefined
                    }]
                  }))}
                  disabled={loadingParts}
                  className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingParts ? 'Đang tải...' : '+ Thêm phụ tùng'}
                </button>
              </div>

              {formData.requestedParts.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500">Chưa có yêu cầu phụ tùng nào</p>
                  <button
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      requestedParts: [...prev.requestedParts, {
                        partId: '',
                        partName: '',
                        partNumber: '',
                        quantity: 1,
                        reason: '',
                        estimatedCost: 0,
                        isAvailable: undefined,
                        availableQuantity: undefined
                      }]
                    }))}
                    disabled={loadingParts}
                    className="mt-2 text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingParts ? 'Đang tải phụ tùng...' : 'Thêm yêu cầu đầu tiên'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.requestedParts.map((part, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="col-span-2">
                          <select
                            value={part.partId}
                            onChange={(e) => {
                              const selectedPart = availableParts.find(p => p._id === e.target.value);
                              const newParts = [...formData.requestedParts];
                              newParts[index] = {
                                ...part,
                                partId: e.target.value,
                                partName: selectedPart?.name || '',
                                partNumber: selectedPart?.partNumber || '',
                                estimatedCost: selectedPart?.pricing?.retail || 0,
                                isAvailable: (selectedPart?.inventory?.currentStock || 0) > 0,
                                availableQuantity: selectedPart?.inventory?.currentStock || 0
                              };
                              setFormData(prev => ({ ...prev, requestedParts: newParts }));
                            }}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                            disabled={loadingParts}
                          >
                            <option value="">Chọn phụ tùng...</option>
                            {availableParts.map((availablePart) => (
                              <option key={availablePart._id} value={availablePart._id}>
                                {availablePart.name} ({availablePart.partNumber}) - {availablePart.pricing?.retail?.toLocaleString('vi-VN')} VNĐ
                                {(availablePart.inventory?.currentStock || 0) > 0 ? ` - Có sẵn: ${availablePart.inventory?.currentStock}` : ' - Hết hàng'}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => {
                            const newParts = formData.requestedParts.filter((_, i) => i !== index);
                            setFormData(prev => ({ ...prev, requestedParts: newParts }));
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
                            newParts[index] = { ...part, quantity: parseInt(e.target.value) || 1 };
                            setFormData(prev => ({ ...prev, requestedParts: newParts }));
                          }}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        />
                      </div>

                      {part.partId && (part.estimatedCost || 0) > 0 && (
                        <div className="mb-3 text-sm bg-blue-50 p-3 rounded">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="font-medium text-gray-700">Giá: </span>
                              <span className="text-blue-700 font-semibold">
                                {(part.estimatedCost || 0).toLocaleString('vi-VN')} VNĐ
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Tồn kho: </span>
                              <span className={`font-semibold ${part.isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                                {part.availableQuantity || 0}
                              </span>
                            </div>
                          </div>
                          <div className="mt-2">
                            <span className="font-medium text-gray-700">Tổng giá: </span>
                            <span className="text-green-600 font-semibold">
                              {((part.estimatedCost || 0) * part.quantity).toLocaleString('vi-VN')} VNĐ
                            </span>
                            {!part.isAvailable && (
                              <span className="ml-2 text-red-600 text-xs">
                                ⚠️ Phụ tùng hiện tại hết hàng
                              </span>
                            )}
                            {part.isAvailable && part.quantity > (part.availableQuantity || 0) && (
                              <span className="ml-2 text-orange-600 text-xs">
                                ⚠️ Yêu cầu {part.quantity} nhưng chỉ còn {part.availableQuantity || 0}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div>
                        <textarea
                          placeholder="Lý do cần thiết cho phụ tùng này..."
                          value={part.reason}
                          onChange={(e) => {
                            const newParts = [...formData.requestedParts];
                            newParts[index] = { ...part, reason: e.target.value };
                            setFormData(prev => ({ ...prev, requestedParts: newParts }));
                          }}
                          rows={2}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="text-md font-medium text-gray-900 mb-2">Tóm tắt</h4>
              <div className="text-sm text-gray-700 space-y-1">
                <p>• Dịch vụ đã đặt: {appointment.services.length} dịch vụ
                  <span className="ml-2 text-blue-600 font-medium">
                    ({appointment.services.reduce((total, service) => {
                      const price = service.serviceId.basePrice ||
                        availableServices.find(s => s._id === service.serviceId._id)?.basePrice || 0;
                      return total + (price * service.quantity);
                    }, 0).toLocaleString('vi-VN')} VNĐ)
                  </span>
                </p>
                <p>• Dịch vụ đề xuất: {formData.recommendedServices.length} dịch vụ
                  {formData.recommendedServices.length > 0 && (
                    <span className="ml-2 text-blue-600 font-medium">
                      ({formData.recommendedServices.reduce((total, service) =>
                        total + ((service.estimatedCost || 0) * service.quantity), 0
                      ).toLocaleString('vi-VN')} VNĐ)
                    </span>
                  )}
                </p>
                <p>• Phụ tùng yêu cầu: {formData.requestedParts.length} phụ tùng
                  {formData.requestedParts.length > 0 && (
                    <span className="ml-2 text-blue-600 font-medium">
                      ({formData.requestedParts.reduce((total, part) =>
                        total + ((part.estimatedCost || 0) * part.quantity), 0
                      ).toLocaleString('vi-VN')} VNĐ)
                    </span>
                  )}
                </p>
                <p>• Tổng thời gian dự kiến: {totalTime} phút</p>
                {(formData.recommendedServices.length > 0 || formData.requestedParts.length > 0) && (
                  <div className="pt-2 mt-2 border-t border-green-200">
                    <p className="font-semibold text-green-700">
                      • Tổng chi phí ước tính: {totalCost.toLocaleString('vi-VN')} VNĐ (chưa bao gồm VAT)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white mb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Tạo Phiếu Tiếp Nhận Dịch Vụ
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Lịch hẹn #{appointment.appointmentNumber} - {appointment.customerId.firstName} {appointment.customerId.lastName}
            </p>
            <p className="text-sm text-gray-600">
              Xe: {appointment.vehicleId.year} {appointment.vehicleId.make} {appointment.vehicleId.model} ({appointment.vehicleId.licensePlate})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 5 && (
                  <div className={`h-1 w-16 ${
                    step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>Ngoại thất</span>
            <span>Nội thất & Pin</span>
            <span>Đồ đạc</span>
            <span>Dịch vụ đề xuất</span>
            <span>Yêu cầu phụ tùng</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-96 mb-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Quay lại
          </button>

          <div className="flex space-x-3">
            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Tiếp theo
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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