import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TechnicianStackParamList } from '../types/navigation.types';
import { getAppointmentDetail } from '../services/technician.api';
import api from '../services/api';

type Props = NativeStackScreenProps<TechnicianStackParamList, 'ViewReception'>;

interface ServiceReception {
  _id: string;
  receptionNumber: string;
  appointmentId: string | { _id: string };
  status: string;
  createdAt: string;
  submissionStatus: {
    submittedToStaff: boolean;
    staffReviewStatus: 'pending' | 'approved' | 'rejected' | 'needs_modification';
    reviewNotes?: string;
    reviewedBy?: {
      firstName: string;
      lastName: string;
    };
    reviewedAt?: string;
  };
  evChecklistItems: Array<{
    id: string;
    label: string;
    category: string;
    checked: boolean;
    status?: 'good' | 'warning' | 'critical';
    notes?: string;
  }>;
  customerItems: Array<{
    item: string;
    location: string;
    value: number;
    notes?: string;
  }>;
  recommendedServices: Array<{
    _id: string;
    serviceName: string;
    category: string;
    quantity: number;
    reason: string;
    estimatedCost: number;
    estimatedDuration: number;
    isCompleted?: boolean;
    completedBy?: {
      firstName: string;
      lastName: string;
    };
    completedAt?: string;
    customerApproved?: boolean;
  }>;
  requestedParts: Array<{
    _id: string;
    partName: string;
    partNumber: string;
    quantity: number;
    reason: string;
    estimatedCost: number;
    isApproved?: boolean;
    isAvailable?: boolean;
    availableQuantity?: number;
    shortfall?: number;
    customerApproved?: boolean;
    alternativePartSuggested?: any;
  }>;
  specialInstructions?: {
    fromCustomer?: string;
    fromStaff?: string;
    safetyPrecautions?: string[];
    warningNotes?: string[];
  };
  externalParts?: Array<{
    partName: string;
    partNumber: string;
    supplier?: {
      name: string;
      contact?: string;
      address?: string;
    };
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    warranty?: {
      period: number;
      description: string;
    };
    estimatedArrival?: string;
    orderStatus: string;
    notes?: string;
  }>;
  estimatedServiceTime: number;
  workflowHistory?: Array<{
    action: string;
    performedBy?: {
      firstName: string;
      lastName: string;
    };
    timestamp: string;
    changes?: {
      servicesAdded?: any[];
      servicesRemoved?: any[];
      servicesModified?: any[];
      partsAdded?: any[];
      partsRemoved?: any[];
      partsModified?: any[];
    };
    notes?: string;
  }>;
}

