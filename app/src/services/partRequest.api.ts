import api from './api';

interface PartRequestData {
  parts: Array<{
    partId: string;
    partName: string;
    partNumber: string;
    quantity: number;
    reason: string;
    estimatedCost: number;
  }>;
  notes: string;
}

export const createAdditionalPartRequest = async (
  serviceReceptionId: string,
  data: PartRequestData
) => {
  try {
    const response = await api.post('/api/part-requests', {
      type: 'additional_during_service',
      serviceReceptionId,
      requestedParts: data.parts,
      requestNotes: data.notes,
    });
    return { success: true, data: response.data.data };
  } catch (error: any) {
    console.error('Error creating additional part request:', error);
    throw new Error(
      error.response?.data?.message || 'Failed to create part request'
    );
  }
};

export const getPartRequestsByAppointment = async (appointmentId: string) => {
  try {
    const response = await api.get(`/api/part-requests/appointment/${appointmentId}`);
    return { success: true, data: response.data.data };
  } catch (error: any) {
    console.error('Error fetching part requests:', error);
    throw new Error(
      error.response?.data?.message || 'Failed to fetch part requests'
    );
  }
};
