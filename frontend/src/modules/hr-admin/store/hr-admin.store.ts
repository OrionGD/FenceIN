import { create } from 'zustand';
import type { PayrollRecord, LeaveRequest, ComplianceReport, WorkerDocument, OvertimeRecord } from '../types';

interface HrAdminState {
  payroll: PayrollRecord[];
  leaveRequests: LeaveRequest[];
  complianceReports: ComplianceReport[];
  documents: WorkerDocument[];
  overtime: OvertimeRecord[];
  selectedPeriod: string;
  isLoading: boolean;
  error: string | null;

  setPayroll: (payroll: PayrollRecord[]) => void;
  setLeaveRequests: (requests: LeaveRequest[]) => void;
  setComplianceReports: (reports: ComplianceReport[]) => void;
  setDocuments: (docs: WorkerDocument[]) => void;
  setOvertime: (overtime: OvertimeRecord[]) => void;
  setPeriod: (period: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  approveLeave: (id: string) => void;
  rejectLeave: (id: string) => void;
  updatePayrollStatus: (id: string, status: PayrollRecord['status']) => void;
}

export const useHrAdminStore = create<HrAdminState>((set) => ({
  payroll: [],
  leaveRequests: [],
  complianceReports: [],
  documents: [],
  overtime: [],
  selectedPeriod: new Date().toISOString().slice(0, 7),
  isLoading: false,
  error: null,

  setPayroll: (payroll) => set({ payroll }),
  setLeaveRequests: (requests) => set({ leaveRequests: requests }),
  setComplianceReports: (reports) => set({ complianceReports: reports }),
  setDocuments: (docs) => set({ documents: docs }),
  setOvertime: (overtime) => set({ overtime }),
  setPeriod: (period) => set({ selectedPeriod: period }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  approveLeave: (id) =>
    set((state) => ({
      leaveRequests: state.leaveRequests.map((r) =>
        r.id === id ? { ...r, status: 'APPROVED' as const } : r
      ),
    })),

  rejectLeave: (id) =>
    set((state) => ({
      leaveRequests: state.leaveRequests.map((r) =>
        r.id === id ? { ...r, status: 'REJECTED' as const } : r
      ),
    })),

  updatePayrollStatus: (id, status) =>
    set((state) => ({
      payroll: state.payroll.map((p) =>
        p.id === id ? { ...p, status } : p
      ),
    })),
}));
