/**
 * Navigation type definitions for React Navigation
 */

// Technician Stack Navigator
export type TechnicianStackParamList = {
  WorkQueue: undefined;
  Schedule: undefined;
  AppointmentDetail: {
    appointmentId: string;
  };
  CreateReception: {
    appointmentId: string;
  };
  ViewReception: {
    appointmentId: string;
  };
  WorkProgress: {
    appointmentId: string;
  };
  CompleteService: {
    appointmentId: string;
  };
};

// Add other navigators as needed
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Dashboard: undefined;
  Vehicles: undefined;
  Appointments: undefined;
  Invoices: undefined;
  Profile: undefined;
};
