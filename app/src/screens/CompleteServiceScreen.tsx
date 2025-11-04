import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TechnicianStackParamList } from '../types/navigation.types';
import { completeWork } from '../services/technician.api';

type Props = NativeStackScreenProps<TechnicianStackParamList, 'CompleteService'>;

const CompleteServiceScreen: React.FC<Props> = ({ route, navigation }) => {
  const { appointmentId } = route.params;

  const [completionNotes, setCompletionNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    // Validate notes (optional but recommended)
    if (!completionNotes.trim()) {
      Alert.alert(
        'Xác nhận',
        'Bạn chưa nhập ghi chú hoàn thành. Bạn có muốn tiếp tục không?',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Tiếp tục', onPress: () => submitCompletion() },
        ]
      );
      return;
    }

    submitCompletion();
  };

  const submitCompletion = async () => {
    try {
      setLoading(true);

      await completeWork(appointmentId, {
        notes: completionNotes.trim(),
      });

      Alert.alert(
        'Thành công',
        'Đã hoàn thành công việc. Hệ thống đã tự động giảm số lượng phụ tùng trong kho.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to work queue
              navigation.reset({
                index: 0,
                routes: [{ name: 'WorkQueue' }],
              });
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error completing work:', error);
      Alert.alert(
        'Lỗi',
        error.response?.data?.message || 'Không thể hoàn thành công việc. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>✅</Text>
          <Text style={styles.headerTitle}>Hoàn thành công việc</Text>
          <Text style={styles.headerSubtitle}>
            Xác nhận hoàn thành tất cả công việc cho appointment này
          </Text>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Hệ thống sẽ tự động:</Text>
            <Text style={styles.infoItem}>• Chuyển trạng thái appointment sang "Hoàn thành"</Text>
            <Text style={styles.infoItem}>• Giảm số lượng phụ tùng đã sử dụng trong kho</Text>
            <Text style={styles.infoItem}>• Tính toán thời gian hoàn thành thực tế</Text>
            <Text style={styles.infoItem}>• Cho phép staff tạo hóa đơn thanh toán</Text>
          </View>
        </View>

        {/* Completion Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Ghi chú hoàn thành <Text style={styles.optional}>(tùy chọn)</Text>
          </Text>
          <TextInput
            style={styles.textArea}
            placeholder="Nhập ghi chú về công việc đã hoàn thành, vấn đề cần lưu ý, khuyến nghị cho khách hàng..."
            placeholderTextColor="#9ca3af"
            value={completionNotes}
            onChangeText={setCompletionNotes}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          <Text style={styles.hint}>
            Ghi chú này sẽ được lưu vào lịch sử công việc và có thể xem lại sau này
          </Text>
        </View>

        {/* Example Notes */}
        <View style={styles.examplesBox}>
          <Text style={styles.examplesTitle}>💡 Ví dụ ghi chú:</Text>
          <Text style={styles.exampleItem}>
            "Đã thay pin, kiểm tra hệ thống sạc hoạt động tốt. Khuyến nghị khách hàng kiểm tra lại sau 1000km."
          </Text>
          <Text style={styles.exampleItem}>
            "Hoàn thành bảo dưỡng định kỳ. Phát hiện lốp trước trái mòn 60%, nên thay trong 2 tháng tới."
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={handleCancel}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Hủy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.completeButton, loading && styles.buttonDisabled]}
          onPress={handleComplete}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.completeButtonText}>✅ Xác nhận hoàn thành</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#dbeafe',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  infoItem: {
    fontSize: 13,
    color: '#1e3a8a',
    marginBottom: 4,
  },
  section: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  optional: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6b7280',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 120,
    backgroundColor: '#ffffff',
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  examplesBox: {
    backgroundColor: '#fef3c7',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  exampleItem: {
    fontSize: 13,
    color: '#78350f',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  completeButton: {
    backgroundColor: '#10b981',
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default CompleteServiceScreen;
