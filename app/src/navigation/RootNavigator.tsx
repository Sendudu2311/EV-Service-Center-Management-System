import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../contexts/AuthContext";

// Screens
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import DashboardScreen from "../screens/DashboardScreen";
import VehiclesScreen from "../screens/VehiclesScreen";
import AppointmentsScreen from "../screens/AppointmentsScreen";
import AppointmentDetailsScreen from "../screens/AppointmentDetailsScreen";
import CancelRequestScreen from "../screens/CancelRequestScreen";
import InvoicesScreen from "../screens/InvoicesScreen";
import ProfileScreen from "../screens/ProfileScreen";
import PaymentResultScreen from "../screens/PaymentResultScreen";

// Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Register: undefined;
  AppointmentDetails: {
    appointmentId: string;
  };
  CancelRequest: {
    appointment: any;
  };
  PaymentResult: {
    success?: string;
    transactionRef?: string;
    amount?: string;
    error?: string;
  };
};

export type MainTabParamList = {
  Home: undefined;
  Dashboard: undefined;
  Vehicles: undefined;
  Appointments: undefined;
  Invoices: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Main Tab Navigator for authenticated users
const MainTabs = () => {
  const { user } = useAuth();
  const isCustomer = user?.role === "customer";

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#3b82f6",
        tabBarInactiveTintColor: "#6b7280",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Trang chủ",
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: "Bảng điều khiển",
        }}
      />
      {isCustomer && (
        <Tab.Screen
          name="Vehicles"
          component={VehiclesScreen}
          options={{
            tabBarLabel: "Xe của tôi",
          }}
        />
      )}
      <Tab.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{
          tabBarLabel: "Lịch hẹn",
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Tài khoản",
        }}
      />
    </Tab.Navigator>
  );
};

// Root Navigator
const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Could show a loading screen here
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="AppointmentDetails"
            component={AppointmentDetailsScreen}
          />
          <Stack.Screen name="CancelRequest" component={CancelRequestScreen} />
          <Stack.Screen
            name="PaymentResult"
            component={PaymentResultScreen}
            options={{ presentation: "modal" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;
