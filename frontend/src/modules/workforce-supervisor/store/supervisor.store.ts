import { create } from 'zustand';
import type { AssignedSite, LiveWorker, IncidentReport, Task } from '../types';

interface SupervisorState {
  assignedSites: AssignedSite[];
  liveWorkers: LiveWorker[];
  incidents: IncidentReport[];
  tasks: Task[];
  activeSiteId: string | null;
  isLoading: boolean;
  error: string | null;

  setAssignedSites: (sites: AssignedSite[]) => void;
  setLiveWorkers: (workers: LiveWorker[]) => void;
  setIncidents: (incidents: IncidentReport[]) => void;
  setTasks: (tasks: Task[]) => void;
  setActiveSite: (siteId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addLiveWorker: (worker: LiveWorker) => void;
  removeLiveWorker: (id: string) => void;
  addIncident: (incident: IncidentReport) => void;
  updateTaskStatus: (id: string, status: Task['status']) => void;
}

export const useSupervisorStore = create<SupervisorState>((set) => ({
  assignedSites: [],
  liveWorkers: [],
  incidents: [],
  tasks: [],
  activeSiteId: null,
  isLoading: false,
  error: null,

  setAssignedSites: (sites) => set({ assignedSites: sites }),
  setLiveWorkers: (workers) => set({ liveWorkers: workers }),
  setIncidents: (incidents) => set({ incidents }),
  setTasks: (tasks) => set({ tasks }),
  setActiveSite: (siteId) => set({ activeSiteId: siteId }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  addLiveWorker: (worker) =>
    set((state) => ({ liveWorkers: [...state.liveWorkers, worker] })),

  removeLiveWorker: (id) =>
    set((state) => ({
      liveWorkers: state.liveWorkers.filter((w) => w.id !== id),
    })),

  addIncident: (incident) =>
    set((state) => ({ incidents: [incident, ...state.incidents] })),

  updateTaskStatus: (id, status) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, status } : t
      ),
    })),
}));
