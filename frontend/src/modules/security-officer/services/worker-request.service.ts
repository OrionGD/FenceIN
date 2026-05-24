const API_BASE = 'http://localhost:3456/api/v1';

export interface WorkerRequest {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  emergencyContact: string;
  govId: string;
  vendorId: string;
  skillType: string;
  shiftId: string;
  siteId: string;
  address: string;
  bloodGroup: string;
  status: 'PENDING_SECURITY_ENROLLMENT' | 'ACTIVE';
  createdAt: string;
}

export const workerRequestService = {
  async getPendingRequests(): Promise<WorkerRequest[]> {
    try {
      const res = await fetch(`${API_BASE}/worker-requests/pending`);
      if (!res.ok) return this.getLocalPendingRequests();
      const data = await res.json();
      return data.success !== undefined ? data.data : data;
    } catch {
      return this.getLocalPendingRequests();
    }
  },

  async getRequestById(id: string): Promise<WorkerRequest | null> {
    try {
      const res = await fetch(`${API_BASE}/worker-requests/${id}`);
      if (!res.ok) return this.getLocalRequestById(id);
      const data = await res.json();
      return data.success !== undefined ? data.data : data;
    } catch {
      return this.getLocalRequestById(id);
    }
  },

  getLocalPendingRequests(): WorkerRequest[] {
    const list = JSON.parse(localStorage.getItem('fencein_worker_requests') || '[]');
    return list.filter((r: WorkerRequest) => r.status === 'PENDING_SECURITY_ENROLLMENT');
  },

  getLocalRequestById(id: string): WorkerRequest | null {
    const list = JSON.parse(localStorage.getItem('fencein_worker_requests') || '[]');
    return list.find((r: WorkerRequest) => r.id === id) || null;
  },

  saveLocalRequest(request: Omit<WorkerRequest, 'id' | 'status' | 'createdAt'>): WorkerRequest {
    const list = JSON.parse(localStorage.getItem('fencein_worker_requests') || '[]');
    const newRequest: WorkerRequest = {
      ...request,
      id: `REQ-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'PENDING_SECURITY_ENROLLMENT',
      createdAt: new Date().toISOString()
    };
    list.push(newRequest);
    localStorage.setItem('fencein_worker_requests', JSON.stringify(list));
    return newRequest;
  },

  updateRequestStatusLocal(id: string, status: 'ACTIVE'): void {
    const list = JSON.parse(localStorage.getItem('fencein_worker_requests') || '[]');
    const index = list.findIndex((r: WorkerRequest) => r.id === id);
    if (index !== -1) {
      list[index].status = status;
      localStorage.setItem('fencein_worker_requests', JSON.stringify(list));
    }
  }
};
