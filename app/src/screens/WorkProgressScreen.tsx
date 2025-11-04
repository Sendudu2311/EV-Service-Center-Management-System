import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TechnicianStackParamList } from '../types/navigation.types';
import { getAppointmentDetail, getServiceReceptionByAppointment } from '../services/technician.api';
import { WorkQueueAppointment } from '../services/technician.api';

type Props = NativeStackScreenProps<TechnicianStackParamList, 'WorkProgress'>;

interface ServiceReception {
  _id: string;
  receptionNumber: string;
  evChecklistItems: Array<{
    id: string;
    label: string;
    category: string;
    checked: boolean;
    status?: string;
    notes?: string;
  }>;
  recommendedServices: Array<{
    _id: string;
    serviceName: string;
    quantity: number;
    estimatedDuration: number;
    isCompleted: boolean;
    completedAt?: string;
  }>;
  requestedParts: Array<{
    _id: string;
    partName: string;
    quantity: number;
    estimatedCost: number;
  }>;
  estimatedServiceTime: number;
  actualServiceTime?: number;
}

const WorkProgressScreen: React.FC<Props> = ({ route, navigation }) => {
  const { appointmentId } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointment, setAppointment] = useState<WorkQueueAppointment | null>(null);
  const [serviceReception, setServiceReception] = useState<ServiceReception | null>(null);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  useEffect(() => {
    loadData();
  }, [appointmentId]);

  // Timer to track elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000 / 60);
      setElapsedMinutes(elapsed);
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [startTime]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [appointmentData, receptionData] = await Promise.all([
        getAppointmentDetail(appointmentId),
        getServiceReceptionByAppointment(appointmentId).catch(() => null),
      ]);

      setAppointment(appointmentData.data || appointmentData);
      setServiceReception(receptionData?.data || null);

      // Find when work started from workflow history
      if (appointmentData.data?.workflowHistory) {
        const workStarted = appointmentData.data.workflowHistory.find(
          (h: any) => h.status === 'in_progress'
        );
        if (workStarted) {
          setStartTime(new Date(workStarted.changedAt));
        }
      }
    } catch (error) {
      console.error('Error loading work progress:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin công việc');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCompleteWork = () => {
    navigation.navigate('CompleteService', { appointmentId });
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const calculateProgress = (): number => {
    if (!serviceReception) return 0;

    const checklistChecked = serviceReception.evChecklistItems.filter(item => item.checked).length;
    const checklistTotal = serviceReception.evChecklistItems.length;

    const servicesCompleted = serviceReception.recommendedServices.filter(s => s.isCompleted).length;
    const servicesTotal = serviceReception.recommendedServices.length;

    const checklistProgress = checklistTotal > 0 ? (checklistChecked / checklistTotal) * 50 : 0;
    const servicesProgress = servicesTotal > 0 ? (servicesCompleted / servicesTotal) * 50 : 50;

    return Math.round(checklistProgress + servicesProgress);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Không tìm thấy thông tin</Text>
      </View>
    );
  }

  const progress = calculateProgress();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Text style={styles.appointmentNumber}>#{appointment.appointmentNumber}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Đang làm</Text>
            </View>
          </View>

          <Text style={styles.customerName}>
            {appointment.customerId.firstName} {appointment.customerId.lastName}
          </Text>
          <Text style={styles.vehicleInfo}>
            {appointment.vehicleId.make} {appointment.vehicleId.model} ({appointment.vehicleId.year})
          </Text>
          <Text style={styles.licensePlate}>{appointment.vehicleId.licensePlate}</Text>
        </View>

        {/* Timer Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⏱️ Thời gian làm việc</Text>
          <View style={styles.timerContainer}>
            <View style={styles.timerBox}>
              <Text style={styles.timerLabel}>Đã làm</Text>
              <Text style={styles.timerValue}>{formatTime(elapsedMinutes)}</Text>
            </View>
            <View style={styles.timerBox}>
              <Text style={styles.timerLabel}>Dự kiến</Text>
              <Text style={styles.timerValue}>
                {serviceReception ? formatTime(serviceReception.estimatedServiceTime) : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Progress Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Tiến độ công việc</Text>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
        </View>

        {/* EV Checklist */}
        {serviceReception && serviceReception.evChecklistItems.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔋 EV Checklist</Text>
            <View style={styles.checklistSummary}>
              <Text style={styles.summaryText}>
                Đã kiểm tra: {serviceReception.evChecklistItems.filter(i => i.checked).length}/
                {serviceReception.evChecklistItems.length} mục
              </Text>
            </View>
            {serviceReception.evChecklistItems.map((item) => (
              <View key={item.id} style={styles.checklistItem}>
                <Text style={styles.checkboxIcon}>{item.checked ? '✅' : '⬜'}</Text>
                <View style={styles.checklistContent}>
                  <Text style={[styles.checklistLabel, item.checked && styles.checkedLabel]}>
                    {item.label}
                  </Text>
                  {item.status && (
                    <Text style={[
                      styles.checklistStatus,
                      item.status === 'critical' && styles.statusCritical,
                      item.status === 'warning' && styles.statusWarning,
                    ]}>
                      {item.status === 'good' ? '✓ Tốt' :
                       item.status === 'warning' ? '⚠ Cảnh báo' :
                       '❌ Nghiêm trọng'}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Services */}
        {serviceReception && serviceReception.recommendedServices.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔧 Dịch vụ</Text>
            <View style={styles.checklistSummary}>
              <Text style={styles.summaryText}>
                Hoàn thành: {serviceReception.recommendedServices.filter(s => s.isCompleted).length}/
                {serviceReception.recommendedServices.length} dịch vụ
              </Text>
            </View>
            {serviceReception.recommendedServices.map((service) => (
              <View key={service._id} style={styles.serviceItem}>
                <Text style={styles.checkboxIcon}>{service.isCompleted ? '✅' : '⬜'}</Text>
                <View style={styles.serviceContent}>
                  <Text style={[styles.serviceName, service.isCompleted && styles.checkedLabel]}>
                    {service.serviceName}
                  </Text>
                  <Text style={styles.serviceDetails}>
                    SL: {service.quantity} • {formatTime(service.estimatedDuration * service.quantity)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Parts */}
        {serviceReception && serviceReception.requestedParts.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔩 Phụ tùng đã yêu cầu</Text>
            {serviceReception.requestedParts.map((part) => (
              <View key={part._id} style={styles.partItem}>
                <Text style={styles.partName}>{part.partName}</Text>
                <Text style={styles.partQuantity}>x{part.quantity}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Complete Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.completeButton}
          onPress={handleCompleteWork}
        >
          <Text style={styles.completeButtonText}>✅ Hoàn thành công việc</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  scrollView: {
    flex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  headerCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 4,
  },
  vehicleInfo: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  licensePlate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#059669',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    marginHorizontal: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  timerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  timerBox: {
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  timerLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  timerValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563eb',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 24,
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 12,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    minWidth: 50,
    textAlign: 'right',
  },
  checklistSummary: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  checkboxIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  checklistContent: {
    flex: 1,
  },
  checklistLabel: {
    fontSize: 14,
    color: '#374151',
  },
  checkedLabel: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  checklistStatus: {
    fontSize: 12,
    marginTop: 2,
    color: '#10b981',
  },
  statusCritical: {
    color: '#ef4444',
  },
  statusWarning: {
    color: '#f59e0b',
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  serviceContent: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  serviceDetails: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  partItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  partName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  partQuantity: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  bottomBar: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  completeButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default WorkProgressScreen;
