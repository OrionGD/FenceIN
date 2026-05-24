import { create } from 'zustand';
import type { EnrollmentState, BiometricQualityMetrics, LivenessDiagnostic } from '../types/enrollment.types';

interface EnrollmentActions {
  setWorkerRequestId: (id: string | null) => void;
  setStatus: (status: EnrollmentState['status']) => void;
  setQuality: (quality: BiometricQualityMetrics | null) => void;
  setLiveness: (liveness: LivenessDiagnostic | null) => void;
  setCaptureFrame: (frame: string | null) => void;
  setEmbedding: (embedding: number[] | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useEnrollmentStore = create<EnrollmentState & EnrollmentActions>((set) => ({
  workerRequestId: null,
  status: 'idle',
  quality: null,
  liveness: null,
  captureFrame: null,
  embedding: null,
  error: null,

  setWorkerRequestId: (id) => set({ workerRequestId: id }),
  setStatus: (status) => set({ status }),
  setQuality: (quality) => set({ quality }),
  setLiveness: (liveness) => set({ liveness }),
  setCaptureFrame: (frame) => set({ captureFrame: frame }),
  setEmbedding: (embedding) => set({ embedding }),
  setError: (error) => set({ error }),
  reset: () => set({
    status: 'idle',
    quality: null,
    liveness: null,
    captureFrame: null,
    embedding: null,
    error: null,
  }),
}));
