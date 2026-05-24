import { create } from 'zustand';
import type { WorkerProfile, MyAttendance, MyShift, Notification, SupportTicket } from '../types';

interface WorkerState {
  profile: WorkerProfile | null;
  attendance: MyAttendance[];
  shifts: MyShift[];
  notifications: Notification[];
  tickets: SupportTicket[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  setProfile: (profile: WorkerProfile) => void;
  setAttendance: (attendance: MyAttendance[]) => void;
  setShifts: (shifts: MyShift[]) => void;
  setNotifications: (notifications: Notification[]) => void;
  setTickets: (tickets: SupportTicket[]) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addAttendance: (record: MyAttendance) => void;
}

export const useWorkerStore = create<WorkerState>((set) => ({
  profile: null,
  attendance: [],
  shifts: [],
  notifications: [],
  tickets: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  setProfile: (profile) => set({ profile }),
  setAttendance: (attendance) => set({ attendance }),
  setShifts: (shifts) => set({ shifts }),
  setNotifications: (notifications) => set({
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
  }),
  setTickets: (tickets) => set({ tickets }),

  markNotificationRead: (id) =>
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return { notifications, unreadCount: notifications.filter((n) => !n.read).length };
    }),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  addAttendance: (record) =>
    set((state) => ({ attendance: [record, ...state.attendance] })),
}));
