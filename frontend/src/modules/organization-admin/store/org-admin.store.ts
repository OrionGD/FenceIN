import { create } from 'zustand';
import type { Site, Worker, Vendor, Shift, AttendanceRecord, KioskDevice } from '../types';

interface OrgAdminState {
  sites: Site[];
  workers: Worker[];
  vendors: Vendor[];
  shifts: Shift[];
  attendance: AttendanceRecord[];
  kiosks: KioskDevice[];
  selectedSiteId: string | null;
  isLoading: boolean;
  error: string | null;

  setSites: (sites: Site[]) => void;
  setWorkers: (workers: Worker[]) => void;
  setVendors: (vendors: Vendor[]) => void;
  setShifts: (shifts: Shift[]) => void;
  setAttendance: (attendance: AttendanceRecord[]) => void;
  setKiosks: (kiosks: KioskDevice[]) => void;
  selectSite: (siteId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addWorker: (worker: Worker) => void;
  updateWorker: (id: string, updates: Partial<Worker>) => void;
  addAttendanceRecord: (record: AttendanceRecord) => void;
}

export const useOrgAdminStore = create<OrgAdminState>((set) => ({
  sites: [],
  workers: [],
  vendors: [],
  shifts: [],
  attendance: [],
  kiosks: [],
  selectedSiteId: null,
  isLoading: false,
  error: null,

  setSites: (sites) => set({ sites }),
  setWorkers: (workers) => set({ workers }),
  setVendors: (vendors) => set({ vendors }),
  setShifts: (shifts) => set({ shifts }),
  setAttendance: (attendance) => set({ attendance }),
  setKiosks: (kiosks) => set({ kiosks }),
  selectSite: (siteId) => set({ selectedSiteId: siteId }),
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

  addAttendanceRecord: (record) =>
    set((state) => ({
      attendance: [record, ...state.attendance],
    })),
}));
