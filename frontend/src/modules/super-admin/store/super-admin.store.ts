import { create } from 'zustand';
import type { Organization, SystemUser, Kiosk, AuditLog, SecurityIncident, Subscription } from '../types';

interface SuperAdminState {
  organizations: Organization[];
  users: SystemUser[];
  kiosks: Kiosk[];
  auditLogs: AuditLog[];
  incidents: SecurityIncident[];
  subscriptions: Subscription[];
  isLoading: boolean;
  error: string | null;

  setOrganizations: (orgs: Organization[]) => void;
  setUsers: (users: SystemUser[]) => void;
  setKiosks: (kiosks: Kiosk[]) => void;
  setAuditLogs: (logs: AuditLog[]) => void;
  setIncidents: (incidents: SecurityIncident[]) => void;
  setSubscriptions: (subs: Subscription[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addIncident: (incident: SecurityIncident) => void;
  updateOrganizationStatus: (id: string, status: Organization['status']) => void;
  lockUser: (id: string) => void;
}

export const useSuperAdminStore = create<SuperAdminState>((set) => ({
  organizations: [],
  users: [],
  kiosks: [],
  auditLogs: [],
  incidents: [],
  subscriptions: [],
  isLoading: false,
  error: null,

  setOrganizations: (orgs) => set({ organizations: orgs }),
  setUsers: (users) => set({ users }),
  setKiosks: (kiosks) => set({ kiosks }),
  setAuditLogs: (logs) => set({ auditLogs: logs }),
  setIncidents: (incidents) => set({ incidents }),
  setSubscriptions: (subs) => set({ subscriptions: subs }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  addIncident: (incident) =>
    set((state) => ({ incidents: [incident, ...state.incidents] })),

  updateOrganizationStatus: (id, status) =>
    set((state) => ({
      organizations: state.organizations.map((o) =>
        o.id === id ? { ...o, status } : o
      ),
    })),

  lockUser: (id) =>
    set((state) => ({
      users: state.users.map((u) =>
        u.id === id ? { ...u, status: 'LOCKED' as const } : u
      ),
    })),
}));
