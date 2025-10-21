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
} from 'react-native';
import { vehiclesAPI } from '../services/api';
import VehicleForm from '../components/Vehicle/VehicleForm';

interface Vehicle {
  _id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  color: string;
  batteryType: string;
  batteryCapacity: number;
  maxChargingPower: number;
  range: number;
  purchaseDate: string;
  mileage: number;
  maintenanceInterval: number;
  timeBasedInterval: number;
  warrantyExpiry: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  isMaintenanceDue: boolean;
  createdAt: string;
}

const VehiclesScreen: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await vehiclesAPI.getAll();
      const vehicleData = (response.data?.data || response.data || []) as any;
      setVehicles(Array.isArray(vehicleData) ? vehicleData : []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách xe');
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVehicles();
    setRefreshing(false);
  };

  const handleCreateVehicle = () => {
    setSelectedVehicle(null);
    setFormMode('create');
    setShowForm(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setFormMode('edit');
    setShowForm(true);
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc chắn muốn xóa xe này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await vehiclesAPI.delete(vehicleId);
              Alert.alert('Thành công', 'Đã xóa xe');
              fetchVehicles();
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể xóa xe');
            }
          },
        },
      ]
    );
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedVehicle(null);
    fetchVehicles();
  };

  const getMaintenanceStatusColor = (vehicle: Vehicle) => {
    if (vehicle.isMaintenanceDue) {
      return '#ef4444';
    }
    return '#10b981';
  };

  const getMaintenanceStatusText = (vehicle: Vehicle) => {
    if (vehicle.isMaintenanceDue) {
      return 'Cần bảo dưỡng';
    }
    return 'Tốt';
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
          <Text style={styles.headerTitle}>Xe của tôi</Text>
          <Text style={styles.headerSubtitle}>Quản lý danh sách xe điện</Text>
        </View>

        <View style={styles.content}>
          <TouchableOpacity style={styles.addButton} onPress={handleCreateVehicle}>
            <Text style={styles.addButtonText}>+ Thêm xe mới</Text>
          </TouchableOpacity>

          {vehicles.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Chưa có xe nào được đăng ký</Text>
            </View>
          ) : (
            vehicles.map((vehicle) => (
              <View key={vehicle._id} style={styles.vehicleCard}>
                <View style={styles.vehicleHeader}>
                  <View>
                    <Text style={styles.vehicleName}>
                      {vehicle.make} {vehicle.model}
                    </Text>
                    <Text style={styles.vehicleYear}>{vehicle.year}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getMaintenanceStatusColor(vehicle) },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {getMaintenanceStatusText(vehicle)}
                    </Text>
                  </View>
                </View>

                <View style={styles.vehicleDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>VIN:</Text>
                    <Text style={styles.detailValue}>{vehicle.vin}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Màu sắc:</Text>
                    <Text style={styles.detailValue}>{vehicle.color}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Pin:</Text>
                    <Text style={styles.detailValue}>{vehicle.batteryCapacity} kWh</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Phạm vi:</Text>
                    <Text style={styles.detailValue}>{vehicle.range} km</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Số km:</Text>
                    <Text style={styles.detailValue}>{vehicle.mileage} km</Text>
                  </View>
                </View>

                <View style={styles.vehicleActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditVehicle(vehicle)}
                  >
                    <Text style={styles.actionButtonText}>Sửa</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteVehicle(vehicle._id)}
                  >
                    <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Xóa</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <VehicleForm
        visible={showForm}
        vehicle={selectedVehicle}
        mode={formMode}
        onSuccess={handleFormSuccess}
        onCancel={() => setShowForm(false)}
      />
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
    backgroundColor: '#3b82f6',
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
    fontSize: 16,
    color: '#6b7280',
  },
  vehicleCard: {
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
  vehicleHeader: {
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
  vehicleDetails: {
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
  vehicleActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  deleteButtonText: {
    color: '#ef4444',
  },
});

export default VehiclesScreen;
