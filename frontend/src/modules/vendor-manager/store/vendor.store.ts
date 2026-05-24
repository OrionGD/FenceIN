import { create } from 'zustand';
import type { VendorWorker, BillingRecord, WorkerContract, VendorCompliance } from '../types';

interface VendorManagerState {
  workers: VendorWorker[];
  billing: BillingRecord[];
  contracts: WorkerContract[];
  compliance: VendorCompliance | null;
  isLoading: boolean;
  error: string | null;

  setWorkers: (workers: VendorWorker[]) => void;
  setBilling: (billing: BillingRecord[]) => void;
  setContracts: (contracts: WorkerContract[]) => void;
  setCompliance: (compliance: VendorCompliance) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addWorker: (worker: VendorWorker) => void;
  updateWorker: (id: string, updates: Partial<VendorWorker>) => void;
}

export const useVendorStore = create<VendorManagerState>((set) => ({
  workers: [],
  billing: [],
  contracts: [],
  compliance: null,
  isLoading: false,
  error: null,

  setWorkers: (workers) => set({ workers }),
  setBilling: (billing) => set({ billing }),
  setContracts: (contracts) => set({ contracts }),
  setCompliance: (compliance) => set({ compliance }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  addWorker: (worker) =>
    set((state) => ({ workers: [...state.workers, worker] })),

  updateWorker: (id, updates) =>
    set((state) => ({
      workers: state.workers.map((w) =>
        w.id === id ? { ...w, ...updates } : w
      ),
    })),
}));
