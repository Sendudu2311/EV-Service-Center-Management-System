import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: string[];
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  sendMessage: (roomId: string, message: any) => void;
  emitStatusUpdate: (appointmentId: string, status: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const { user, token, isAuthenticated } = useAuth();

  useEffect(() => {
    // Disable Socket.io in production (Vercel deployment)
    if (import.meta.env.PROD) {
      console.log("Socket.io disabled in production mode");
      setSocket(null);
      setIsConnected(false);
      return;
    }

    if (isAuthenticated && token && user) {
      const socketInstance = io(
        import.meta.env.VITE_API_URL ??
          (import.meta.env.PROD ? "" : "http://localhost:3000"),
        {
          auth: {
            token,
            userId: user._id,
            role: user.role,
            // serviceCenterId removed - single center architecture
          },
          transports: ["websocket", "polling"],
          timeout: 10000,
        }
      );

      socketInstance.on("connect", () => {
        console.log("Socket connected:", socketInstance.id);
        setIsConnected(true);
        // Only show connection success for first time or after disconnect
        if (!isConnected) {
          toast.success("Kết nối cập nhật thời gian thực thành công", {
            duration: 3000,
          });
        }
      });

      socketInstance.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
        setIsConnected(false);
        if (reason === "io server disconnect") {
          socketInstance.connect();
        }
      });

      socketInstance.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        setIsConnected(false);
        // Only show error if user is actively using the app
        if (document.visibilityState === "visible") {
          toast.error("Mất kết nối cập nhật thời gian thực", {
            duration: 4000,
          });
        }
      });

      socketInstance.on("authenticated", () => {
        console.log("Socket authenticated successfully");
      });

      socketInstance.on("authentication_error", (error) => {
        console.error("Socket authentication error:", error);
        toast.error("Lỗi xác thực kết nối thời gian thực");
      });

      // Online users tracking
      socketInstance.on("online_users", (users: string[]) => {
        setOnlineUsers(users);
      });

      socketInstance.on("user_online", (userId: string) => {
        setOnlineUsers((prev) => [
          ...prev.filter((id) => id !== userId),
          userId,
        ]);
      });

      socketInstance.on("user_offline", (userId: string) => {
        setOnlineUsers((prev) => prev.filter((id) => id !== userId));
      });

      // Appointment status updates - Only notify if user is involved
      socketInstance.on("appointment_status_updated", (data) => {
        console.log("Appointment status updated:", data);

        // Only show notification if it's user's appointment or they're the technician
        const isUserInvolved =
          data.customerId === user._id || data.technicianId === user._id;
        if (isUserInvolved) {
          toast.info(`Lịch hẹn ${data.appointmentNumber}: ${data.status}`, {
            duration: 4000,
          });
        }

        window.dispatchEvent(
          new CustomEvent("appointmentStatusUpdate", { detail: data })
        );
      });

      // New appointment notifications - Only for staff/admin
      socketInstance.on("new_appointment", (data) => {
        console.log("New appointment:", data);
        if (user.role === "staff" || user.role === "admin") {
          toast.info(`Lịch hẹn mới: ${data.appointmentNumber}`, {
            duration: 5000,
          });
        }
        window.dispatchEvent(
          new CustomEvent("newAppointment", { detail: data })
        );
      });

      // Technician assignment - Only notify the assigned technician
      socketInstance.on("technician_assigned", (data) => {
        console.log("Technician assigned:", data);
        if (user._id === data.technicianId) {
          toast.success(
            `Bạn được phân công lịch hẹn: ${data.appointmentNumber}`,
            { duration: 6000 }
          );
        }
        window.dispatchEvent(
          new CustomEvent("technicianAssigned", { detail: data })
        );
      });

      // Parts request notifications - Reduce spam
      socketInstance.on("parts_requested", (data) => {
        console.log("Parts requested:", data);
        // Only notify staff/admin and only during business hours
        const hour = new Date().getHours();
        if (
          (user.role === "staff" || user.role === "admin") &&
          hour >= 8 &&
          hour <= 18
        ) {
          toast.info(`Yêu cầu phụ tùng: ${data.appointmentNumber}`, {
            duration: 4000,
          });
        }
        window.dispatchEvent(
          new CustomEvent("partsRequested", { detail: data })
        );
      });

      socketInstance.on("parts_approved", (data) => {
        console.log("Parts approved:", data);
        // Only notify the person who requested
        if (user._id === data.requestedBy) {
          toast.success(`Phụ tùng đã được duyệt: ${data.requestNumber}`, {
            duration: 5000,
          });
        }
        window.dispatchEvent(
          new CustomEvent("partsApproved", { detail: data })
        );
      });

      // Invoice notifications - Only for involved users
      socketInstance.on("invoice_generated", (data) => {
        console.log("Invoice generated:", data);
        if (user._id === data.customerId) {
          toast.success(`Hóa đơn mới: ${data.invoiceNumber}`, {
            duration: 5000,
          });
        }
        window.dispatchEvent(
          new CustomEvent("invoiceGenerated", { detail: data })
        );
      });

      socketInstance.on("payment_received", (data) => {
        console.log("Payment received:", data);
        // Only notify staff/admin, not every payment
        if (
          (user.role === "staff" || user.role === "admin") &&
          data.amount > 1000000
        ) {
          toast.success(`Thanh toán lớn: ${data.invoiceNumber}`, {
            duration: 4000,
          });
        }
        window.dispatchEvent(
          new CustomEvent("paymentReceived", { detail: data })
        );
      });

      // Payment success notifications
      socketInstance.on("payment_success", (data) => {
        console.log("Payment success:", data);
        if (user._id === data.customerId || user.role === "admin") {
          toast.success(
            `Thanh toán thành công: ${data.amount.toLocaleString("vi-VN")} VND`,
            {
              duration: 6000,
              icon: "✅",
            }
          );
        }
        window.dispatchEvent(
          new CustomEvent("paymentSuccess", { detail: data })
        );
      });

      // New paid appointment notifications for staff
      socketInstance.on("new_paid_appointment", (data) => {
        console.log("New paid appointment:", data);
        if (user.role === "staff" || user.role === "admin") {
          toast.success(`Lịch hẹn đã thanh toán: ${data.appointmentNumber}`, {
            duration: 5000,
            icon: "💰",
          });
        }
        window.dispatchEvent(
          new CustomEvent("newPaidAppointment", { detail: data })
        );
      });

      // Chat messages - Only if not in chat window
      socketInstance.on("new_message", (data) => {
        console.log("New message:", data);
        // Only notify if sender is different and user not currently in chat
        if (
          data.senderId !== user._id &&
          !window.location.pathname.includes("/chat")
        ) {
          toast.info(`Tin nhắn từ ${data.senderName}`, { duration: 3000 });
        }
        window.dispatchEvent(new CustomEvent("newMessage", { detail: data }));
      });

      // Service reception - Reduce notification frequency
      socketInstance.on("service_reception_created", (data) => {
        console.log("Service reception created:", data);
        // Only notify if user is manager or admin
        if (
          user.role === "admin" ||
          (user.role === "staff" && user.isManager)
        ) {
          toast.info(`Phiếu tiếp nhận: ${data.appointmentNumber}`, {
            duration: 4000,
          });
        }
        window.dispatchEvent(
          new CustomEvent("serviceReceptionCreated", { detail: data })
        );
      });

      socketInstance.on("service_reception_approved", (data) => {
        console.log("Service reception approved:", data);
        if (user._id === data.technicianId) {
          toast.success(`Phiếu tiếp nhận đã duyệt: ${data.appointmentNumber}`, {
            duration: 4000,
          });
        }
        window.dispatchEvent(
          new CustomEvent("serviceReceptionApproved", { detail: data })
        );
      });

      // Error handling - Only critical errors
      socketInstance.on("error", (error) => {
        console.error("Socket error:", error);
        if (error.type === "critical") {
          toast.error("Lỗi kết nối nghiêm trọng");
        }
      });

      setSocket(socketInstance);

      return () => {
        console.log("Cleaning up socket connection");
        socketInstance.removeAllListeners();
        socketInstance.disconnect();
        setSocket(null);
        setIsConnected(false);
        setOnlineUsers([]);
      };
    }
  }, [isAuthenticated, token, user]);

  const joinRoom = (roomId: string) => {
    if (socket && isConnected) {
      socket.emit("join_room", roomId);
      console.log(`Joined room: ${roomId}`);
    }
  };

  const leaveRoom = (roomId: string) => {
    if (socket && isConnected) {
      socket.emit("leave_room", roomId);
      console.log(`Left room: ${roomId}`);
    }
  };

  const sendMessage = (roomId: string, message: any) => {
    if (socket && isConnected) {
      socket.emit("send_message", {
        roomId,
        message: {
          ...message,
          senderId: user?._id,
          senderName: user?.fullName,
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  const emitStatusUpdate = (appointmentId: string, status: string) => {
    if (socket && isConnected) {
      socket.emit("appointment_status_update", {
        appointmentId,
        status,
        updatedBy: user?._id,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    onlineUsers,
    joinRoom,
    leaveRoom,
    sendMessage,
    emitStatusUpdate,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

// Custom hook for listening to socket events
export const useSocketEvent = (
  eventName: string,
  handler: (data: any) => void
) => {
  const { socket } = useSocket();

  useEffect(() => {
    if (socket) {
      socket.on(eventName, handler);
      return () => {
        socket.off(eventName, handler);
      };
    }
  }, [socket, eventName, handler]);
};

// Custom hook for listening to custom window events
export const useCustomEvent = (
  eventName: string,
  handler: (data: any) => void
) => {
  useEffect(() => {
    const handleEvent = (event: CustomEvent) => {
      handler(event.detail);
    };

    window.addEventListener(eventName, handleEvent as EventListener);
    return () => {
      window.removeEventListener(eventName, handleEvent as EventListener);
    };
  }, [eventName, handler]);
};
