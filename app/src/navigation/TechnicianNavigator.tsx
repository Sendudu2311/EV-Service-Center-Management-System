import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TechnicianStackParamList } from '../types/navigation.types';

// Technician Screens
import TechnicianWorkQueueScreen from '../screens/TechnicianWorkQueueScreen';
import TechnicianScheduleScreen from '../screens/TechnicianScheduleScreen';
import TechnicianAppointmentDetailScreen from '../screens/TechnicianAppointmentDetailScreen';
import ServiceReceptionCreateScreen from '../screens/ServiceReceptionCreateScreen';
import ServiceReceptionViewScreen from '../screens/ServiceReceptionViewScreen';
import WorkProgressScreen from '../screens/WorkProgressScreen';
import CompleteServiceScreen from '../screens/CompleteServiceScreen';

const Stack = createNativeStackNavigator<TechnicianStackParamList>();

const TechnicianNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2563eb',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: '600',
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="WorkQueue"
        component={TechnicianWorkQueueScreen}
        options={{
          title: 'Hàng đợi công việc',
          headerLargeTitle: false,
        }}
      />
      <Stack.Screen
        name="Schedule"
        component={TechnicianScheduleScreen}
        options={{
          title: 'Lịch làm việc',
        }}
      />
      <Stack.Screen
        name="AppointmentDetail"
        component={TechnicianAppointmentDetailScreen}
        options={{
          title: 'Chi tiết lịch hẹn',
        }}
      />
      <Stack.Screen
        name="CreateReception"
        component={ServiceReceptionCreateScreen}
        options={{
          title: 'Lập phiếu tiếp nhận',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="ViewReception"
        component={ServiceReceptionViewScreen}
        options={{
          title: 'Xem phiếu tiếp nhận',
        }}
      />
      <Stack.Screen
        name="WorkProgress"
        component={WorkProgressScreen}
        options={{
          title: 'Tiến độ công việc',
        }}
      />
      <Stack.Screen
        name="CompleteService"
        component={CompleteServiceScreen}
        options={{
          title: 'Hoàn thành công việc',
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};

export default TechnicianNavigator;
