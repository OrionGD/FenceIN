/**
 * worker-request.service.ts
 *
 * Data source: Backend API (GET /api/v1/worker-requests)
 *
 * Architecture rules:
 * - NEVER silently fall back to localStorage when the backend fails.
 * - Backend errors must surface as thrown errors so the UI can display the correct state.
 * - Offline queueing (saveOfflineRequest) is an explicit user action, not a silent fallback.
 * - Offline queue items must be synced to the backend before enrollment proceeds.
 */

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

/** Key used for the offline enrollment queue (not a fallback data cache). */
const OFFLINE_QUEUE_KEY = 'fencein_enrollment_offline_queue';

export const workerRequestService = {
  /**
   * Fetches pending worker requests from the backend.
   * Throws on network error or non-OK response so the UI can show an error state.
   */
  async getPendingRequests(token: string): Promise<WorkerRequest[]> {
    const res = await fetch(`${API_BASE}/worker-requests/pending`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `Failed to load pending requests (${res.status})`);
    }
    const data = await res.json();
    return data.success !== undefined ? data.data : data;
  },

  /**
   * Fetches a single worker request by ID from the backend.
   * Throws on network error or non-OK response.
   */
  async getRequestById(id: string, token: string): Promise<WorkerRequest> {
    const res = await fetch(`${API_BASE}/worker-requests/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `Worker request not found (${res.status})`);
    }
    const data = await res.json();
    return data.success !== undefined ? data.data : data;
  },

  // ── Offline queue (explicit user action, NOT a backend fallback) ──────────────

  /**
   * Queues a worker request locally when the security officer is offline.
   * Must call syncOfflineQueue() before the enrollment step.
   */
  saveOfflineRequest(
    request: Omit<WorkerRequest, 'id' | 'status' | 'createdAt'>,
  ): WorkerRequest {
    const queue = this.getOfflineQueue();
    const newRequest: WorkerRequest = {
      ...request,
      id: `OFFLINE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      status: 'PENDING_SECURITY_ENROLLMENT',
      createdAt: new Date().toISOString(),
    };
    queue.push(newRequest);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    return newRequest;
  },

  getOfflineQueue(): WorkerRequest[] {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  },

  clearOfflineQueue(): void {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  },

  /**
   * Syncs all offline-queued requests to the backend.
   * Must be called (and awaited) before the biometric enrollment step begins.
   * Returns the number of successfully synced requests.
   */
  async syncOfflineQueue(token: string): Promise<number> {
    const queue = this.getOfflineQueue();
    if (queue.length === 0) return 0;

    let synced = 0;
    const failed: WorkerRequest[] = [];

    for (const request of queue) {
      try {
        const res = await fetch(`${API_BASE}/worker-requests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...request,
            id: undefined, // let backend assign real ID
          }),
        });
        if (res.ok) {
          synced++;
        } else {
          failed.push(request);
        }
      } catch {
        failed.push(request);
      }
    }

    // Keep only failed items in queue
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(failed));
    return synced;
  },
  // ── Compatibility shims for action files ───────────────────────────────────

  /**
   * Alias for saveOfflineRequest — stores a worker registration locally when backend is unreachable.
   */
  saveLocalRequest(
    request: Omit<WorkerRequest, 'id' | 'status' | 'createdAt'>,
  ): WorkerRequest {
    return this.saveOfflineRequest(request);
  },

  /**
   * Updates the status of a locally-cached request (offline queue item).
   * Does nothing if the request is not in the offline queue.
   */
  updateRequestStatusLocal(id: string, status: WorkerRequest['status']): void {
    const queue = this.getOfflineQueue();
    const updated = queue.map((req) =>
      req.id === id ? { ...req, status } : req,
    );
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updated));
  },
};
