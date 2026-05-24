import type { VendorOption, SiteOption, ShiftOption, WorkerRegistrationInput, WorkerRegistrationResponse } from '../types/registration.types';

const API_BASE = 'http://localhost:3456/api/v1';

export const registrationService = {
  async getVendors(): Promise<VendorOption[]> {
    const res = await fetch(`${API_BASE}/vendors`);
    if (!res.ok) throw new Error('Failed to fetch vendors');
    const data = await res.json();
    return data.success !== undefined ? data.data : data;
  },

  async getSites(): Promise<SiteOption[]> {
    const res = await fetch(`${API_BASE}/sites`);
    if (!res.ok) throw new Error('Failed to fetch sites');
    const data = await res.json();
    return data.success !== undefined ? data.data : data;
  },

  async getShifts(): Promise<ShiftOption[]> {
    // Falls back to standard shifts if shift API is loading
    try {
      const res = await fetch(`${API_BASE}/shifts`);
      if (!res.ok) return this.getFallbackShifts();
      const data = await res.json();
      return data.success !== undefined ? data.data : data;
    } catch {
      return this.getFallbackShifts();
    }
  },

  async registerWorker(dto: WorkerRegistrationInput): Promise<WorkerRegistrationResponse> {
    const res = await fetch(`${API_BASE}/worker-requests/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Worker registration failed');
    }

    const data = await res.json();
    return data.success !== undefined ? data.data : data;
  },

  getFallbackShifts(): ShiftOption[] {
    return [
      { id: 'shift-day', name: 'General Day Shift', startTime: '09:00', endTime: '18:00' },
      { id: 'shift-night', name: 'Industrial Night Shift', startTime: '21:00', endTime: '06:00' }
    ];
  }
};
