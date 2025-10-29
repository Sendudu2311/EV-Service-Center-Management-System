import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import InvoicePreview from "./InvoicePreview";
// import { invoicesAPI } from '../../services/api';
// import toast from 'react-hot-toast';

interface InvoiceGenerationModalProps {
  appointment: any;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (appointmentId: string) => Promise<void>;
}

const InvoiceGenerationModal: React.FC<InvoiceGenerationModalProps> = ({
  appointment,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);

  useEffect(() => {
    if (isOpen && appointment) {
      generatePreview();
    }
  }, [isOpen, appointment]);

  const generatePreview = () => {
    // Calculate preview invoice data
    const depositAmount = appointment.depositInfo?.paid
      ? appointment.depositInfo.amount
      : 0;
    const servicesTotal = appointment.services.reduce(
      (sum: number, s: any) => sum + s.price * s.quantity,
      0
    );
    const subtotal = servicesTotal;
    const taxAmount = subtotal * 0.1;
    const totalAmount = subtotal + taxAmount;
    const remainingAmount = totalAmount - depositAmount;

    setPreviewInvoice({
      _id: `preview-${Date.now()}`,
      invoiceNumber: `INV${new Date().getFullYear().toString().slice(-2)}${(
        new Date().getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}${new Date()
        .getDate()
        .toString()
        .padStart(2, "0")}0001`,
      appointmentNumber: appointment.appointmentNumber,
      appointmentId: {
        appointmentNumber: appointment.appointmentNumber,
        customerId: {
          firstName: appointment.customerId.firstName,
          lastName: appointment.customerId.lastName,
          email: appointment.customerId.email,
          phone: appointment.customerId.phone,
          address: appointment.customerId.address,
        },
        vehicleId: {
          make: appointment.vehicleId.make,
          model: appointment.vehicleId.model,
          year: appointment.vehicleId.year,
          licensePlate: appointment.vehicleId.licensePlate,
          vin: appointment.vehicleId.vin,
        },
      },
      customerInfo: {
        name: `${appointment.customerId.firstName} ${appointment.customerId.lastName}`,
        email: appointment.customerId.email,
        phone: appointment.customerId.phone,
      },
      vehicleInfo: {
        make: appointment.vehicleId.make,
        model: appointment.vehicleId.model,
        year: appointment.vehicleId.year,
        licensePlate: appointment.vehicleId.licensePlate,
      },
      serviceItems: appointment.services,
      lineItems: appointment.services.map((service: any) => ({
        type: "service" as const,
        itemId: service.serviceId || service._id,
        description: service.serviceName || service.name || "Service",
        quantity: service.quantity || 1,
        unitPrice: service.price || 0,
        totalPrice: (service.price || 0) * (service.quantity || 1),
        taxable: true,
      })),
      totals: {
        subtotal,
        taxAmount,
        depositAmount,
        totalAmount,
        remainingAmount,
      },
      paymentInfo: {
        paidAmount: depositAmount,
        remainingAmount,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        paymentStatus: depositAmount > 0 ? "partial" : "pending",
      },
      financialSummary: {
        subtotal,
        laborCost: 0,
        partsCost: 0,
        vatAmount: taxAmount,
        vatRate: 10,
        totalAmount,
        currency: "VND",
      },
      vietnameseCompliance: {
        vatRegistrationNumber: "0123456789",
        businessRegistrationNumber: "0123456789",
        issuedDate: new Date().toISOString(),
        legalNotes: ["Hóa đơn điện tử có giá trị pháp lý"],
      },
      status: "draft",
      createdBy: "System",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(appointment._id);
      onClose();
    } catch (error) {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-dark-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-dark-300 mb-8">
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <h2 className="text-xl font-bold text-white">
            Thông tin thanh toán
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-secondary"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Payment Summary */}
        {previewInvoice && (
          <div className="mb-6 p-4 bg-dark-900 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-lime-900 mb-3">
              Tóm tắt thanh toán
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-text-secondary">Tiền cọc đã trả:</span>
                <span className="ml-2 font-semibold text-green-600 text-green-600">
                  {previewInvoice.totals?.depositAmount
                    ? new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }).format(previewInvoice.totals.depositAmount)
                    : "0 ₫"}
                </span>
              </div>
              <div>
                <span className="text-text-secondary">Tổng tiền dịch vụ:</span>
                <span className="ml-2 font-semibold text-green-600">
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(previewInvoice.totals?.totalAmount || 0)}
                </span>
              </div>
              <div className="col-span-2 pt-2 border-t border-blue-200">
                <span className="text-lg font-bold text-red-600">
                  Số tiền cần trả thêm:
                </span>
                <span className="ml-2 text-xl font-bold text-red-600">
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(previewInvoice.totals?.remainingAmount || 0)}
                </span>
              </div>
            </div>
          </div>
        )}

        {previewInvoice && <InvoicePreview invoice={previewInvoice} />}

        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-dark-200 rounded-md text-text-secondary hover:bg-dark-900"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceGenerationModal;
