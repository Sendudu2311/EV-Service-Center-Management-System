import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createServiceReception, getAppointmentDetail } from '../services/technician.api';
import api from '../services/api';
import type {
  Appointment,
  CustomerItem,
  EVChecklistItem,
  RecommendedService,
  RequestedPart,
  SpecialInstructions,
  TechnicianStackParamList,
} from '../types/technician.types';

type RouteParams = RouteProp<TechnicianStackParamList, 'ServiceReceptionCreate'>;
type NavigationProp = NativeStackNavigationProp<TechnicianStackParamList, 'ServiceReceptionCreate'>;

const ServiceReceptionCreateScreen: React.FC = () => {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const { appointmentId, rejectedReceptionId } = route.params;

  // State
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Form data
  const [evChecklistItems, setEvChecklistItems] = useState<EVChecklistItem[]>([]);
  const [customerItems, setCustomerItems] = useState<CustomerItem[]>([]);
  const [recommendedServices, setRecommendedServices] = useState<RecommendedService[]>([]);
  const [requestedParts, setRequestedParts] = useState<RequestedPart[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState<SpecialInstructions>({});
  const [estimatedServiceTime, setEstimatedServiceTime] = useState<number>(120);

  // Available services and parts
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [availableParts, setAvailableParts] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingParts, setLoadingParts] = useState(false);

  // Picker modals
  const [servicePickerVisible, setServicePickerVisible] = useState(false);
  const [partPickerVisible, setPartPickerVisible] = useState(false);
  const [currentEditingIndex, setCurrentEditingIndex] = useState<number | null>(null);

  // Fetch appointment data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getAppointmentDetail(appointmentId);
        if (response.success) {
          setAppointment(response.data);
        }
      } catch (error: any) {
        Alert.alert('Lỗi', 'Không thể tải thông tin lịch hẹn');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [appointmentId]);

  // Load rejected reception data to pre-fill form
  useEffect(() => {
    if (!rejectedReceptionId) return;

    const loadRejectedReception = async () => {
      try {
        const response = await api.get(`/api/service-receptions/${rejectedReceptionId}`);
        const rejectedReception = response.data.data;

        // Pre-fill form with rejected reception data
        if (rejectedReception.evChecklistItems) {
          setEvChecklistItems(rejectedReception.evChecklistItems);
        }
        if (rejectedReception.customerItems) {
          setCustomerItems(rejectedReception.customerItems);
        }
        if (rejectedReception.recommendedServices) {
          setRecommendedServices(rejectedReception.recommendedServices.map((s: any) => ({
            serviceId: s.serviceId._id || s.serviceId,
            serviceName: s.serviceId.name || s.serviceName,
            category: s.category,
            quantity: s.quantity,
            reason: s.reason,
            discoveredDuring: s.discoveredDuring,
            estimatedCost: s.estimatedCost,
            estimatedDuration: s.estimatedDuration,
          })));
        }
        if (rejectedReception.requestedParts) {
          setRequestedParts(rejectedReception.requestedParts.map((p: any) => ({
            partId: p.partId._id || p.partId,
            partName: p.partId.name || p.partName,
            partNumber: p.partNumber,
            quantity: p.quantity,
            reason: p.reason,
            estimatedCost: p.estimatedCost,
          })));
        }
        if (rejectedReception.specialInstructions) {
          setSpecialInstructions(rejectedReception.specialInstructions);
        }
        if (rejectedReception.estimatedServiceTime) {
          setEstimatedServiceTime(rejectedReception.estimatedServiceTime);
        }

        Alert.alert(
          'Đã tải dữ liệu từ phiếu bị từ chối',
          'Bạn có thể chỉnh sửa và gửi lại phiếu mới.'
        );
      } catch (error: any) {
        console.error('Error loading rejected reception:', error);
        Alert.alert('Cảnh báo', 'Không thể tải dữ liệu từ phiếu bị từ chối');
      }
    };

    loadRejectedReception();
  }, [rejectedReceptionId]);

  // Load available services
  useEffect(() => {
    const loadServices = async () => {
      try {
        setLoadingServices(true);
        const response = await api.get('/api/services');
        setAvailableServices(response.data.data || []);
      } catch (error) {
        console.error('Error loading services:', error);
      } finally {
        setLoadingServices(false);
      }
    };
    loadServices();
  }, []);

  // Load available parts
  useEffect(() => {
    const loadParts = async () => {
      try {
        setLoadingParts(true);
        const response = await api.get('/api/parts');
        setAvailableParts(response.data.data || []);
      } catch (error) {
        console.error('Error loading parts:', error);
      } finally {
        setLoadingParts(false);
      }
    };
    loadParts();
  }, []);

  // Initialize default checklist items
  useEffect(() => {
    if (evChecklistItems.length === 0) {
      const defaultChecklist: EVChecklistItem[] = [
        // Battery items
        { id: 'b1', label: 'Kiểm tra mức pin', category: 'battery', checked: true, status: 'good', notes: '' },
        { id: 'b2', label: 'Kiểm tra sức khỏe pin', category: 'battery', checked: true, status: 'good', notes: '' },
        { id: 'b3', label: 'Kiểm tra nhiệt độ pin', category: 'battery', checked: true, status: 'good', notes: '' },
        { id: 'b4', label: 'Kiểm tra chu kỳ sạc', category: 'battery', checked: true, status: 'good', notes: '' },
        // Charging items
        { id: 'c1', label: 'Kiểm tra cổng sạc', category: 'charging', checked: true, status: 'good', notes: '' },
        { id: 'c2', label: 'Kiểm tra dây sạc', category: 'charging', checked: true, status: 'good', notes: '' },
        { id: 'c3', label: 'Kiểm tra hệ thống sạc nhanh', category: 'charging', checked: true, status: 'good', notes: '' },
        // Motor items
        { id: 'm1', label: 'Kiểm tra động cơ điện', category: 'motor', checked: true, status: 'good', notes: '' },
        { id: 'm2', label: 'Kiểm tra hệ thống truyền động', category: 'motor', checked: true, status: 'good', notes: '' },
        { id: 'm3', label: 'Kiểm tra tiếng động bất thường', category: 'motor', checked: true, status: 'good', notes: '' },
        // Safety items
        { id: 's1', label: 'Kiểm tra hệ thống phanh', category: 'safety', checked: true, status: 'good', notes: '' },
        { id: 's2', label: 'Kiểm tra đèn báo an toàn', category: 'safety', checked: true, status: 'good', notes: '' },
        { id: 's3', label: 'Kiểm tra túi khí', category: 'safety', checked: true, status: 'good', notes: '' },
        // General items
        { id: 'g1', label: 'Kiểm tra hệ thống điều hòa', category: 'general', checked: true, status: 'good', notes: '' },
        { id: 'g2', label: 'Kiểm tra hệ thống giải trí', category: 'general', checked: true, status: 'good', notes: '' },
        { id: 'g3', label: 'Kiểm tra màn hình hiển thị', category: 'general', checked: true, status: 'good', notes: '' },
      ];
      setEvChecklistItems(defaultChecklist);
    }
  }, []);

  // Calculate totals
  const calculateTotals = () => {
    let totalTime = 0;
    let totalCost = 0;

    recommendedServices.forEach((service) => {
      totalTime += (service.estimatedDuration || 60) * service.quantity;
      totalCost += (service.estimatedCost || 0) * service.quantity;
    });

    requestedParts.forEach((part) => {
      totalCost += (part.estimatedCost || 0) * part.quantity;
    });

    return { totalTime, totalCost };
  };

  const { totalTime, totalCost } = calculateTotals();

  // Handle save reception
  const handleSaveReception = async () => {
    try {
      setIsSaving(true);

      // Calculate estimated service time in minutes
      const serviceTimeMinutes = estimatedServiceTime || totalTime || 120;
      const completionTime = new Date(Date.now() + serviceTimeMinutes * 60 * 1000).toISOString();

      const receptionData = {
        appointmentId,
        evChecklistItems,
        vehicleCondition: {}, // Simplified for now
        customerItems: customerItems.length > 0 ? customerItems : undefined,
        specialInstructions: Object.keys(specialInstructions).length > 0 ? specialInstructions : undefined,
        estimatedServiceTime: serviceTimeMinutes,
        estimatedCompletionTime: completionTime,
        recommendedServices: recommendedServices.map(s => ({
          serviceId: s.serviceId,
          serviceName: s.serviceName,
          category: s.category || 'general',
          quantity: s.quantity,
          reason: s.reason,
          discoveredDuring: s.discoveredDuring || 'initial_inspection',
          estimatedCost: s.estimatedCost || 0,
          estimatedPrice: s.estimatedCost || 0,
          estimatedDuration: s.estimatedDuration || 60,
        })),
        requestedParts: requestedParts.map(p => ({
          partId: p.partId,
          partName: p.partName,
          partNumber: p.partNumber || '',
          quantity: p.quantity,
          reason: p.reason,
          estimatedCost: p.estimatedCost || 0,
        })),
        preServicePhotos: [],
        diagnosticCodes: [],
      };

      const response = await createServiceReception(appointmentId, receptionData);

      if (response.success) {
        Alert.alert(
          'Thành công',
          'Đã tạo phiếu tiếp nhận. Phiếu đã được gửi cho nhân viên duyệt.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error: any) {
      console.error('Error creating reception:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tạo phiếu tiếp nhận');
    } finally {
      setIsSaving(false);
    }
  };

  // Navigation handlers
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

  // Add/Remove handlers
  const addCustomerItem = () => {
    setCustomerItems([...customerItems, { item: '', location: '', notes: '' }]);
  };

  const removeCustomerItem = (index: number) => {
    setCustomerItems(customerItems.filter((_, i) => i !== index));
  };

  const addRecommendedService = () => {
    setRecommendedServices([
      ...recommendedServices,
      {
        serviceId: '',
        serviceName: '',
        category: '',
        quantity: 1,
        reason: '',
        estimatedCost: 0,
        estimatedDuration: 60,
        discoveredDuring: 'initial_inspection',
      },
    ]);
  };

  const removeRecommendedService = (index: number) => {
    setRecommendedServices(recommendedServices.filter((_, i) => i !== index));
  };

  const addRequestedPart = () => {
    setRequestedParts([
      ...requestedParts,
      {
        partId: '',
        partName: '',
        partNumber: '',
        quantity: 1,
        reason: '',
        estimatedCost: 0,
      },
    ]);
  };

  const removeRequestedPart = (index: number) => {
    setRequestedParts(requestedParts.filter((_, i) => i !== index));
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  // Render Step 1: EV Checklist
  const renderStep1 = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.stepTitle}>🔋 EV Checklist</Text>
      <Text style={styles.stepSubtitle}>Kiểm tra các hạng mục xe điện</Text>

      {(['battery', 'charging', 'motor', 'safety', 'general'] as const).map((category) => {
        const categoryItems = evChecklistItems.filter((item) => item.category === category);
        if (categoryItems.length === 0) return null;

        return (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>
              {category === 'battery' && '🔋 Pin'}
              {category === 'charging' && '⚡ Sạc'}
              {category === 'motor' && '⚙️ Động cơ'}
              {category === 'safety' && '🛡️ An toàn'}
              {category === 'general' && '📋 Chung'}
            </Text>
            {categoryItems.map((item) => (
              <View key={item.id} style={styles.checklistItemCard}>
                <TouchableOpacity
                  style={styles.checklistItemRow}
                  onPress={() => {
                    const updated = [...evChecklistItems];
                    const itemIndex = updated.findIndex((i) => i.id === item.id);
                    updated[itemIndex] = { ...updated[itemIndex], checked: !updated[itemIndex].checked };
                    setEvChecklistItems(updated);
                  }}
                >
                  <View style={styles.checkbox}>
                    {item.checked && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.checklistLabel, item.checked && styles.checklistLabelChecked]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>

                {/* Status Selector */}
                <View style={styles.statusSelector}>
                  <TouchableOpacity
                    style={[styles.statusButton, item.status === 'good' && styles.statusButtonGood]}
                    onPress={() => {
                      const updated = [...evChecklistItems];
                      const itemIndex = updated.findIndex((i) => i.id === item.id);
                      updated[itemIndex] = { ...updated[itemIndex], status: 'good' };
                      setEvChecklistItems(updated);
                    }}
                  >
                    <Text style={[styles.statusText, item.status === 'good' && styles.statusTextActive]}>
                      Tốt
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statusButton, item.status === 'warning' && styles.statusButtonWarning]}
                    onPress={() => {
                      const updated = [...evChecklistItems];
                      const itemIndex = updated.findIndex((i) => i.id === item.id);
                      updated[itemIndex] = { ...updated[itemIndex], status: 'warning' };
                      setEvChecklistItems(updated);
                    }}
                  >
                    <Text style={[styles.statusText, item.status === 'warning' && styles.statusTextActive]}>
                      Cảnh báo
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statusButton, item.status === 'critical' && styles.statusButtonCritical]}
                    onPress={() => {
                      const updated = [...evChecklistItems];
                      const itemIndex = updated.findIndex((i) => i.id === item.id);
                      updated[itemIndex] = { ...updated[itemIndex], status: 'critical' };
                      setEvChecklistItems(updated);
                    }}
                  >
                    <Text style={[styles.statusText, item.status === 'critical' && styles.statusTextActive]}>
                      Nghiêm trọng
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Notes Input */}
                <TextInput
                  style={styles.checklistNotes}
                  placeholder="Ghi chú (nếu có)..."
                  placeholderTextColor="#9CA3AF"
                  value={item.notes || ''}
                  onChangeText={(text) => {
                    const updated = [...evChecklistItems];
                    const itemIndex = updated.findIndex((i) => i.id === item.id);
                    updated[itemIndex] = { ...updated[itemIndex], notes: text };
                    setEvChecklistItems(updated);
                  }}
                />
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );

  // Render Step 2: Customer Items
  const renderStep2 = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.stepTitle}>📦 Đồ đạc khách hàng</Text>
      <Text style={styles.stepSubtitle}>Ghi nhận các đồ đạc cá nhân để trong xe</Text>

      <TouchableOpacity style={styles.addButton} onPress={addCustomerItem}>
        <Text style={styles.addButtonText}>+ Thêm đồ đạc</Text>
      </TouchableOpacity>

      {customerItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Chưa có đồ đạc nào được ghi nhận</Text>
        </View>
      ) : (
        customerItems.map((item, index) => (
          <View key={index} style={styles.formCard}>
            <TextInput
              style={styles.input}
              placeholder="Tên đồ vật (VD: Laptop)"
              value={item.item}
              onChangeText={(text) => {
                const updated = [...customerItems];
                updated[index] = { ...updated[index], item: text };
                setCustomerItems(updated);
              }}
            />
            <TextInput
              style={styles.input}
              placeholder="Vị trí (VD: Ghế sau)"
              value={item.location}
              onChangeText={(text) => {
                const updated = [...customerItems];
                updated[index] = { ...updated[index], location: text };
                setCustomerItems(updated);
              }}
            />
            <TextInput
              style={styles.input}
              placeholder="Giá trị (VND)"
              keyboardType="numeric"
              value={item.value?.toString() || ''}
              onChangeText={(text) => {
                const updated = [...customerItems];
                updated[index] = { ...updated[index], value: parseInt(text) || undefined };
                setCustomerItems(updated);
              }}
            />
            <TextInput
              style={styles.textArea}
              placeholder="Ghi chú..."
              multiline
              numberOfLines={2}
              value={item.notes}
              onChangeText={(text) => {
                const updated = [...customerItems];
                updated[index] = { ...updated[index], notes: text };
                setCustomerItems(updated);
              }}
            />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeCustomerItem(index)}
            >
              <Text style={styles.removeButtonText}>Xóa</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );

  // Render Step 3: Recommended Services
  const renderStep3 = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.stepTitle}>🔧 Dịch vụ đề xuất</Text>
      <Text style={styles.stepSubtitle}>Dịch vụ cần thực hiện sau kiểm tra</Text>

      {/* Booked Services Summary */}
      {appointment && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Dịch vụ đã đặt:</Text>
          {appointment.services.map((service, index) => (
            <Text key={index} style={styles.summaryItem}>
              • {service.serviceId.name} (x{service.quantity})
            </Text>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={addRecommendedService}
        disabled={loadingServices}
      >
        <Text style={styles.addButtonText}>
          {loadingServices ? 'Đang tải...' : '+ Thêm dịch vụ đề xuất'}
        </Text>
      </TouchableOpacity>

      {recommendedServices.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Chưa có dịch vụ đề xuất nào</Text>
        </View>
      ) : (
        recommendedServices.map((service, index) => (
          <View key={index} style={styles.formCard}>
            <Text style={styles.label}>Chọn dịch vụ</Text>
            <View style={styles.pickerContainer}>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => {
                  setCurrentEditingIndex(index);
                  setServicePickerVisible(true);
                }}
              >
                <Text style={styles.pickerText}>
                  {service.serviceName || 'Chọn dịch vụ...'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Số lượng</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={service.quantity.toString()}
              onChangeText={(text) => {
                const updated = [...recommendedServices];
                updated[index] = { ...updated[index], quantity: parseInt(text) || 1 };
                setRecommendedServices(updated);
              }}
            />

            <Text style={styles.label}>Lý do</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Lý do cần thiết..."
              multiline
              numberOfLines={3}
              value={service.reason}
              onChangeText={(text) => {
                const updated = [...recommendedServices];
                updated[index] = { ...updated[index], reason: text };
                setRecommendedServices(updated);
              }}
            />

            {service.estimatedCost > 0 && (
              <Text style={styles.costText}>
                Giá: {formatCurrency(service.estimatedCost * service.quantity)}
              </Text>
            )}

            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeRecommendedService(index)}
            >
              <Text style={styles.removeButtonText}>Xóa</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <View style={styles.instructionsCard}>
        <Text style={styles.label}>Yêu cầu từ khách hàng</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Ghi chú yêu cầu đặc biệt..."
          multiline
          numberOfLines={3}
          value={specialInstructions.fromCustomer || ''}
          onChangeText={(text) =>
            setSpecialInstructions({ ...specialInstructions, fromCustomer: text })
          }
        />
      </View>
    </ScrollView>
  );

  // Render Step 4: Parts Request & Summary
  const renderStep4 = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.stepTitle}>🔩 Yêu cầu phụ tùng</Text>
      <Text style={styles.stepSubtitle}>Phụ tùng cần thiết cho dịch vụ</Text>

      <TouchableOpacity
        style={styles.addButton}
        onPress={addRequestedPart}
        disabled={loadingParts}
      >
        <Text style={styles.addButtonText}>
          {loadingParts ? 'Đang tải...' : '+ Thêm phụ tùng'}
        </Text>
      </TouchableOpacity>

      {requestedParts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Chưa có yêu cầu phụ tùng nào</Text>
        </View>
      ) : (
        requestedParts.map((part, index) => (
          <View key={index} style={styles.formCard}>
            <Text style={styles.label}>Chọn phụ tùng</Text>
            <View style={styles.pickerContainer}>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => {
                  setCurrentEditingIndex(index);
                  setPartPickerVisible(true);
                }}
              >
                <Text style={styles.pickerText}>{part.partName || 'Chọn phụ tùng...'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Số lượng</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={part.quantity.toString()}
              onChangeText={(text) => {
                const updated = [...requestedParts];
                updated[index] = { ...updated[index], quantity: parseInt(text) || 1 };
                setRequestedParts(updated);
              }}
            />

            <Text style={styles.label}>Lý do</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Lý do cần thiết..."
              multiline
              numberOfLines={2}
              value={part.reason}
              onChangeText={(text) => {
                const updated = [...requestedParts];
                updated[index] = { ...updated[index], reason: text };
                setRequestedParts(updated);
              }}
            />

            {part.estimatedCost > 0 && (
              <Text style={styles.costText}>
                Giá: {formatCurrency(part.estimatedCost * part.quantity)}
              </Text>
            )}

            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeRequestedPart(index)}
            >
              <Text style={styles.removeButtonText}>Xóa</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      {/* External Parts Note - From Technician */}
      <View style={styles.externalPartsCard}>
        <View style={styles.externalPartsHeader}>
          <Text style={styles.externalPartsIcon}>🛒</Text>
          <Text style={styles.externalPartsTitle}>Ghi chú linh kiện đặt ngoài</Text>
          <View style={styles.leaveCarBadge}>
            <Text style={styles.leaveCarText}>ĐỂ XE LẠI</Text>
          </View>
        </View>
        <Text style={styles.externalPartsSubtitle}>
          Ghi chú của kỹ thuật viên nếu cần đặt linh kiện từ nhà cung cấp bên ngoài (Staff sẽ xử lý sau)
        </Text>
        <TextInput
          style={styles.externalPartsTextArea}
          placeholder="Ví dụ: Cần đặt pin lithium 72V 100Ah từ nhà cung cấp ABC. Khách đồng ý để xe. Dự kiến 3-5 ngày..."
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={5}
          value={specialInstructions.fromStaff || ''}
          onChangeText={(text) =>
            setSpecialInstructions({ ...specialInstructions, fromStaff: text })
          }
        />
        <Text style={styles.externalPartsHint}>
          💡 Ghi rõ: tên linh kiện, lý do cần đặt ngoài, xác nhận khách đồng ý để xe
        </Text>
      </View>

      {/* Summary */}
      <View style={styles.finalSummary}>
        <Text style={styles.summaryTitle}>📊 Tóm tắt</Text>
        <Text style={styles.summaryItem}>
          • EV Checklist: {evChecklistItems.filter((i) => i.checked).length}/{evChecklistItems.length} items
        </Text>
        <Text style={styles.summaryItem}>• Đồ đạc: {customerItems.length} items</Text>
        <Text style={styles.summaryItem}>
          • Dịch vụ đề xuất: {recommendedServices.length} dịch vụ
        </Text>
        <Text style={styles.summaryItem}>• Phụ tùng: {requestedParts.length} phụ tùng</Text>
        <Text style={styles.summaryItem}>• Thời gian dự kiến: {totalTime} phút</Text>
        <Text style={[styles.summaryItem, styles.totalCost]}>
          • Tổng chi phí: {formatCurrency(totalCost)}
        </Text>
      </View>
    </ScrollView>
  );

  // Render current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  };

  if (isLoading || !appointment) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Hủy</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {rejectedReceptionId ? 'Sửa phiếu (Tạo mới)' : 'Phiếu tiếp nhận'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Rejected Reception Notice */}
      {rejectedReceptionId && (
        <View style={{ backgroundColor: '#FEF3C7', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F59E0B' }}>
          <Text style={{ fontSize: 13, color: '#92400E', textAlign: 'center' }}>
            ⚠️ Đang sửa từ phiếu bị từ chối. Khi gửi sẽ tạo phiếu mới.
          </Text>
        </View>
      )}

      {/* Vehicle Info */}
      <View style={styles.vehicleInfo}>
        <Text style={styles.vehicleText}>
          {appointment.vehicleId.make} {appointment.vehicleId.model} - {appointment.vehicleId.licensePlate}
        </Text>
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressSteps}>
          {[1, 2, 3, 4].map((step) => (
            <View key={step} style={styles.stepIndicator}>
              <View
                style={[
                  styles.stepCircle,
                  step <= currentStep && styles.stepCircleActive,
                ]}
              >
                <Text
                  style={[
                    styles.stepNumber,
                    step <= currentStep && styles.stepNumberActive,
                  ]}
                >
                  {step}
                </Text>
              </View>
              {step < 4 && (
                <View
                  style={[
                    styles.stepLine,
                    step < currentStep && styles.stepLineActive,
                  ]}
                />
              )}
            </View>
          ))}
        </View>
        <View style={styles.stepLabels}>
          <Text style={styles.stepLabel}>Checklist</Text>
          <Text style={styles.stepLabel}>Đồ đạc</Text>
          <Text style={styles.stepLabel}>Dịch vụ</Text>
          <Text style={styles.stepLabel}>Phụ tùng</Text>
        </View>
      </View>

      {/* Step Content */}
      {renderStepContent()}

      {/* Footer Navigation */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerButton, styles.backFooterButton]}
          onPress={handlePrevious}
          disabled={currentStep === 1}
        >
          <Text
            style={[
              styles.footerButtonText,
              currentStep === 1 && styles.footerButtonTextDisabled,
            ]}
          >
            Quay lại
          </Text>
        </TouchableOpacity>

        {currentStep < totalSteps ? (
          <TouchableOpacity style={[styles.footerButton, styles.nextButton]} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Tiếp theo</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.footerButton, styles.submitButton]}
            onPress={handleSaveReception}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>✓ Tạo phiếu</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Service Picker Modal */}
      <Modal
        visible={servicePickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setServicePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn dịch vụ</Text>
              <TouchableOpacity onPress={() => setServicePickerVisible(false)}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingServices ? (
              <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={availableServices}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      if (currentEditingIndex !== null) {
                        const updated = [...recommendedServices];
                        updated[currentEditingIndex] = {
                          ...updated[currentEditingIndex],
                          serviceId: item._id,
                          serviceName: item.name,
                          category: item.category,
                          estimatedCost: item.basePrice || 0,
                          estimatedDuration: item.estimatedDuration || 60,
                        };
                        setRecommendedServices(updated);
                      }
                      setServicePickerVisible(false);
                      setCurrentEditingIndex(null);
                    }}
                  >
                    <View>
                      <Text style={styles.modalItemName}>{item.name}</Text>
                      <Text style={styles.modalItemDetail}>
                        {item.category} • {item.basePrice?.toLocaleString('vi-VN')} VND • {item.estimatedDuration} phút
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>Không có dịch vụ nào</Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Part Picker Modal */}
      <Modal
        visible={partPickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPartPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn phụ tùng</Text>
              <TouchableOpacity onPress={() => setPartPickerVisible(false)}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingParts ? (
              <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={availableParts}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      if (currentEditingIndex !== null) {
                        const updated = [...requestedParts];
                        updated[currentEditingIndex] = {
                          ...updated[currentEditingIndex],
                          partId: item._id,
                          partName: item.name,
                          partNumber: item.partNumber,
                          estimatedCost: item.pricing?.retail || 0,
                        };
                        setRequestedParts(updated);
                      }
                      setPartPickerVisible(false);
                      setCurrentEditingIndex(null);
                    }}
                  >
                    <View>
                      <Text style={styles.modalItemName}>{item.name}</Text>
                      <Text style={styles.modalItemDetail}>
                        Mã: {item.partNumber} • {item.pricing?.retail?.toLocaleString('vi-VN')} VND • Tồn kho: {item.inventory?.currentStock || 0}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>Không có phụ tùng nào</Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    fontSize: 16,
    color: '#EF4444',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  vehicleInfo: {
    padding: 12,
    backgroundColor: '#DBEAFE',
    borderBottomWidth: 1,
    borderBottomColor: '#93C5FD',
  },
  vehicleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    textAlign: 'center',
  },
  progressContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#10B981',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#E5E7EB',
  },
  stepLineActive: {
    backgroundColor: '#10B981',
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stepLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  stepContent: {
    flex: 1,
    padding: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
  },
  checklistItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    padding: 12,
  },
  checklistItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  statusButtonGood: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  statusButtonWarning: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  statusButtonCritical: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  statusText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#111827',
  },
  checklistNotes: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 8,
    fontSize: 12,
    color: '#111827',
    minHeight: 40,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkmark: {
    color: '#10B981',
    fontSize: 18,
    fontWeight: 'bold',
  },
  checklistLabel: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  checklistLabelChecked: {
    color: '#6B7280',
    textDecorationLine: 'line-through',
  },
  addButton: {
    padding: 12,
    backgroundColor: '#10B981',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  formCard: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    marginBottom: 12,
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  pickerContainer: {
    marginBottom: 12,
  },
  pickerButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
  },
  pickerText: {
    fontSize: 14,
    color: '#111827',
  },
  costText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    marginBottom: 8,
  },
  removeButton: {
    padding: 8,
    alignSelf: 'flex-end',
  },
  removeButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryCard: {
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  summaryItem: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 4,
  },
  instructionsCard: {
    marginTop: 16,
  },
  finalSummary: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  totalCost: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#10B981',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  backFooterButton: {
    backgroundColor: '#F3F4F6',
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  footerButtonTextDisabled: {
    color: '#9CA3AF',
  },
  nextButton: {
    backgroundColor: '#3B82F6',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#10B981',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalCloseButton: {
    fontSize: 24,
    color: '#6B7280',
    fontWeight: '300',
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  modalItemDetail: {
    fontSize: 14,
    color: '#6B7280',
  },
  // External Parts Styles
  externalPartsCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  externalPartsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  externalPartsIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  externalPartsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    flex: 1,
  },
  leaveCarBadge: {
    backgroundColor: '#FDE68A',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  leaveCarText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400E',
  },
  externalPartsSubtitle: {
    fontSize: 13,
    color: '#78350F',
    marginBottom: 12,
  },
  externalPartsTextArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  externalPartsHint: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 8,
  },
});

export default ServiceReceptionCreateScreen;
