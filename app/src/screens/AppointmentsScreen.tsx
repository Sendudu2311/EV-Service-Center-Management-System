import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { appointmentsAPI } from '../services/api';
import { useCustomEvent } from '../contexts/SocketContext';
import AppointmentBookingScreen from './AppointmentBookingScreen';

interface Appointment {
  _id: string;
  vehicleId: {
    make: string;
    model: string;
    year: number;
  };
  services: Array<{
    serviceId: {
      name: string;
      basePrice: number;
    };
  }>;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
  totalAmount: number;
  customerNotes?: string;
}

const AppointmentsScreen: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBooking, setShowBooking] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Listen to real-time appointment status updates
  useCustomEvent('appointmentStatusUpdate', (data) => {
    console.log('📡 Real-time status update:', data);
    // Refresh appointments list when any appointment status changes
    fetchAppointments();
  });

  // Listen to new appointments (for staff, but also refresh customer view)
  useCustomEvent('newAppointment', (data) => {
    console.log('📡 New appointment created:', data);
    fetchAppointments();
  });

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await appointmentsAPI.getAll();
      const appointmentData = (response.data?.data || response.data || []) as any;
      setAppointments(Array.isArray(appointmentData) ? appointmentData : []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách lịch hẹn');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    Alert.alert(
      'Xác nhận hủy',
      'Bạn có chắc chắn muốn hủy lịch hẹn này?',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy lịch',
          style: 'destructive',
          onPress: async () => {
            try {
              await appointmentsAPI.cancel(appointmentId, 'Khách hàng yêu cầu hủy');
              Alert.alert('Thành công', 'Đã hủy lịch hẹn');
              fetchAppointments();
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể hủy lịch hẹn');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#f59e0b',
      confirmed: '#3b82f6',
      'in-progress': '#8b5cf6',
      completed: '#10b981',
      cancelled: '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: 'Chờ xác nhận',
      confirmed: 'Đã xác nhận',
      'in-progress': 'Đang thực hiện',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy',
    };
    return texts[status] || status;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const handleBookingSuccess = () => {
    setShowBooking(false);
    fetchAppointments();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Lịch hẹn</Text>
          <Text style={styles.headerSubtitle}>Quản lý lịch bảo dưỡng</Text>
        </View>

        <View style={styles.content}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowBooking(true)}
          >
            <Text style={styles.addButtonText}>+ Đặt lịch mới</Text>
          </TouchableOpacity>

          {appointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Chưa có lịch hẹn nào</Text>
              <Text style={styles.emptyStateSubtext}>Đặt lịch bảo dưỡng ngay</Text>
            </View>
          ) : (
            appointments.map((appointment) => (
              <View key={appointment._id} style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <View>
                    <Text style={styles.vehicleName}>
                      {appointment.vehicleId.make} {appointment.vehicleId.model}
                    </Text>
                    <Text style={styles.vehicleYear}>{appointment.vehicleId.year}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(appointment.status) },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {getStatusText(appointment.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.appointmentDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>📅 Ngày:</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(appointment.scheduledDate)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>⏰ Giờ:</Text>
                    <Text style={styles.detailValue}>{appointment.scheduledTime}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>💰 Tổng tiền:</Text>
                    <Text style={[styles.detailValue, styles.priceText]}>
                      {appointment.totalAmount?.toLocaleString('vi-VN') || '0'} VNĐ
                    </Text>
                  </View>
                </View>

                <View style={styles.servicesSection}>
                  <Text style={styles.servicesTitle}>Dịch vụ:</Text>
                  {appointment.services.map((service, index) => (
                    <Text key={index} style={styles.serviceItem}>
                      • {service.serviceId.name}
                    </Text>
                  ))}
                </View>

                {appointment.customerNotes && (
                  <View style={styles.notesSection}>
                    <Text style={styles.notesLabel}>Ghi chú:</Text>
                    <Text style={styles.notesText}>{appointment.customerNotes}</Text>
                  </View>
                )}

                {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleCancelAppointment(appointment._id)}
                  >
                    <Text style={styles.cancelButtonText}>Hủy lịch hẹn</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showBooking}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBooking(false)}
      >
        <AppointmentBookingScreen
          visible={showBooking}
          onSuccess={handleBookingSuccess}
          onCancel={() => setShowBooking(false)}
        />
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#3b82f6',
    padding: 24,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0e7ff',
  },
  content: {
    padding: 16,
  },
  addButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  vehicleYear: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  priceText: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  servicesSection: {
    marginBottom: 16,
  },
  servicesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  serviceItem: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
    marginVertical: 2,
  },
  notesSection: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
  },
  cancelButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AppointmentsScreen;
