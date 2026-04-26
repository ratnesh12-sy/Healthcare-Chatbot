import api from './api';

export interface DoctorAppointmentDTO {
    id: number;
    patientName: string;
    appointmentDate: string;
    durationMinutes: number;
    status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
    symptomsSummary: string;
}

export interface DashboardStats {
    todayCount: number;
    pendingCount: number;
    completedCount: number;
    todayAppointments: DoctorAppointmentDTO[];
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message: string;
}

export interface PaginatedResponse<T> {
    content: T[];
    pageable: any;
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

export const DoctorService = {
    getDashboardStats: async (): Promise<DashboardStats> => {
        const response = await api.get<ApiResponse<DashboardStats>>('/doctor/dashboard');
        return response.data.data;
    },

    getAppointmentsPaginated: async (page: number = 0, size: number = 10): Promise<PaginatedResponse<DoctorAppointmentDTO>> => {
        const response = await api.get<ApiResponse<PaginatedResponse<DoctorAppointmentDTO>>>(`/appointments/doctor?page=${page}&size=${size}`);
        return response.data.data;
    },

    updateAppointmentStatus: async (id: number, status: string, cancelReason?: string): Promise<DoctorAppointmentDTO> => {
        let url = `/appointments/${id}/status?status=${status}`;
        if (cancelReason) {
            url += `&cancelReason=${encodeURIComponent(cancelReason)}`;
        }
        const response = await api.patch<ApiResponse<DoctorAppointmentDTO>>(url);
        return response.data.data;
    },

    // Availability Methods
    saveWeeklySchedule: async (dayOfWeek: number, blocks: any[]): Promise<any> => {
        const response = await api.post<ApiResponse<any>>(`/doctor/availability/schedule/${dayOfWeek}`, blocks);
        return response.data.data;
    },

    getWeeklySchedule: async (): Promise<any[]> => {
        const response = await api.get<ApiResponse<any[]>>(`/doctor/availability/schedule`);
        return response.data.data;
    },

    saveException: async (exceptionData: any): Promise<any> => {
        const response = await api.post<ApiResponse<any>>(`/doctor/availability/exception`, exceptionData);
        return response.data.data;
    },

    getExceptions: async (): Promise<any[]> => {
        const response = await api.get<ApiResponse<any[]>>(`/doctor/availability/exception`);
        return response.data.data;
    }
};
