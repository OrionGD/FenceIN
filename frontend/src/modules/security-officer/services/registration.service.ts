import type { VendorOption, SiteOption, ShiftOption, WorkerRegistrationInput, WorkerRegistrationResponse } from '../types/registration.types';
import { api } from '../../../utils/api';

export const registrationService = {
  async getVendors(): Promise<VendorOption[]> {
    const { data } = await api.get('/api/v1/vendors');
    const vendors = data.success !== undefined ? data.data : data;
    return vendors.map((v: any) => ({
      id: v.id,
      name: v.companyName || v.name,
    }));
  },

  async getSites(): Promise<SiteOption[]> {
    const { data } = await api.get('/api/v1/sites');
    return data.success !== undefined ? data.data : data;
  },

  async getShifts(): Promise<ShiftOption[]> {
    const { data } = await api.get('/api/v1/shifts');
    return data.success !== undefined ? data.data : data;
  },

  async registerWorker(dto: WorkerRegistrationInput): Promise<WorkerRegistrationResponse> {
    const { data: raw } = await api.post('/api/v1/worker-requests/register', dto);
    const data = raw.success !== undefined ? raw.data : raw;
    
    // Map backend fields to frontend DTO
    const mapped: WorkerRegistrationResponse = {
      success: data.success ?? true,
      workerRequestId: data.workerRequestId,
      qrCodeUrl: data.qrCodeUrl,
      status: data.status ?? 'PENDING_SECURITY_ENROLLMENT',
      corporateEmail: data.email,
      temporaryPassword: data.tempPassword,
    };
    return mapped;
  }
};
