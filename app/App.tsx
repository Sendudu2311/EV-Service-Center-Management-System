import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { AuthProvider } from "./src/contexts/AuthContext";
import { SocketProvider } from "./src/contexts/SocketContext";
import RootNavigator from "./src/navigation/RootNavigator";

const linking = {
  prefixes: ["evservicecenter://"],
  config: {
    screens: {
      Main: {
        screens: {
          Home: "home",
          Appointments: "appointments",
          Profile: "profile",
        },
      },
      PaymentResult: "payment/vnpay-return",
    },
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SocketProvider>
          <NavigationContainer linking={linking}>
            <StatusBar style="auto" />
            <RootNavigator />
          </NavigationContainer>
        </SocketProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
