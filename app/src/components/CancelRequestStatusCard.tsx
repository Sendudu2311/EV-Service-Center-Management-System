import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";

interface CancelRequestStatusCardProps {
  cancelRequest: {
    reason: string;
    otherReason?: string;
    requestedAt: string;
    approvedAt?: string;
    approvedBy?: { firstName: string; lastName: string };
    approvedNotes?: string; // Notes from staff when approving cancellation
    refundProcessedAt?: string;
    refundProcessedBy?: { firstName: string; lastName: string };
    refundMethod: "cash" | "bank_transfer";
    refundAmount?: number;
    // Customer bank proof image is stored at top level of cancelRequest (not nested in customerBankInfo)
    customerBankProofImage?: string;
    // Support both field names (mobile sends customerBankInfo, backend stores it)
    customerBankInfo?: {
      bankName: string;
      accountNumber: string;
      accountHolder: string;
    };
    bankAccountInfo?: {
      accountName: string;
      accountNumber: string;
      bankName: string;
      qrCodeImage?: string;
    };
    notes?: string; // Legacy support
    refundProofImage?: string;
    refundNotes?: string; // Notes from staff when processing refund
  };
  status: string;
}

const CancelRequestStatusCard: React.FC<CancelRequestStatusCardProps> = ({
  cancelRequest,
  status,
}) => {
  const formatDateTime = (date: string) => {
    if (!date) return "Không xác định";
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return "Không xác định";
      }
      return dateObj.toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Không xác định";
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return "0 ₫";
    }
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const reasonLabels: Record<string, string> = {
    schedule_conflict: "Xung đột lịch trình",
    vehicle_issue: "Vấn đề về phương tiện",
    service_not_needed: "Không còn cần dịch vụ",
    found_alternative: "Đã tìm được lựa chọn khác",
    financial_reason: "Lý do tài chính",
    emergency: "Trường hợp khẩn cấp",
    dissatisfied_service: "Không hài lòng với dịch vụ",
    other: "Lý do khác",
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Yêu cầu hủy lịch hẹn</Text>
        {status === "cancel_requested" && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Chờ duyệt</Text>
          </View>
        )}
        {status === "cancel_approved" && (
          <View style={[styles.badge, styles.badgeApproved]}>
            <Text style={styles.badgeText}>Đã duyệt</Text>
          </View>
        )}
        {status === "cancelled" && cancelRequest.refundProcessedAt && (
          <View style={[styles.badge, styles.badgeCompleted]}>
            <Text style={styles.badgeText}>Đã hoàn tiền</Text>
          </View>
        )}
      </View>

      {/* Timeline */}
      <View style={styles.timeline}>
        {/* Step 1: Request */}
        <View style={styles.timelineItem}>
          <View style={styles.timelineIconContainer}>
            <View style={[styles.timelineIcon, styles.timelineIconActive]} />
          </View>
          <View style={styles.timelineContent}>
            <Text style={styles.timelineTitle}>Yêu cầu hủy</Text>
            <Text style={styles.timelineDate}>
              {formatDateTime(cancelRequest.requestedAt)}
            </Text>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Lý do hủy:</Text>
              <Text style={styles.infoValue}>
                {reasonLabels[cancelRequest.reason] || cancelRequest.reason}
              </Text>
              {cancelRequest.otherReason && (
                <Text style={styles.infoDetail}>
                  {cancelRequest.otherReason}
                </Text>
              )}
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Phương thức hoàn tiền:</Text>
              <Text style={styles.infoValue}>
                {cancelRequest.refundMethod === "cash"
                  ? "Tiền mặt"
                  : "Chuyển khoản"}
              </Text>
            </View>
            {cancelRequest.refundMethod === "bank_transfer" &&
              (cancelRequest.customerBankInfo ||
                cancelRequest.bankAccountInfo) && (
                <View style={styles.bankInfo}>
                  <Text style={styles.infoLabel}>Thông tin tài khoản:</Text>
                  {/* Support both field names */}
                  {cancelRequest.customerBankInfo ? (
                    <>
                      <Text style={styles.infoValue}>
                        {cancelRequest.customerBankInfo.accountHolder}
                      </Text>
                      <Text style={styles.infoDetail}>
                        {cancelRequest.customerBankInfo.accountNumber} -{" "}
                        {cancelRequest.customerBankInfo.bankName}
                      </Text>
                    </>
                  ) : cancelRequest.bankAccountInfo ? (
                    <>
                      <Text style={styles.infoValue}>
                        {cancelRequest.bankAccountInfo.accountName}
                      </Text>
                      <Text style={styles.infoDetail}>
                        {cancelRequest.bankAccountInfo.accountNumber} -{" "}
                        {cancelRequest.bankAccountInfo.bankName}
                      </Text>
                    </>
                  ) : null}

                  {/* Customer Bank Proof Image - stored at top level of cancelRequest */}
                  {(cancelRequest.customerBankProofImage ||
                    cancelRequest.bankAccountInfo?.qrCodeImage) && (
                    <View style={styles.qrImageContainer}>
                      <Text style={styles.infoLabel}>
                        Ảnh chứng minh tài khoản:
                      </Text>
                      <Image
                        source={{
                          uri:
                            cancelRequest.customerBankProofImage ||
                            cancelRequest.bankAccountInfo?.qrCodeImage,
                        }}
                        style={styles.qrImage}
                        resizeMode="contain"
                      />
                    </View>
                  )}
                </View>
              )}
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Số tiền hoàn:</Text>
              <Text style={[styles.infoValue, styles.amountText]}>
                {formatCurrency(cancelRequest.refundAmount)}
              </Text>
            </View>
          </View>
        </View>

        {/* Step 2: Approval */}
        {cancelRequest.approvedAt && (
          <View style={styles.timelineItem}>
            <View style={styles.timelineIconContainer}>
              <View style={[styles.timelineIcon, styles.timelineIconActive]} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>Đã duyệt hủy</Text>
              <Text style={styles.timelineDate}>
                {formatDateTime(cancelRequest.approvedAt)}
              </Text>
              {cancelRequest.approvedBy && (
                <Text style={styles.infoDetail}>
                  Bởi: {cancelRequest.approvedBy.firstName}{" "}
                  {cancelRequest.approvedBy.lastName}
                </Text>
              )}
              {/* Display approvedNotes from staff when approving cancellation */}
              {(cancelRequest.approvedNotes || cancelRequest.notes) && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Ghi chú từ staff:</Text>
                  <Text style={styles.infoDetail}>
                    {cancelRequest.approvedNotes || cancelRequest.notes}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Step 3: Refund */}
        {cancelRequest.refundProcessedAt && (
          <View style={styles.timelineItem}>
            <View style={styles.timelineIconContainer}>
              <View style={[styles.timelineIcon, styles.timelineIconActive]} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>Đã hoàn tiền</Text>
              <Text style={styles.timelineDate}>
                {formatDateTime(cancelRequest.refundProcessedAt)}
              </Text>
              {cancelRequest.refundProcessedBy && (
                <Text style={styles.infoDetail}>
                  Bởi: {cancelRequest.refundProcessedBy.firstName}{" "}
                  {cancelRequest.refundProcessedBy.lastName}
                </Text>
              )}

              {/* Display refundNotes from staff when processing refund */}
              {cancelRequest.refundNotes && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Ghi chú từ staff:</Text>
                  <Text style={styles.infoDetail}>
                    {cancelRequest.refundNotes}
                  </Text>
                </View>
              )}

              {cancelRequest.refundProofImage && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Ảnh xác nhận hoàn tiền:</Text>
                  <Image
                    source={{ uri: cancelRequest.refundProofImage }}
                    style={styles.proofImage}
                    resizeMode="contain"
                  />
                </View>
              )}
            </View>
          </View>
        )}

        {/* Pending steps indicator */}
        {!cancelRequest.approvedAt && (
          <View style={styles.timelineItem}>
            <View style={styles.timelineIconContainer}>
              <View style={styles.timelineIconPending} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineTitle, styles.pendingText]}>
                Chờ staff duyệt
              </Text>
            </View>
          </View>
        )}
        {cancelRequest.approvedAt && !cancelRequest.refundProcessedAt && (
          <View style={styles.timelineItem}>
            <View style={styles.timelineIconContainer}>
              <View style={styles.timelineIconPending} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineTitle, styles.pendingText]}>
                Chờ xử lý hoàn tiền
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: "#F59E0B",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  badge: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeApproved: {
    backgroundColor: "#10B981",
  },
  badgeCompleted: {
    backgroundColor: "#3B82F6",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  timeline: {
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 16,
  },
  timelineIconContainer: {
    width: 30,
    alignItems: "center",
  },
  timelineIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
  },
  timelineIconActive: {
    backgroundColor: "#10B981",
  },
  timelineIconPending: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4B5563",
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
  },
  pendingText: {
    color: "#6B7280",
  },
  infoBox: {
    marginTop: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: "#111827",
  },
  infoDetail: {
    fontSize: 12,
    color: "#374151",
    marginTop: 2,
  },
  amountText: {
    fontWeight: "700",
    color: "#10B981",
    fontSize: 16,
  },
  bankInfo: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  qrImageContainer: {
    marginTop: 12,
  },
  qrImage: {
    width: "100%",
    height: 200,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
  },
  proofImage: {
    width: "100%",
    height: 200,
    marginTop: 8,
    borderRadius: 8,
  },
});

export default CancelRequestStatusCard;
