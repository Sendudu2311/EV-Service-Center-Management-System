import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';

interface Part {
  _id: string;
  partNumber: string;
  name: string;
  category: string;
  manufacturer: string;
  pricing: {
    retail: number;
  };
  inventory: {
    currentStock: number;
    reservedStock: number;
    minimumStock: number;
  };
  supplier: {
    name: string;
    leadTimeDays: number;
  };
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: PartRequestData) => Promise<void>;
  part: Part;
  serviceReceptionId: string;
}

interface PartRequestData {
  parts: Array<{
    partId: string;
    partName: string;
    partNumber: string;
    quantity: number;
    reason: string;
    estimatedCost: number;
  }>;
  notes: string;
}

const AdditionalPartRequestModal: React.FC<Props> = ({
  visible,
  onClose,
  onSubmit,
  part,
  serviceReceptionId,
}) => {
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const available = part.inventory.currentStock - part.inventory.reservedStock;
  const quantityNum = parseInt(quantity) || 0;

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const getStockStatus = () => {
    if (quantityNum > available) {
      return {
        type: 'error',
        message: `Không đủ hàng. Chỉ có ${available} cái`,
        color: '#EF4444',
      };
    } else if (quantityNum > available - part.inventory.minimumStock) {
      return {
        type: 'warning',
        message: `Cảnh báo: Tồn kho sẽ < mức tối thiểu`,
        color: '#F59E0B',
      };
    }
    return {
      type: 'success',
      message: `Đủ hàng tồn kho`,
      color: '#10B981',
    };
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập lý do yêu cầu phụ tùng');
      return;
    }

    if (quantityNum < 1) {
      Alert.alert('Lỗi', 'Số lượng phải >= 1');
      return;
    }

    try {
      setLoading(true);
      const data: PartRequestData = {
        parts: [
          {
            partId: part._id,
            partName: part.name,
            partNumber: part.partNumber,
            quantity: quantityNum,
            reason: reason.trim(),
            estimatedCost: part.pricing.retail,
          },
        ],
        notes: notes.trim(),
      };

      await onSubmit(data);

      // Reset form
      setQuantity('1');
      setReason('');
      setNotes('');
      onClose();

      Alert.alert('Thành công', 'Yêu cầu phụ tùng đã được gửi đến nhân viên');
    } catch (error: any) {
      console.error('Error submitting part request:', error);
      Alert.alert('Lỗi', error.message || 'Không thể gửi yêu cầu phụ tùng');
    } finally {
      setLoading(false);
    }
  };

  const stockStatus = getStockStatus();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Yêu cầu phụ tùng thêm</Text>
              <Text style={styles.headerSubtitle}>
                {part.name} (#{part.partNumber})
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Part Info */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nhà sản xuất</Text>
                <Text style={styles.infoValue}>{part.manufacturer}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Giá bán</Text>
                <Text style={styles.infoValueBold}>
                  {formatVND(part.pricing.retail)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tồn kho</Text>
                <Text style={styles.infoValue}>{part.inventory.currentStock} cái</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Có sẵn</Text>
                <Text style={[styles.infoValue, { color: '#10B981' }]}>
                  {available} cái
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nhà cung cấp</Text>
                <Text style={styles.infoValue}>
                  {part.supplier.name} ({part.supplier.leadTimeDays} ngày)
                </Text>
              </View>
            </View>

            {/* Quantity */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Số lượng yêu cầu</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
                placeholder="Nhập số lượng"
                placeholderTextColor="#9CA3AF"
              />
              <Text style={styles.totalCost}>
                Tổng giá trị: {formatVND(part.pricing.retail * quantityNum)}
              </Text>
            </View>

            {/* Stock Status */}
            <View style={[styles.statusCard, { borderColor: stockStatus.color }]}>
              <Text style={[styles.statusText, { color: stockStatus.color }]}>
                {stockStatus.message}
              </Text>
            </View>

            {/* Reason */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Lý do yêu cầu phụ tùng *</Text>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={4}
                value={reason}
                onChangeText={setReason}
                placeholder="Mô tả chi tiết lý do cần phụ tùng này, tình trạng hiện tại của xe..."
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Notes */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Ghi chú thêm</Text>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
                placeholder="Thông tin bổ sung về yêu cầu (nếu có)..."
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading || !reason.trim() || quantityNum < 1}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Gửi yêu cầu</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#6B7280',
    fontWeight: '300',
  },
  content: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  infoValueBold: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '700',
  },
  formGroup: {
    marginBottom: 16,
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
  },
  totalCost: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 8,
  },
  statusCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  submitButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default AdditionalPartRequestModal;
