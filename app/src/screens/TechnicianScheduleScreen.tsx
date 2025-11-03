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
import { getTechnicianSlots } from '../services/technician.api';
type Props = NativeStackScreenProps<TechnicianStackParamList, 'Schedule'>;

interface Slot {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  status: 'available' | 'full' | 'closed';
  technicianIds: string[];
  technicianAppointments: any[];
}

const TechnicianScheduleScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  useEffect(() => {
    loadSlots();
  }, [selectedDate, viewMode]);

  const loadSlots = async () => {
    try {
      setLoading(true);

      const from = getStartDate();
      const to = getEndDate();

      // Get current user ID from AsyncStorage or leave undefined to get all slots
      const response = await getTechnicianSlots({
        from: from.toISOString(),
        to: to.toISOString(),
      });

      // Handle different response formats
      // Backend returns: { count: 4, data: [...] }
      let slotsData = [];
      if (response.data && Array.isArray(response.data)) {
        // Direct array in data
        slotsData = response.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        // Nested: { data: { count: X, data: [...] } }
        slotsData = response.data.data;
      } else if (response.count !== undefined && response.data && Array.isArray(response.data)) {
        // Direct format: { count: X, data: [...] }
        slotsData = response.data;
      } else if (response.slots && Array.isArray(response.slots)) {
        // Format: { slots: [...] }
        slotsData = response.slots;
      } else if (Array.isArray(response)) {
        // Direct array
        slotsData = response;
      }

      setSlots(Array.isArray(slotsData) ? slotsData : []);
    } catch (error: any) {
      console.error('Error loading slots:', error);
      Alert.alert('Lỗi', 'Không thể tải lịch làm việc');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSlots();
    setRefreshing(false);
  };

  const getStartDate = (): Date => {
    const date = new Date(selectedDate);
    if (viewMode === 'week') {
      // Start of week (Monday)
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      date.setDate(diff);
    }
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const getEndDate = (): Date => {
    const date = new Date(selectedDate);
    if (viewMode === 'week') {
      // End of week (Sunday)
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? 0 : 7);
      date.setDate(diff);
    }
    date.setHours(23, 59, 59, 999);
    return date;
  };

  const goToPreviousPeriod = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    setSelectedDate(newDate);
  };

  const goToNextPeriod = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatWeekRange = (start: Date, end: Date): string => {
    return `${start.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' })}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'available':
        return '#10B981';
      case 'full':
        return '#F59E0B';
      case 'closed':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'available':
        return 'Còn chỗ';
      case 'full':
        return 'Đầy';
      case 'closed':
        return 'Đóng';
      default:
        return status;
    }
  };

  const renderSlot = (slot: Slot) => {
    const statusColor = getStatusColor(slot.status);

    return (
      <TouchableOpacity
        key={slot._id}
        style={styles.slotCard}
        onPress={() => {
          // Navigate to slot detail if needed
          Alert.alert(
            'Slot Details',
            `${slot.startTime} - ${slot.endTime}\n${slot.bookedCount}/${slot.capacity} appointments`,
          );
        }}
      >
        <View style={styles.slotHeader}>
          <Text style={styles.slotTime}>
            {slot.startTime} - {slot.endTime}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusBadgeText}>{getStatusText(slot.status)}</Text>
          </View>
        </View>

        <View style={styles.slotInfo}>
          <Text style={styles.slotInfoText}>
            📅 {slot.bookedCount}/{slot.capacity} appointments
          </Text>
          {slot.technicianAppointments && slot.technicianAppointments.length > 0 && (
            <Text style={styles.slotInfoText}>
              🔧 {slot.technicianAppointments.length} công việc
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Đang tải lịch...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lịch Làm Việc</Text>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'day' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('day')}
        >
          <Text style={[styles.viewModeText, viewMode === 'day' && styles.viewModeTextActive]}>
            Ngày
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'week' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('week')}
        >
          <Text style={[styles.viewModeText, viewMode === 'week' && styles.viewModeTextActive]}>
            Tuần
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date Navigation */}
      <View style={styles.dateNavigation}>
        <TouchableOpacity style={styles.navButton} onPress={goToPreviousPeriod}>
          <Text style={styles.navButtonText}>←</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dateDisplay} onPress={goToToday}>
          <Text style={styles.dateText}>
            {viewMode === 'day'
              ? formatDate(selectedDate)
              : formatWeekRange(getStartDate(), getEndDate())}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navButton} onPress={goToNextPeriod}>
          <Text style={styles.navButtonText}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Slots List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {slots.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Không có lịch làm việc</Text>
            <Text style={styles.emptySubtext}>
              {viewMode === 'day' ? 'trong ngày này' : 'trong tuần này'}
            </Text>
          </View>
        ) : (
          <View style={styles.slotsContainer}>
            {slots.map((slot) => renderSlot(slot))}
          </View>
        )}
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  viewModeContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  viewModeButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  viewModeTextActive: {
    color: '#FFFFFF',
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  navButtonText: {
    fontSize: 20,
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  dateDisplay: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  slotsContainer: {
    padding: 16,
    gap: 12,
  },
  slotCard: {
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
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  slotTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  slotInfo: {
    gap: 4,
  },
  slotInfoText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});

export default TechnicianScheduleScreen;
