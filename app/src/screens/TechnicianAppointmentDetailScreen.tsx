import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  getAppointmentDetail,
  startWork,
  getAllServiceReceptionsByAppointment,
} from '../services/technician.api';
import { TechnicianStackParamList } from '../types/navigation.types';
import api from '../services/api';

type RouteParams = RouteProp<TechnicianStackParamList, 'AppointmentDetail'>;
type NavigationProp = NativeStackNavigationProp<TechnicianStackParamList, 'AppointmentDetail'>;

const TechnicianAppointmentDetailScreen: React.FC = () => {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const { appointmentId } = route.params;

  // State
  const [appointment, setAppointment] = useState<any | null>(null);
  const [serviceReception, setServiceReception] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Fetch appointment data
  const fetchAppointmentData = async () => {
    try {
      setIsLoading(true);

      // Fetch appointment details
      const appointmentResponse = await getAppointmentDetail(appointmentId);
      if (appointmentResponse.success) {
        setAppointment(appointmentResponse.data);
      }

      // Try to fetch service reception if exists
      try {
        const receptionResponse = await getAllServiceReceptionsByAppointment(appointmentId);
        if (receptionResponse.success && receptionResponse.data && receptionResponse.data.length > 0) {
          // Filter out rejected receptions and get the latest active one
          const activeReceptions = receptionResponse.data.filter(
            (r: any) => r.status !== 'rejected'
          );

          if (activeReceptions.length > 0) {
            // Get the latest active reception (sorted by createdAt)
            const latestReception = activeReceptions.sort(
              (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )[0];
            setServiceReception(latestReception);
          }
        }
      } catch (error: any) {
        // Reception might not exist yet, that's okay
        console.log('No service reception found yet');
      }
    } catch (error: any) {
      console.error('Error fetching appointment:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin lịch hẹn');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointmentData();
  }, [appointmentId]);

  // Handle start work
  const handleStartWork = async () => {
    Alert.alert(
      'Bắt đầu công việc',
      'Bạn có chắc chắn muốn bắt đầu thực hiện công việc này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Bắt đầu',
          onPress: async () => {
            try {
              setIsActionLoading(true);
              const response = await startWork(appointmentId);
              if (response.success) {
                Alert.alert('Thành công', 'Đã bắt đầu công việc');
                fetchAppointmentData(); // Refresh data
              }
            } catch (error: any) {
              Alert.alert('Lỗi', error.response?.data?.message || 'Không thể bắt đầu công việc');
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Handle customer arrival
  const handleCustomerArrival = async () => {
    try {
      setIsActionLoading(true);
      const response = await api.put(`/api/appointments/${appointmentId}/customer-arrived`, {
        vehicleConditionNotes: '',
        customerItems: [],
      });

      if (response.data.success) {
        Alert.alert('Thành công', 'Đã xác nhận khách hàng đã đến');
        await fetchAppointmentData(); // Reload to show new status
      }
    } catch (error: any) {
      console.error('Error marking customer arrival:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xác nhận khách đến');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle create service reception
  const handleCreateReception = () => {
    navigation.navigate('CreateReception', { appointmentId });
  };

  // Handle view service reception
  const handleViewReception = () => {
    navigation.navigate('ViewReception', {
      appointmentId,
    });
  };

  // Handle view work progress
  const handleViewProgress = () => {
    navigation.navigate('WorkProgress', { appointmentId });
  };

  // Handle complete work
  const handleCompleteWork = () => {
    navigation.navigate('CompleteService', { appointmentId });
  };

  // Get status display text (Vietnamese)
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'Chờ xác nhận',
      confirmed: 'Đã xác nhận',
      customer_arrived: 'Khách đã đến',
      reception_created: 'Đã lập phiếu tiếp nhận',
      reception_approved: 'Phiếu đã được duyệt',
      in_progress: 'Đang thực hiện',
      completed: 'Hoàn thành',
    };
    return statusMap[status] || status;
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#EF4444';
      case 'high':
        return '#F59E0B';
      default:
        return '#10B981';
    }
  };

  // Format currency (VND)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  // Get order status text
  const getOrderStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      ordered: 'Đã đặt hàng',
      in_transit: 'Đang vận chuyển',
      delivered: 'Đã giao',
      cancelled: 'Đã hủy',
      pending: 'Chờ đặt hàng',
    };
    return statusMap[status] || status;
  };

  // Get order status badge style
  const getOrderStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'delivered':
        return { backgroundColor: '#D1FAE5' };
      case 'in_transit':
        return { backgroundColor: '#DBEAFE' };
      case 'ordered':
        return { backgroundColor: '#FEF3C7' };
      case 'cancelled':
        return { backgroundColor: '#FEE2E2' };
      default:
        return { backgroundColor: '#F3F4F6' };
    }
  };

  // Get order status text style
  const getOrderStatusTextStyle = (status: string) => {
    switch (status) {
      case 'delivered':
        return { color: '#065F46' };
      case 'in_transit':
        return { color: '#1E40AF' };
      case 'ordered':
        return { color: '#92400E' };
      case 'cancelled':
        return { color: '#991B1B' };
      default:
        return { color: '#374151' };
    }
  };

  // Loading state
  if (isLoading || !appointment) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  // Render action buttons based on status
  const renderActionButtons = () => {
    const status = appointment.status;

    if (status === 'confirmed') {
      return (
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={handleCustomerArrival}
          disabled={isActionLoading}
        >
          {isActionLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.actionButtonText}>✅ Xác nhận khách đã đến</Text>
          )}
        </TouchableOpacity>
      );
    }

    if (status === 'customer_arrived') {
      return (
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={handleCreateReception}
          disabled={isActionLoading}
        >
          <Text style={styles.actionButtonText}>📋 Lập phiếu tiếp nhận</Text>
        </TouchableOpacity>
      );
    }

    if (status === 'reception_created' || status === 'reception_approved') {
      return (
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton, { flex: 1, marginRight: 8 }]}
            onPress={handleViewReception}
          >
            <Text style={styles.secondaryButtonText}>📄 Xem phiếu</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton, { flex: 1 }]}
            onPress={handleStartWork}
            disabled={isActionLoading}
          >
            {isActionLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.actionButtonText}>▶️ Bắt đầu</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    if (status === 'in_progress') {
      return (
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton, { flex: 1, marginRight: 8 }]}
            onPress={handleViewProgress}
          >
            <Text style={styles.secondaryButtonText}>📊 Tiến độ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.successButton, { flex: 1 }]}
            onPress={handleCompleteWork}
          >
            <Text style={styles.actionButtonText}>✅ Hoàn thành</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết lịch hẹn</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Appointment Number & Priority */}
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.appointmentNumber}>#{appointment.appointmentNumber}</Text>
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: getPriorityColor(appointment.priority) },
              ]}
            >
              <Text style={styles.priorityText}>
                {appointment.priority === 'urgent'
                  ? 'KHẨN CẤP'
                  : appointment.priority === 'high'
                  ? 'CAO'
                  : 'BÌNH THƯỜNG'}
              </Text>
            </View>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{getStatusText(appointment.status)}</Text>
          </View>
        </View>

        {/* Schedule Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📅 Thông tin lịch hẹn</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ngày:</Text>
            <Text style={styles.infoValue}>
              {new Date(appointment.scheduledDate).toLocaleDateString('vi-VN')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Giờ:</Text>
            <Text style={styles.infoValue}>{appointment.scheduledTime}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Loại đặt:</Text>
            <Text style={styles.infoValue}>
              {appointment.bookingType === 'deposit_booking' ? 'Đặt cọc' : 'Thanh toán đầy đủ'}
            </Text>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👤 Thông tin khách hàng</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Họ tên:</Text>
            <Text style={styles.infoValue}>
              {appointment.customerId.firstName} {appointment.customerId.lastName}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Điện thoại:</Text>
            <Text style={[styles.infoValue, styles.phoneText]}>
              {appointment.customerId.phone}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{appointment.customerId.email}</Text>
          </View>
        </View>

        {/* Vehicle Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚗 Thông tin xe</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Xe:</Text>
            <Text style={styles.infoValue}>
              {appointment.vehicleId.make} {appointment.vehicleId.model} ({appointment.vehicleId.year})
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Biển số:</Text>
            <Text style={[styles.infoValue, styles.licensePlateText]}>
              {appointment.vehicleId.licensePlate}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>VIN:</Text>
            <Text style={styles.infoValue}>{appointment.vehicleId.vin}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Màu sắc:</Text>
            <Text style={styles.infoValue}>{appointment.vehicleId.color}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pin:</Text>
            <Text style={styles.infoValue}>{appointment.vehicleId.batteryType}</Text>
          </View>
        </View>

        {/* Services */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔧 Dịch vụ đã đặt</Text>
          {appointment.services.map((service: any, index: number) => (
            <View key={index} style={styles.serviceItem}>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.serviceId.name}</Text>
                <Text style={styles.serviceCategory}>({service.serviceId.category})</Text>
              </View>
              <View style={styles.serviceDetails}>
                <Text style={styles.serviceQuantity}>x{service.quantity}</Text>
                <Text style={styles.servicePrice}>{formatCurrency(service.price)}</Text>
              </View>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng cộng:</Text>
            <Text style={styles.totalAmount}>{formatCurrency(appointment.totalAmount)}</Text>
          </View>
        </View>

        {/* Notes */}
        {appointment.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📝 Ghi chú</Text>
            <Text style={styles.notesText}>{appointment.notes}</Text>
          </View>
        )}

        {/* Service Reception Info */}
        {serviceReception && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📋 Phiếu tiếp nhận</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Số phiếu:</Text>
              <Text style={styles.infoValue}>{serviceReception.receptionNumber}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Trạng thái:</Text>
              <Text style={styles.infoValue}>{getStatusText(serviceReception.status)}</Text>
            </View>
            {serviceReception.submissionStatus && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Duyệt:</Text>
                <Text style={styles.infoValue}>
                  {serviceReception.submissionStatus.staffReviewStatus === 'approved'
                    ? '✅ Đã duyệt'
                    : serviceReception.submissionStatus.staffReviewStatus === 'pending'
                    ? '⏳ Chờ duyệt'
                    : '❌ Từ chối'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Recommended Services from Reception */}
        {serviceReception && serviceReception.recommendedServices && serviceReception.recommendedServices.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔧 Dịch vụ đề xuất từ phiếu tiếp nhận</Text>
            {serviceReception.recommendedServices.map((service: any, index: number) => (
              <View key={index} style={styles.serviceItem}>
                <View style={styles.serviceHeader}>
                  <Text style={styles.serviceName}>{service.serviceName}</Text>
                  <View style={styles.badgeContainer}>
                    {service.customerApproved === true && (
                      <View style={[styles.badge, styles.badgeApproved]}>
                        <Text style={[styles.badgeText, { color: '#065F46' }]}>✓ Đã duyệt</Text>
                      </View>
                    )}
                    {service.customerApproved === false && (
                      <View style={[styles.badge, styles.badgeRejected]}>
                        <Text style={[styles.badgeText, { color: '#991B1B' }]}>✕ Từ chối</Text>
                      </View>
                    )}
                    {service.isCompleted && (
                      <View style={[styles.badge, styles.badgeCompleted]}>
                        <Text style={[styles.badgeText, { color: '#1E40AF' }]}>✓ Hoàn thành</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={{ marginTop: 4 }}>
                  <Text style={styles.serviceCategory}>{service.category}</Text>
                  <Text style={styles.serviceDetail}>
                    {formatCurrency(service.estimatedCost)} • {service.estimatedDuration} phút
                  </Text>
                  {service.reason && (
                    <Text style={styles.serviceReason}>Lý do: {service.reason}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* External Parts (from Staff) */}
        {serviceReception && serviceReception.externalParts && serviceReception.externalParts.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📦 Phụ tùng đặt ngoài (Staff thêm)</Text>
            {serviceReception.externalParts.map((part: any, index: number) => (
              <View key={index} style={styles.externalPartItem}>
                <View style={styles.serviceHeader}>
                  <Text style={styles.serviceName}>{part.partName}</Text>
                  <View style={[styles.badge, getOrderStatusBadgeStyle(part.orderStatus)]}>
                    <Text style={[styles.badgeText, getOrderStatusTextStyle(part.orderStatus)]}>
                      {getOrderStatusText(part.orderStatus)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.serviceDetail}>Mã: {part.partNumber}</Text>
                <Text style={styles.serviceDetail}>
                  SL: {part.quantity} • {formatCurrency(part.unitPrice)} x {part.quantity} = {formatCurrency(part.totalPrice)}
                </Text>
                {part.supplier && (
                  <Text style={styles.serviceDetail}>NCC: {part.supplier.name}</Text>
                )}
                {part.estimatedArrival && (
                  <Text style={styles.serviceDetail}>Dự kiến: {new Date(part.estimatedArrival).toLocaleDateString('vi-VN')}</Text>
                )}
                {part.warranty && (
                  <Text style={styles.serviceDetail}>BH: {part.warranty.period} tháng</Text>
                )}
                {part.notes && (
                  <Text style={styles.serviceReason}>Ghi chú: {part.notes}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Requested Parts from Reception */}
        {serviceReception && serviceReception.requestedParts && serviceReception.requestedParts.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔩 Phụ tùng yêu cầu (Technician)</Text>
            {serviceReception.requestedParts.map((part: any, index: number) => (
              <View key={index} style={styles.serviceItem}>
                <View style={styles.serviceHeader}>
                  <Text style={styles.serviceName}>{part.partName}</Text>
                  <View style={styles.badgeContainer}>
                    {part.isApproved && (
                      <View style={[styles.badge, styles.badgeApproved]}>
                        <Text style={[styles.badgeText, { color: '#065F46' }]}>✓ Đã duyệt</Text>
                      </View>
                    )}
                    {part.isAvailable ? (
                      <View style={[styles.badge, styles.badgeAvailable]}>
                        <Text style={[styles.badgeText, { color: '#1E40AF' }]}>
                          ✓ Có sẵn ({part.availableQuantity || 0})
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.badge, styles.badgeWarning]}>
                        <Text style={[styles.badgeText, { color: '#92400E' }]}>
                          ⚠ {part.shortfall ? `Thiếu ${part.shortfall}` : 'Chưa có'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={{ marginTop: 4 }}>
                  <Text style={styles.serviceDetail}>
                    Số lượng: {part.quantity} • {formatCurrency(part.estimatedCost)}
                  </Text>
                  {part.reason && (
                    <Text style={styles.serviceReason}>Lý do: {part.reason}</Text>
                  )}
                  {part.alternatives && part.alternatives.length > 0 && (
                    <Text style={styles.serviceReason}>
                      Có {part.alternatives.length} phụ tùng thay thế
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>{renderActionButtons()}</View>
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
    width: 80,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3B82F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  appointmentNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#DBEAFE',
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  phoneText: {
    color: '#3B82F6',
  },
  licensePlateText: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  serviceItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  serviceInfo: {
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  serviceCategory: {
    fontSize: 12,
    color: '#6B7280',
  },
  serviceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  serviceQuantity: {
    fontSize: 13,
    color: '#6B7280',
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  notesText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  actionContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  buttonGroup: {
    flexDirection: 'row',
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
  },
  successButton: {
    backgroundColor: '#10B981',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeApproved: {
    backgroundColor: '#D1FAE5',
  },
  badgeRejected: {
    backgroundColor: '#FEE2E2',
  },
  badgeCompleted: {
    backgroundColor: '#DBEAFE',
  },
  badgeAvailable: {
    backgroundColor: '#DBEAFE',
  },
  badgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#065F46',
  },
  externalPartItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  serviceDetail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  serviceReason: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default TechnicianAppointmentDetailScreen;
