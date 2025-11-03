import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getWorkQueue, WorkQueueAppointment } from '../services/technician.api';
import type {
  WorkQueueStatistics,
  Pagination,
} from '../types/technician.types';
import { TechnicianStackParamList } from '../types/navigation.types';

type NavigationProp = NativeStackNavigationProp<TechnicianStackParamList, 'WorkQueue'>;

const TechnicianWorkQueueScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  // State
  const [appointments, setAppointments] = useState<WorkQueueAppointment[]>([]);
  const [statistics, setStatistics] = useState<WorkQueueStatistics | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'today' | 'tomorrow' | 'week' | 'all'>('today');

  // Fetch work queue data
  const fetchWorkQueue = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);

      const response = await getWorkQueue({
        dateRange: selectedFilter,
        status: 'pending,confirmed,customer_arrived,reception_created,reception_approved,in_progress',
        sortBy: 'priority_date',
        page: 1,
        limit: 20,
      });

      if (response.success) {
        setAppointments(response.data.appointments);
        setStatistics(response.data.statistics);
        setPagination(response.data.pagination);
      } else {
        Alert.alert('Lỗi', 'Không thể tải danh sách công việc');
      }
    } catch (error: any) {
      console.error('Error fetching work queue:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải danh sách công việc');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedFilter]);

  // Initial load
  useEffect(() => {
    fetchWorkQueue();
  }, [fetchWorkQueue]);

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchWorkQueue(false);
  };

  // Handle appointment press
  const handleAppointmentPress = (appointment: WorkQueueAppointment) => {
    navigation.navigate('AppointmentDetail', {
      appointmentId: appointment._id,
    });
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

  // Get status display text (Vietnamese)
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'Chờ xác nhận',
      confirmed: 'Đã xác nhận',
      customer_arrived: 'Khách đến',
      reception_created: 'Đã lập phiếu',
      reception_approved: 'Phiếu đã duyệt',
      in_progress: 'Đang thực hiện',
      completed: 'Hoàn thành',
    };
    return statusMap[status] || status;
  };

  // Render appointment item
  const renderAppointmentItem = ({ item }: { item: WorkQueueAppointment }) => (
    <TouchableOpacity
      style={styles.appointmentCard}
      onPress={() => handleAppointmentPress(item)}
      activeOpacity={0.7}
    >
      {/* Priority Badge */}
      <View
        style={[
          styles.priorityBadge,
          { backgroundColor: getPriorityColor(item.priority) },
        ]}
      >
        <Text style={styles.priorityText}>
          {item.priority === 'urgent' ? 'KHẨN' : item.priority === 'high' ? 'CAO' : 'BT'}
        </Text>
      </View>

      {/* Appointment Number & Time */}
      <View style={styles.headerRow}>
        <Text style={styles.appointmentNumber}>#{item.appointmentNumber}</Text>
        <Text style={styles.scheduledTime}>
          {new Date(item.scheduledDate).toLocaleDateString('vi-VN')} {item.scheduledTime}
        </Text>
      </View>

      {/* Customer Info */}
      <Text style={styles.customerName}>
        {item.customerId.firstName} {item.customerId.lastName}
      </Text>
      <Text style={styles.customerPhone}>{item.customerId.phone}</Text>

      {/* Vehicle Info */}
      <View style={styles.vehicleRow}>
        <Text style={styles.vehicleMake}>
          {item.vehicleId.make} {item.vehicleId.model} ({item.vehicleId.year})
        </Text>
        <Text style={styles.licensePlate}>{item.vehicleId.licensePlate}</Text>
      </View>

      {/* Services */}
      <View style={styles.servicesContainer}>
        {item.services.slice(0, 2).map((service: any, index: number) => (
          <Text key={index} style={styles.serviceText}>
            • {service.serviceId.name} (x{service.quantity})
          </Text>
        ))}
        {item.services.length > 2 && (
          <Text style={styles.moreServices}>+{item.services.length - 2} dịch vụ khác</Text>
        )}
      </View>

      {/* Status & Technician */}
      <View style={styles.footerRow}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
        {item.assignedTechnician && (
          <Text style={styles.technicianText}>
            KTV: {item.assignedTechnician.firstName} {item.assignedTechnician.lastName}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  // Render statistics
  const renderStatistics = () => {
    if (!statistics) return null;

    return (
      <View style={styles.statisticsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{statistics.total}</Text>
          <Text style={styles.statLabel}>Tổng</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#EF4444' }]}>{statistics.urgent}</Text>
          <Text style={styles.statLabel}>Khẩn</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#3B82F6' }]}>{statistics.inProgress}</Text>
          <Text style={styles.statLabel}>Đang làm</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{statistics.overdue}</Text>
          <Text style={styles.statLabel}>Trễ hạn</Text>
        </View>
      </View>
    );
  };

  // Render filter tabs
  const renderFilterTabs = () => (
    <View style={styles.filterContainer}>
      {(['today', 'tomorrow', 'week', 'all'] as const).map((filter) => (
        <TouchableOpacity
          key={filter}
          style={[
            styles.filterTab,
            selectedFilter === filter && styles.filterTabActive,
          ]}
          onPress={() => setSelectedFilter(filter)}
        >
          <Text
            style={[
              styles.filterTabText,
              selectedFilter === filter && styles.filterTabTextActive,
            ]}
          >
            {filter === 'today' && 'Hôm nay'}
            {filter === 'tomorrow' && 'Ngày mai'}
            {filter === 'week' && 'Tuần này'}
            {filter === 'all' && 'Tất cả'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Loading state
  if (isLoading) {
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
        <Text style={styles.headerTitle}>Công việc của tôi</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.scheduleButton}
            onPress={() => navigation.navigate('Schedule')}
          >
            <Text style={styles.scheduleButtonText}>📅 Lịch</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRefresh}>
            <Text style={styles.refreshButton}>🔄</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Statistics */}
      {renderStatistics()}

      {/* Filter Tabs */}
      {renderFilterTabs()}

      {/* Appointments List */}
      <FlatList
        data={appointments}
        renderItem={renderAppointmentItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#3B82F6']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Không có công việc nào</Text>
            <Text style={styles.emptySubtext}>
              {selectedFilter === 'today' && 'Bạn không có công việc hôm nay'}
              {selectedFilter === 'tomorrow' && 'Bạn không có công việc ngày mai'}
              {selectedFilter === 'week' && 'Bạn không có công việc tuần này'}
              {selectedFilter === 'all' && 'Bạn chưa được phân công việc nào'}
            </Text>
          </View>
        }
      />

      {/* Pagination Info */}
      {pagination && pagination.total > 0 && (
        <View style={styles.paginationContainer}>
          <Text style={styles.paginationText}>
            Hiển thị {appointments.length} / {pagination.total} công việc
          </Text>
        </View>
      )}
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scheduleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  scheduleButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  refreshButton: {
    fontSize: 24,
  },
  statisticsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  statCard: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#3B82F6',
  },
  filterTabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
  },
  appointmentCard: {
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
  priorityBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingRight: 50,
  },
  appointmentNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  scheduledTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  vehicleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleMake: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  licensePlate: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  servicesContainer: {
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  serviceText: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 4,
  },
  moreServices: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
  },
  statusText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '600',
  },
  technicianText: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  paginationContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  paginationText: {
    fontSize: 12,
    color: '#6B7280',
  },
});

export default TechnicianWorkQueueScreen;
