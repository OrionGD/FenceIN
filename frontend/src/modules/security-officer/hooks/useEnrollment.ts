import { useState, useEffect } from 'react';
import { useEnrollmentStore } from '../store/enrollment.store';
import { workerRequestService } from '../services/worker-request.service';
import type { WorkerRequest } from '../services/worker-request.service';
import { enrollWorkerAction } from '../actions/enroll-worker.action';
import { useAuthStore } from '@/store/useAuthStore';

export const useEnrollment = () => {
  const [pendingRequests, setPendingRequests] = useState<WorkerRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const { 
    workerRequestId, 
    setWorkerRequestId, 
    captureFrame, 
    setStatus, 
    setError,
    reset 
  } = useEnrollmentStore();

  const token = useAuthStore(state => state.token);

  const fetchPending = async () => {
    try {
      setLoadingRequests(true);
      const requests = await workerRequestService.getPendingRequests(token || '');
      setPendingRequests(requests);
    } catch (err) {
      console.error('Failed to load pending worker requests', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectRequest = (id: string | null) => {
    setWorkerRequestId(id);
    reset();
  };

  const submitEnrollment = async (): Promise<boolean> => {
    if (!workerRequestId || !captureFrame) {
      setError('Active enrollment request and webcam capture are required.');
      return false;
    }

    setEnrolling(true);
    setStatus('processing');
    try {
      await enrollWorkerAction(workerRequestId, captureFrame);
      setStatus('success');
      fetchPending(); // Refresh list after successful activation
      return true;
    } catch (err: any) {
      setError(err.message || 'Biometric enrollment failed. Please check backend connection.');
      setStatus('error');
      return false;
    } finally {
      setEnrolling(false);
    }
  };

  return {
    pendingRequests,
    loadingRequests,
    selectedRequest: pendingRequests.find(r => r.id === workerRequestId) || null,
    enrolling,
    selectRequest,
    submitEnrollment,
    refreshRequests: fetchPending
  };
};
