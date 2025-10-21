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
import { invoicesAPI } from '../services/api';

interface Invoice {
  _id: string;
  appointmentId: {
    vehicleId: {
      make: string;
      model: string;
      year: number;
    };
    scheduledDate: string;
  };
  totalAmount: number;
  status: string;
  paymentMethod?: string;
  paidAt?: string;
  createdAt: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

const InvoicesScreen: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await invoicesAPI.getAll();
      const invoiceData = (response.data?.data || response.data || []) as any;
      setInvoices(Array.isArray(invoiceData) ? invoiceData : []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách hóa đơn');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInvoices();
    setRefreshing(false);
  };

  const handlePayInvoice = async (invoiceId: string) => {
    Alert.alert(
      'Thanh toán',
      'Chọn phương thức thanh toán',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Tiền mặt',
          onPress: async () => {
            try {
              await invoicesAPI.pay(invoiceId, 'cash');
              Alert.alert('Thành công', 'Thanh toán thành công');
              fetchInvoices();
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể thanh toán');
            }
          },
        },
        {
          text: 'VNPay',
          onPress: async () => {
            Alert.alert('Thông báo', 'Chức năng thanh toán VNPay sẽ được cập nhật');
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#f59e0b',
      paid: '#10b981',
      cancelled: '#ef4444',
      refunded: '#6b7280',
    };
    return colors[status] || '#6b7280';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: 'Chưa thanh toán',
      paid: 'Đã thanh toán',
      cancelled: 'Đã hủy',
      refunded: 'Đã hoàn tiền',
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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hóa đơn</Text>
        <Text style={styles.headerSubtitle}>Lịch sử thanh toán</Text>
      </View>

      <View style={styles.content}>
        {invoices.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Chưa có hóa đơn nào</Text>
          </View>
        ) : (
          invoices.map((invoice) => (
            <View key={invoice._id} style={styles.invoiceCard}>
              <View style={styles.invoiceHeader}>
                <View>
                  <Text style={styles.invoiceId}>#{invoice._id.slice(-6).toUpperCase()}</Text>
                  <Text style={styles.invoiceDate}>
                    {formatDate(invoice.createdAt)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(invoice.status) },
                  ]}
                >
                  <Text style={styles.statusText}>{getStatusText(invoice.status)}</Text>
                </View>
              </View>

              {invoice.appointmentId && (
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleName}>
                    {invoice.appointmentId.vehicleId.make}{' '}
                    {invoice.appointmentId.vehicleId.model}
                  </Text>
                  <Text style={styles.vehicleYear}>
                    {invoice.appointmentId.vehicleId.year}
                  </Text>
                </View>
              )}

              <View style={styles.itemsSection}>
                <Text style={styles.itemsTitle}>Chi tiết:</Text>
                {invoice.items.map((item, index) => (
                  <View key={index} style={styles.item}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemDescription}>{item.description}</Text>
                      <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                    </View>
                    <Text style={styles.itemPrice}>
                      {item.totalPrice.toLocaleString('vi-VN')} VNĐ
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.totalSection}>
                <Text style={styles.totalLabel}>Tổng cộng:</Text>
                <Text style={styles.totalAmount}>
                  {invoice.totalAmount.toLocaleString('vi-VN')} VNĐ
                </Text>
              </View>

              {invoice.status === 'pending' && (
                <TouchableOpacity
                  style={styles.payButton}
                  onPress={() => handlePayInvoice(invoice._id)}
                >
                  <Text style={styles.payButtonText}>Thanh toán ngay</Text>
                </TouchableOpacity>
              )}

              {invoice.paymentMethod && (
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentLabel}>Phương thức:</Text>
                  <Text style={styles.paymentValue}>
                    {invoice.paymentMethod === 'cash' ? 'Tiền mặt' : 'VNPay'}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
  },
  invoiceCard: {
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
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  invoiceId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  invoiceDate: {
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
  vehicleInfo: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  vehicleYear: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  itemsSection: {
    marginBottom: 16,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemDescription: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 16,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  payButton: {
    backgroundColor: '#10b981',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  paymentLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
});

export default InvoicesScreen;