const ServiceReceptionViewScreen: React.FC<Props> = ({ route, navigation }) => {
  const { appointmentId } = route.params;

  const [loading, setLoading] = useState(true);
  const [reception, setReception] = useState<ServiceReception | null>(null);

  useEffect(() => {
    loadReception();
  }, [appointmentId]);

  const loadReception = async () => {
    try {
      setLoading(true);

      // Step 1: Get appointment to find serviceReceptionId
      const appointmentResponse = await getAppointmentDetail(appointmentId);

      if (!appointmentResponse.success || !appointmentResponse.data) {
        Alert.alert('Lỗi', 'Không tìm thấy appointment');
        navigation.goBack();
        return;
      }

      const appointment = appointmentResponse.data;

      // Step 2: Get all service receptions for this appointment
      // Find the latest non-rejected reception
      const receptionsResponse = await api.get(`/api/service-receptions/appointment/${appointmentId}/all`);

      if (!receptionsResponse.data.success || !receptionsResponse.data.data || receptionsResponse.data.data.length === 0) {
        Alert.alert('Lỗi', 'Chưa có phiếu tiếp nhận cho appointment này');
        navigation.goBack();
        return;
      }

      // Filter out rejected receptions and get the latest one
      const activeReceptions = receptionsResponse.data.data.filter(
        (r: any) => r.status !== 'rejected'
      );

      if (activeReceptions.length === 0) {
        Alert.alert('Lỗi', 'Tất cả phiếu tiếp nhận đã bị từ chối');
        navigation.goBack();
        return;
      }

      // Get the latest active reception (sorted by createdAt)
      const latestReception = activeReceptions.sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      // Step 3: Get full reception details
      const receptionResponse = await api.get(`/api/service-receptions/${latestReception._id}`);

      if (receptionResponse.data.success && receptionResponse.data.data) {
        setReception(receptionResponse.data.data);
      } else {
        Alert.alert('Lỗi', 'Không tìm thấy phiếu tiếp nhận');
        navigation.goBack();
      }
    } catch (error: any) {
      console.error('Error loading reception:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin phiếu tiếp nhận');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!reception) return null;

    const status = reception.submissionStatus.staffReviewStatus;

    const statusConfig = {
      pending: { label: 'Chờ duyệt', bg: '#fef3c7', color: '#92400e' },
      approved: { label: 'Đã duyệt', bg: '#d1fae5', color: '#065f46' },
      rejected: { label: 'Từ chối', bg: '#fee2e2', color: '#991b1b' },
      needs_modification: { label: 'Cần sửa', bg: '#fef3c7', color: '#92400e' },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
        <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
      </View>
    );
  };


  const formatVND = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  if (!reception) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Không tìm thấy phiếu tiếp nhận</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.receptionNumber}>#{reception.receptionNumber}</Text>
              <Text style={styles.createdDate}>
                Tạo lúc: {new Date(reception.createdAt).toLocaleString('vi-VN')}
              </Text>
            </View>
            {getStatusBadge()}
          </View>
        </View>

        {/* Review Status - Show if rejected or needs modification */}
        {(reception.submissionStatus.staffReviewStatus === 'rejected' ||
          reception.submissionStatus.staffReviewStatus === 'needs_modification') &&
          reception.submissionStatus.reviewNotes && (
            <View style={styles.reviewSection}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewIcon}>⚠️</Text>
                <Text style={styles.reviewTitle}>Góp ý từ Staff</Text>
              </View>
              <Text style={styles.reviewNotes}>{reception.submissionStatus.reviewNotes}</Text>
              {reception.submissionStatus.reviewedBy && (
                <Text style={styles.reviewer}>
                  - {reception.submissionStatus.reviewedBy.firstName}{' '}
                  {reception.submissionStatus.reviewedBy.lastName}
                </Text>
              )}
              {reception.submissionStatus.reviewedAt && (
                <Text style={styles.reviewDate}>
                  {new Date(reception.submissionStatus.reviewedAt).toLocaleString('vi-VN')}
                </Text>
              )}
            </View>
          )}

        {/* EV Checklist */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔋 EV Checklist</Text>
          {reception.evChecklistItems.map((item) => (
            <View key={item.id} style={styles.checklistItem}>
              <Text style={styles.checkboxIcon}>{item.checked ? '✅' : '⬜'}</Text>
              <View style={styles.checklistContent}>
                <Text style={[styles.checklistLabel, item.checked && styles.checkedLabel]}>
                  {item.label}
                </Text>
                {item.status && (
                  <Text
                    style={[
                      styles.checklistStatus,
                      item.status === 'critical' && styles.statusCritical,
                      item.status === 'warning' && styles.statusWarning,
                    ]}
                  >
                    {item.status === 'good' ? '✓ Tốt' : item.status === 'warning' ? '⚠ Cảnh báo' : '❌ Nghiêm trọng'}
                  </Text>
                )}
                {item.notes && <Text style={styles.itemNotes}>Ghi chú: {item.notes}</Text>}
              </View>
            </View>
          ))}
        </View>

        {/* Customer Items */}
        {reception.customerItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📦 Đồ đạc khách hàng</Text>
            {reception.customerItems.map((item, index) => (
              <View key={index} style={styles.customerItem}>
                <Text style={styles.customerItemName}>{item.item}</Text>
                <Text style={styles.customerItemDetail}>
                  Vị trí: {item.location} • Giá trị: {formatVND(item.value)}
                </Text>
                {item.notes && <Text style={styles.itemNotes}>Ghi chú: {item.notes}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Recommended Services */}
        {reception.recommendedServices.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔧 Dịch vụ đề xuất</Text>
            {reception.recommendedServices.map((service) => (
              <View key={service._id} style={styles.serviceItem}>
                <View style={styles.serviceHeader}>
                  <Text style={styles.serviceName}>{service.serviceName}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {service.customerApproved === true && (
                      <View style={{ backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#065f46' }}>✓ Đã duyệt</Text>
                      </View>
                    )}
                    {service.customerApproved === false && (
                      <View style={{ backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#991b1b' }}>✕ Từ chối</Text>
                      </View>
                    )}
                    {service.isCompleted && (
                      <View style={{ backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#1e40af' }}>✓ Hoàn thành</Text>
                      </View>
                    )}
                    <Text style={styles.serviceQuantity}>x{service.quantity}</Text>
                  </View>
                </View>
                <Text style={styles.serviceCategory}>Danh mục: {service.category}</Text>
                <Text style={styles.serviceReason}>Lý do: {service.reason}</Text>
                <View style={styles.serviceFooter}>
                  <Text style={styles.serviceCost}>{formatVND(service.estimatedCost * service.quantity)}</Text>
                  <Text style={styles.serviceDuration}>
                    {formatTime(service.estimatedDuration * service.quantity)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Requested Parts */}
        {reception.requestedParts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔩 Phụ tùng yêu cầu</Text>
            {reception.requestedParts.map((part) => (
              <View key={part._id} style={styles.partItem}>
                <View style={styles.partHeader}>
                  <Text style={styles.partName} numberOfLines={2}>{part.partName}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {part.isApproved && (
                    <View style={{ backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: '#065f46' }}>✓ Đã duyệt</Text>
                    </View>
                  )}
                  <Text style={styles.partQuantity}>x{part.quantity}</Text>
                </View>
                <Text style={styles.partNumber}>Mã: {part.partNumber}</Text>
                <Text style={styles.partReason}>Lý do: {part.reason}</Text>
                {part.customerApproved === false && (
                  <View style={{ backgroundColor: '#fee2e2', padding: 8, borderRadius: 6, marginTop: 8 }}>
                    <Text style={{ fontSize: 12, color: '#991b1b', fontWeight: '500' }}>
                      ✕ Khách hàng từ chối phụ tùng này
                    </Text>
                  </View>
                )}
                <Text style={styles.partCost}>{formatVND(part.estimatedCost * part.quantity)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* External Parts */}
        {reception.externalParts && reception.externalParts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📦 Phụ tùng đặt ngoài ({reception.externalParts.length})</Text>
            {reception.externalParts.map((part, index) => (
              <View key={index} style={styles.externalPartItem}>
                <View style={styles.partHeader}>
                  <Text style={styles.partName}>{part.partName}</Text>
                  <View style={{
                    backgroundColor: part.orderStatus === 'delivered' ? '#d1fae5' :
                                    part.orderStatus === 'in_transit' ? '#dbeafe' : '#fef3c7',
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 8
                  }}>
                    <Text style={{
                      fontSize: 10,
                      fontWeight: '600',
                      color: part.orderStatus === 'delivered' ? '#065f46' :
                             part.orderStatus === 'in_transit' ? '#1e40af' : '#92400e'
                    }}>
                      {part.orderStatus === 'delivered' ? 'Đã giao' :
                       part.orderStatus === 'in_transit' ? 'Đang vận chuyển' : 'Đang đặt hàng'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.partNumber}>Mã: {part.partNumber}</Text>
                {part.supplier && (
                  <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                    Nhà cung cấp: {part.supplier.name}
                  </Text>
                )}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <Text style={{ fontSize: 13, color: '#6b7280' }}>Số lượng: {part.quantity}</Text>
                  <Text style={{ fontSize: 13, color: '#6b7280' }}>Đơn giá: {formatVND(part.unitPrice)}</Text>
                </View>
                <Text style={[styles.partCost, { fontWeight: '700' }]}>Tổng: {formatVND(part.totalPrice)}</Text>
                {part.notes && (
                  <View style={{ backgroundColor: '#f9fafb', padding: 8, borderRadius: 6, marginTop: 8 }}>
                    <Text style={{ fontSize: 12, color: '#4b5563', fontStyle: 'italic' }}>
                      Ghi chú: {part.notes}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Special Instructions */}
        {reception.specialInstructions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Hướng dẫn đặc biệt</Text>

            {reception.specialInstructions.fromCustomer && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 }}>
                  Từ khách hàng:
                </Text>
                <Text style={styles.instructions}>{reception.specialInstructions.fromCustomer}</Text>
              </View>
            )}

            {reception.specialInstructions.fromStaff && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 }}>
                  Từ Technician:
                </Text>
                <Text style={styles.instructions}>{reception.specialInstructions.fromStaff}</Text>
              </View>
            )}

            {reception.specialInstructions.safetyPrecautions &&
             reception.specialInstructions.safetyPrecautions.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#dc2626', marginBottom: 4 }}>
                  ⚠️ Biện pháp an toàn:
                </Text>
                {reception.specialInstructions.safetyPrecautions.map((item, index) => (
                  <Text key={index} style={styles.instructions}>• {item}</Text>
                ))}
              </View>
            )}

            {reception.specialInstructions.warningNotes &&
             reception.specialInstructions.warningNotes.length > 0 && (
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#f59e0b', marginBottom: 4 }}>
                  ⚡ Lưu ý cảnh báo:
                </Text>
                {reception.specialInstructions.warningNotes.map((item, index) => (
                  <Text key={index} style={styles.instructions}>• {item}</Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>📊 Tổng quan</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Thời gian dự kiến:</Text>
            <Text style={styles.summaryValue}>{formatTime(reception.estimatedServiceTime)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tổng dịch vụ:</Text>
            <Text style={styles.summaryValue}>
              {formatVND(
                reception.recommendedServices.reduce(
                  (sum, s) => sum + s.estimatedCost * s.quantity,
                  0
                )
              )}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tổng phụ tùng:</Text>
            <Text style={styles.summaryValue}>
              {formatVND(
                reception.requestedParts.reduce((sum, p) => sum + p.estimatedCost * p.quantity, 0)
              )}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>TỔNG CỘNG:</Text>
            <Text style={styles.totalValue}>
              {formatVND(
                reception.recommendedServices.reduce(
                  (sum, s) => sum + s.estimatedCost * s.quantity,
                  0
                ) +
                  reception.requestedParts.reduce(
                    (sum, p) => sum + p.estimatedCost * p.quantity,
                    0
                  )
              )}
            </Text>
          </View>
        </View>

        {/* Workflow History - Staff Modifications */}
        {reception.workflowHistory && reception.workflowHistory.length > 0 && (() => {
          const staffModifications = reception.workflowHistory.filter(
            (entry) => entry.action === 'staff_modified_services_parts'
          );
          console.log('WorkflowHistory exists:', reception.workflowHistory.length);
          console.log('Staff modifications count:', staffModifications.length);

          if (staffModifications.length === 0) return null;

          return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🕒 Lịch sử thay đổi</Text>
            {staffModifications.map((entry, index) => (
                <View key={index} style={styles.workflowEntry}>
                  <View style={styles.workflowHeader}>
                    <Text style={styles.workflowAction}>✏️ Staff đã chỉnh sửa Services/Parts</Text>
                  </View>

                  {/* Staff info and timestamp */}
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                    {entry.performedBy && (
                      <Text style={styles.workflowInfo}>
                        👤 {entry.performedBy.firstName} {entry.performedBy.lastName}
                      </Text>
                    )}
                    <Text style={styles.workflowInfo}>
                      🕐 {new Date(entry.timestamp).toLocaleString('vi-VN')}
                    </Text>
                  </View>

                  {/* Changes Details */}
                  {entry.changes && (
                    <View style={{ marginTop: 12 }}>
                      {/* Services Changes */}
                      {((entry.changes.servicesAdded && entry.changes.servicesAdded.length > 0) ||
                        (entry.changes.servicesRemoved && entry.changes.servicesRemoved.length > 0) ||
                        (entry.changes.servicesModified && entry.changes.servicesModified.length > 0)) && (
                        <View style={{ marginBottom: 12 }}>
                          <Text style={styles.changesSubtitle}>Dịch vụ:</Text>
                          {entry.changes.servicesAdded?.map((service: any, i: number) => (
                            <View key={i} style={styles.changeItem}>
                              <Text style={styles.changeIcon}>🟢</Text>
                              <Text style={styles.changeText}>
                                Đã thêm: {service.serviceName} (x{service.quantity})
                              </Text>
                            </View>
                          ))}
                          {entry.changes.servicesModified?.map((mod: any, i: number) => (
                            <View key={i} style={styles.changeItem}>
                              <Text style={styles.changeIcon}>🟡</Text>
                              <Text style={styles.changeText}>
                                Đã sửa: {mod.after.serviceName} ({mod.before.quantity} → {mod.after.quantity})
                              </Text>
                            </View>
                          ))}
                          {entry.changes.servicesRemoved?.map((service: any, i: number) => (
                            <View key={i} style={styles.changeItem}>
                              <Text style={styles.changeIcon}>🔴</Text>
                              <Text style={styles.changeText}>Đã xóa: {service.serviceName}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Parts Changes */}
                      {((entry.changes.partsAdded && entry.changes.partsAdded.length > 0) ||
                        (entry.changes.partsRemoved && entry.changes.partsRemoved.length > 0) ||
                        (entry.changes.partsModified && entry.changes.partsModified.length > 0)) && (
                        <View>
                          <Text style={styles.changesSubtitle}>Phụ tùng:</Text>
                          {entry.changes.partsAdded?.map((part: any, i: number) => (
                            <View key={i} style={styles.changeItem}>
                              <Text style={styles.changeIcon}>🟢</Text>
                              <Text style={styles.changeText}>
                                Đã thêm: {part.partName} (x{part.quantity})
                              </Text>
                            </View>
                          ))}
                          {entry.changes.partsModified?.map((mod: any, i: number) => (
                            <View key={i} style={styles.changeItem}>
                              <Text style={styles.changeIcon}>🟡</Text>
                              <Text style={styles.changeText}>
                                Đã sửa: {mod.after.partName} ({mod.before.quantity} → {mod.after.quantity})
                              </Text>
                            </View>
                          ))}
                          {entry.changes.partsRemoved?.map((part: any, i: number) => (
                            <View key={i} style={styles.changeItem}>
                              <Text style={styles.changeIcon}>🔴</Text>
                              <Text style={styles.changeText}>Đã xóa: {part.partName}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {/* Reason */}
                  {entry.notes && (
                    <View style={styles.workflowReason}>
                      <Text style={styles.workflowReasonLabel}>📝 Lý do:</Text>
                      <Text style={styles.workflowReasonText}>{entry.notes}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          );
        })()}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Buttons */}
      {(reception.submissionStatus.staffReviewStatus === 'rejected' ||
        reception.submissionStatus.staffReviewStatus === 'needs_modification') && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              // Navigate to CreateReception with rejected reception data for creating new reception
              const appointmentId = typeof reception.appointmentId === 'string'
                ? reception.appointmentId
                : reception.appointmentId._id;
              navigation.navigate('CreateReception', {
                appointmentId,
                rejectedReceptionId: reception._id, // Pass rejected reception ID to pre-fill form
              });
            }}
          >
            <Text style={styles.editButtonText}>✏️ Sửa và gửi phiếu mới</Text>
          </TouchableOpacity>
        </View>
      )}
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
  header: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receptionNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  createdDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reviewSection: {
    backgroundColor: '#fef3c7',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
  },
  reviewNotes: {
    fontSize: 14,
    color: '#78350f',
    marginBottom: 8,
    lineHeight: 20,
  },
  reviewer: {
    fontSize: 12,
    color: '#92400e',
    fontStyle: 'italic',
  },
  reviewDate: {
    fontSize: 11,
    color: '#92400e',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
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
  itemNotes: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  customerItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  customerItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  customerItemDetail: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  serviceItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  serviceQuantity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  serviceCategory: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  serviceReason: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  serviceCost: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  serviceDuration: {
    fontSize: 12,
    color: '#6b7280',
  },
  partItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  externalPartItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  partHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  partName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  partQuantity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  partNumber: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  partReason: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  partCost: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginTop: 8,
  },
  instructions: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  summarySection: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563eb',
  },
  bottomBar: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  editButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  workflowEntry: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    marginBottom: 12,
  },
  workflowHeader: {
    marginBottom: 4,
  },
  workflowAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  workflowInfo: {
    fontSize: 12,
    color: '#78350f',
  },
  changesSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  changeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  changeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  changeText: {
    fontSize: 13,
    color: '#4b5563',
    flex: 1,
  },
  workflowReason: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fbbf24',
    borderRadius: 6,
    padding: 10,
    marginTop: 12,
  },
  workflowReasonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  workflowReasonText: {
    fontSize: 12,
    color: '#78350f',
    fontStyle: 'italic',
  },
});

export default ServiceReceptionViewScreen;
