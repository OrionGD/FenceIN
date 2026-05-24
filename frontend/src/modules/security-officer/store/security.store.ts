import { create } from 'zustand';
import type { BiometricEvent, GeofenceViolation, BlockedWorker, SurveillanceLog } from '../types';

interface SecurityOfficerState {
  biometricFeed: BiometricEvent[];
  violations: GeofenceViolation[];
  blockedWorkers: BlockedWorker[];
  surveillanceLogs: SurveillanceLog[];
  realtimeAlerts: BiometricEvent[];
  isLiveMode: boolean;
  isLoading: boolean;
  error: string | null;

  setFeed: (feed: BiometricEvent[]) => void;
  addFeedEvent: (event: BiometricEvent) => void;
  setViolations: (violations: GeofenceViolation[]) => void;
  setBlockedWorkers: (workers: BlockedWorker[]) => void;
  setSurveillanceLogs: (logs: SurveillanceLog[]) => void;
  addAlert: (alert: BiometricEvent) => void;
  clearAlerts: () => void;
  toggleLiveMode: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  blockWorker: (worker: BlockedWorker) => void;
  resolveViolation: (id: string) => void;
}

export const useSecurityStore = create<SecurityOfficerState>((set) => ({
  biometricFeed: [],
  violations: [],
  blockedWorkers: [],
  surveillanceLogs: [],
  realtimeAlerts: [],
  isLiveMode: true,
  isLoading: false,
  error: null,

  setFeed: (feed) => set({ biometricFeed: feed }),
  addFeedEvent: (event) =>
    set((state) => ({
      biometricFeed: [event, ...state.biometricFeed].slice(0, 100),
    })),

  setViolations: (violations) => set({ violations }),
  setBlockedWorkers: (workers) => set({ blockedWorkers: workers }),
  setSurveillanceLogs: (logs) => set({ surveillanceLogs: logs }),

  addAlert: (alert) =>
    set((state) => ({
      realtimeAlerts: [alert, ...state.realtimeAlerts].slice(0, 20),
    })),

  clearAlerts: () => set({ realtimeAlerts: [] }),
  toggleLiveMode: () => set((state) => ({ isLiveMode: !state.isLiveMode })),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  blockWorker: (worker) =>
    set((state) => ({
      blockedWorkers: [worker, ...state.blockedWorkers],
    })),

  resolveViolation: (id) =>
    set((state) => ({
      violations: state.violations.map((v) =>
        v.id === id ? { ...v, status: 'RESOLVED' as const } : v
      ),
    })),
}));
