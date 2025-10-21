import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { appointmentsAPI, vehiclesAPI, servicesAPI } from '../services/api';

interface Vehicle {
  _id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
}

interface Service {
  _id: string;
  name: string;
  category: string;
  description: string;
  basePrice: number;
  estimatedDuration: number;
}

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
  status: string;
  totalAmount: number;
}

interface AppointmentFormProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

const AppointmentBookingScreen: React.FC<AppointmentFormProps> = ({
  visible,
  onSuccess,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [formData, setFormData] = useState({
    vehicleId: '',
    serviceIds: [] as string[],
    scheduledDate: '',
    scheduledTime: '08:00',
    customerNotes: '',
    priority: 'normal',
  });

  useEffect(() => {
    if (visible) {
      fetchVehicles();
      fetchServices();
    }
  }, [visible]);

  const fetchVehicles = async () => {
    try {
      const response = await vehiclesAPI.getAll();
      const vehicleData = (response.data?.data || response.data || []) as any;
      setVehicles(Array.isArray(vehicleData) ? vehicleData : []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setVehicles([]);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await servicesAPI.getAll();
      const serviceData = (response.data?.data || response.data || []) as any;
      setServices(Array.isArray(serviceData) ? serviceData : []);
    } catch (error) {
      console.error('Error fetching services:', error);
      setServices([]);
    }
  };

  const handleServiceToggle = (serviceId: string) => {
    setFormData((prev) => {
      const serviceIds = prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter((id) => id !== serviceId)
        : [...prev.serviceIds, serviceId];
      return { ...prev, serviceIds };
    });
  };

  const calculateTotalAmount = () => {
    return formData.serviceIds.reduce((total, serviceId) => {
      const service = services.find((s) => s._id === serviceId);
      return total + (service?.basePrice || 0);
    }, 0);
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.vehicleId) {
      Alert.alert('Lỗi', 'Vui lòng chọn xe');
      return;
    }
    if (formData.serviceIds.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng chọn ít nhất một dịch vụ');
      return;
    }
    if (!formData.scheduledDate) {
      Alert.alert('Lỗi', 'Vui lòng chọn ngày');
      return;
    }

    setLoading(true);
    try {
      const appointmentData = {
        vehicleId: formData.vehicleId,
        services: formData.serviceIds.map((serviceId) => ({
          serviceId,
          quantity: 1,
        })),
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
        customerNotes: formData.customerNotes,
        priority: formData.priority,
      };

      await appointmentsAPI.create(appointmentData);
      Alert.alert('Thành công', 'Đặt lịch thành công');
      onSuccess();
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      Alert.alert('Lỗi', error.message || 'Không thể đặt lịch');
    } finally {
      setLoading(false);
    }
  };

  const timeSlots = ['08:00', '10:00', '13:00', '15:00'];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Đặt lịch bảo dưỡng</Text>
        <Text style={styles.headerSubtitle}>Chọn dịch vụ và thời gian</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chọn xe *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.vehicleId}
              onValueChange={(value) => setFormData({ ...formData, vehicleId: value })}
              style={styles.picker}
            >
              <Picker.Item label="Chọn xe của bạn" value="" />
              {vehicles.map((vehicle) => (
                <Picker.Item
                  key={vehicle._id}
                  label={`${vehicle.make} ${vehicle.model} (${vehicle.year})`}
                  value={vehicle._id}
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chọn dịch vụ *</Text>
          {services.map((service) => (
            <TouchableOpacity
              key={service._id}
              style={[
                styles.serviceItem,
                formData.serviceIds.includes(service._id) && styles.serviceItemSelected,
              ]}
              onPress={() => handleServiceToggle(service._id)}
            >
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceDescription}>{service.description}</Text>
                <Text style={styles.servicePrice}>
                  {service.basePrice.toLocaleString('vi-VN')} VNĐ
                </Text>
              </View>
              {formData.serviceIds.includes(service._id) && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chọn ngày *</Text>
          <TextInput
            style={styles.input}
            value={formData.scheduledDate}
            onChangeText={(text) => setFormData({ ...formData, scheduledDate: text })}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chọn giờ *</Text>
          <View style={styles.timeSlotContainer}>
            {timeSlots.map((time) => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timeSlot,
                  formData.scheduledTime === time && styles.timeSlotSelected,
                ]}
                onPress={() => setFormData({ ...formData, scheduledTime: time })}
              >
                <Text
                  style={[
                    styles.timeSlotText,
                    formData.scheduledTime === time && styles.timeSlotTextSelected,
                  ]}
                >
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ghi chú</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.customerNotes}
            onChangeText={(text) => setFormData({ ...formData, customerNotes: text })}
            placeholder="Nhập ghi chú (không bắt buộc)"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Tổng cộng</Text>
          <Text style={styles.summaryAmount}>
            {calculateTotalAmount().toLocaleString('vi-VN')} VNĐ
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Hủy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Đặt lịch</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  serviceItem: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceItemSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  checkmark: {
    fontSize: 24,
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  timeSlotContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  timeSlotSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#3b82f6',
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  timeSlotTextSelected: {
    color: '#fff',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryTitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 32,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AppointmentBookingScreen;
