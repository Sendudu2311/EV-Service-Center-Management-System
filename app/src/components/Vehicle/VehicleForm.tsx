import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { vehiclesAPI } from '../../services/api';

interface Vehicle {
  _id?: string;
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
}

interface VehicleFormProps {
  visible: boolean;
  vehicle?: Vehicle | null;
  mode: 'create' | 'edit';
  onSuccess: () => void;
  onCancel: () => void;
}

const VehicleForm: React.FC<VehicleFormProps> = ({
  visible,
  vehicle,
  mode,
  onSuccess,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vin: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    batteryType: 'lithium-ion',
    batteryCapacity: 50,
    maxChargingPower: 50,
    range: 300,
    purchaseDate: '',
    mileage: 0,
    maintenanceInterval: 10000,
    timeBasedInterval: 12,
    warrantyExpiry: '',
  });

  useEffect(() => {
    if (vehicle && mode === 'edit') {
      setFormData({
        vin: vehicle.vin,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
        batteryType: vehicle.batteryType,
        batteryCapacity: vehicle.batteryCapacity,
        maxChargingPower: vehicle.maxChargingPower,
        range: vehicle.range,
        purchaseDate: vehicle.purchaseDate ? vehicle.purchaseDate.split('T')[0] : '',
        mileage: vehicle.mileage,
        maintenanceInterval: vehicle.maintenanceInterval,
        timeBasedInterval: vehicle.timeBasedInterval,
        warrantyExpiry: vehicle.warrantyExpiry ? vehicle.warrantyExpiry.split('T')[0] : '',
      });
    } else {
      // Reset form for create mode
      setFormData({
        vin: '',
        make: '',
        model: '',
        year: new Date().getFullYear(),
        color: '',
        batteryType: 'lithium-ion',
        batteryCapacity: 50,
        maxChargingPower: 50,
        range: 300,
        purchaseDate: '',
        mileage: 0,
        maintenanceInterval: 10000,
        timeBasedInterval: 12,
        warrantyExpiry: '',
      });
    }
  }, [vehicle, mode, visible]);

  const handleSubmit = async () => {
    // Validation
    if (!formData.vin || !formData.make || !formData.model) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'create') {
        await vehiclesAPI.create(formData);
        Alert.alert('Thành công', 'Đăng ký xe thành công');
      } else {
        await vehiclesAPI.update(vehicle!._id!, formData);
        Alert.alert('Thành công', 'Cập nhật xe thành công');
      }
      onSuccess();
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể lưu thông tin xe');
    } finally {
      setLoading(false);
    }
  };

  const batteryTypes = [
    { value: 'lithium-ion', label: 'Lithium-ion' },
    { value: 'lithium-iron-phosphate', label: 'Lithium Iron Phosphate (LiFePO4)' },
    { value: 'lithium-polymer', label: 'Lithium Polymer' },
    { value: 'nickel-metal-hydride', label: 'Nickel Metal Hydride' },
    { value: 'solid-state', label: 'Solid State' },
  ];

  const popularMakes = [
    'Tesla', 'BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen', 'Hyundai', 'Kia',
    'Nissan', 'Chevrolet', 'Ford', 'Volvo', 'Polestar', 'Lucid', 'Rivian',
    'VinFast', 'BYD', 'Xpeng', 'NIO', 'Li Auto', 'Other',
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {mode === 'create' ? 'Đăng ký xe mới' : 'Cập nhật thông tin xe'}
            </Text>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>

              <Text style={styles.label}>VIN *</Text>
              <TextInput
                style={styles.input}
                value={formData.vin}
                onChangeText={(text) => setFormData({ ...formData, vin: text })}
                placeholder="Nhập số VIN"
                placeholderTextColor="#9ca3af"
              />

              <Text style={styles.label}>Hãng xe *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.make}
                  onValueChange={(value) => setFormData({ ...formData, make: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="Chọn hãng xe" value="" />
                  {popularMakes.map((make) => (
                    <Picker.Item key={make} label={make} value={make} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>Mẫu xe *</Text>
              <TextInput
                style={styles.input}
                value={formData.model}
                onChangeText={(text) => setFormData({ ...formData, model: text })}
                placeholder="Nhập mẫu xe"
                placeholderTextColor="#9ca3af"
              />

              <Text style={styles.label}>Năm sản xuất</Text>
              <TextInput
                style={styles.input}
                value={formData.year.toString()}
                onChangeText={(text) => setFormData({ ...formData, year: parseInt(text) || 0 })}
                placeholder="Năm sản xuất"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
              />

              <Text style={styles.label}>Màu sắc</Text>
              <TextInput
                style={styles.input}
                value={formData.color}
                onChangeText={(text) => setFormData({ ...formData, color: text })}
                placeholder="Màu sắc"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thông tin pin</Text>

              <Text style={styles.label}>Loại pin</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.batteryType}
                  onValueChange={(value) => setFormData({ ...formData, batteryType: value })}
                  style={styles.picker}
                >
                  {batteryTypes.map((type) => (
                    <Picker.Item key={type.value} label={type.label} value={type.value} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>Dung lượng pin (kWh)</Text>
              <TextInput
                style={styles.input}
                value={formData.batteryCapacity.toString()}
                onChangeText={(text) =>
                  setFormData({ ...formData, batteryCapacity: parseFloat(text) || 0 })
                }
                placeholder="Dung lượng pin"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
              />

              <Text style={styles.label}>Công suất sạc tối đa (kW)</Text>
              <TextInput
                style={styles.input}
                value={formData.maxChargingPower.toString()}
                onChangeText={(text) =>
                  setFormData({ ...formData, maxChargingPower: parseFloat(text) || 0 })
                }
                placeholder="Công suất sạc"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
              />

              <Text style={styles.label}>Phạm vi hoạt động (km)</Text>
              <TextInput
                style={styles.input}
                value={formData.range.toString()}
                onChangeText={(text) => setFormData({ ...formData, range: parseInt(text) || 0 })}
                placeholder="Phạm vi hoạt động"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thông tin bảo dưỡng</Text>

              <Text style={styles.label}>Số km đã đi</Text>
              <TextInput
                style={styles.input}
                value={formData.mileage.toString()}
                onChangeText={(text) => setFormData({ ...formData, mileage: parseInt(text) || 0 })}
                placeholder="Số km"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
              />

              <Text style={styles.label}>Khoảng cách bảo dưỡng (km)</Text>
              <TextInput
                style={styles.input}
                value={formData.maintenanceInterval.toString()}
                onChangeText={(text) =>
                  setFormData({ ...formData, maintenanceInterval: parseInt(text) || 0 })
                }
                placeholder="Khoảng cách bảo dưỡng"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
              />

              <Text style={styles.label}>Thời gian bảo dưỡng (tháng)</Text>
              <TextInput
                style={styles.input}
                value={formData.timeBasedInterval.toString()}
                onChangeText={(text) =>
                  setFormData({ ...formData, timeBasedInterval: parseInt(text) || 0 })
                }
                placeholder="Thời gian bảo dưỡng"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
              />

              <Text style={styles.label}>Ngày mua xe</Text>
              <TextInput
                style={styles.input}
                value={formData.purchaseDate}
                onChangeText={(text) => setFormData({ ...formData, purchaseDate: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
              />

              <Text style={styles.label}>Hạn bảo hành</Text>
              <TextInput
                style={styles.input}
                value={formData.warrantyExpiry}
                onChangeText={(text) => setFormData({ ...formData, warrantyExpiry: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
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
                <Text style={styles.submitButtonText}>
                  {mode === 'create' ? 'Đăng ký' : 'Cập nhật'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
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
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
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

export default VehicleForm;
