import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { Alert } from "react-native";

const API_URL = "http://192.168.1.10:3000";

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
    // Socket.io disabled for mobile app - causing websocket errors
    // TODO: Re-enable when backend socket.io is properly configured for mobile
    if (false && isAuthenticated && token && user) {
      console.log("📡 Initializing Socket.io connection...");

      const socketInstance = io(API_URL, {
        auth: {
          token,
          userId: user._id,
          role: user.role,
        },
        transports: ["websocket", "polling"],
        timeout: 10000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      socketInstance.on("connect", () => {
        console.log("✅ Socket connected:", socketInstance.id);
        setIsConnected(true);
      });

      socketInstance.on("disconnect", (reason) => {
        console.log("❌ Socket disconnected:", reason);
        setIsConnected(false);
        if (reason === "io server disconnect") {
          socketInstance.connect();
        }
      });

      socketInstance.on("connect_error", (error) => {
        console.error("🔴 Socket connection error:", error);
        setIsConnected(false);
      });

      socketInstance.on("authenticated", () => {
        console.log("✅ Socket authenticated successfully");
      });

      socketInstance.on("authentication_error", (error) => {
        console.error("🔴 Socket authentication error:", error);
        Alert.alert(
          "Lỗi xác thực",
          "Không thể xác thực kết nối thời gian thực"
        );
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

      // Appointment status updates
      socketInstance.on("appointment_status_updated", (data) => {
        console.log("📋 Appointment status updated:", data);
      });

      // New appointment notifications
      socketInstance.on("new_appointment", (data) => {
        console.log("🆕 New appointment:", data);
      });

      // Technician assignment
      socketInstance.on("technician_assigned", (data) => {
        console.log("👨‍🔧 Technician assigned:", data);
        if (user._id === data.technicianId) {
          Alert.alert(
            "Phân công mới",
            `Bạn được phân công lịch hẹn: ${data.appointmentNumber}`
          );
        }
      });

      // Parts request notifications
      socketInstance.on("parts_requested", (data) => {
        console.log("🔧 Parts requested:", data);
      });

      socketInstance.on("parts_approved", (data) => {
        console.log("✅ Parts approved:", data);
      });

      // Invoice notifications
      socketInstance.on("invoice_generated", (data) => {
        console.log("💰 Invoice generated:", data);
        if (user._id === data.customerId) {
          Alert.alert(
            "Hóa đơn mới",
            `Hóa đơn ${data.invoiceNumber} đã được tạo`
          );
        }
      });

      socketInstance.on("payment_received", (data) => {
        console.log("💳 Payment received:", data);
      });

      socketInstance.on("payment_success", (data) => {
        console.log("✅ Payment success:", data);
        if (user._id === data.customerId) {
          Alert.alert(
            "Thanh toán thành công",
            `Số tiền: ${data.amount.toLocaleString("vi-VN")} VND`
          );
        }
      });

      socketInstance.on("new_paid_appointment", (data) => {
        console.log("💰 New paid appointment:", data);
      });

      // Chat messages
      socketInstance.on("new_message", (data) => {
        console.log("💬 New message:", data);
      });

      // Service reception
      socketInstance.on("service_reception_created", (data) => {
        console.log("📝 Service reception created:", data);
      });

      socketInstance.on("service_reception_approved", (data) => {
        console.log("✅ Service reception approved:", data);
      });

      // Error handling
      socketInstance.on("error", (error) => {
        console.error("🔴 Socket error:", error);
        if (error.type === "critical") {
          Alert.alert("Lỗi kết nối", "Lỗi kết nối nghiêm trọng");
        }
      });

      setSocket(socketInstance);

      return () => {
        console.log("🔌 Cleaning up socket connection");
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
      console.log(`🚪 Joined room: ${roomId}`);
    }
  };

  const leaveRoom = (roomId: string) => {
    if (socket && isConnected) {
      socket.emit("leave_room", roomId);
      console.log(`👋 Left room: ${roomId}`);
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
// Note: This won't work in React Native - using direct socket events instead
export const useCustomEvent = (
  eventName: string,
  handler: (data: any) => void
) => {
  const { socket } = useSocket();

  useEffect(() => {
    if (socket) {
      // Map custom event names to socket events
      const socketEventMap: Record<string, string> = {
        appointmentStatusUpdate: "appointment_status_updated",
        newAppointment: "new_appointment",
        technicianAssigned: "technician_assigned",
        partsRequested: "parts_requested",
        partsApproved: "parts_approved",
        invoiceGenerated: "invoice_generated",
        paymentReceived: "payment_received",
        paymentSuccess: "payment_success",
        newPaidAppointment: "new_paid_appointment",
        newMessage: "new_message",
        serviceReceptionCreated: "service_reception_created",
        serviceReceptionApproved: "service_reception_approved",
      };

      const socketEventName = socketEventMap[eventName] || eventName;

      socket.on(socketEventName, handler);

      return () => {
        socket.off(socketEventName, handler);
      };
    }
  }, [socket, eventName, handler]);
};
