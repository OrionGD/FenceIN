// HR Admin Domain Types

export interface PayrollRecord {
  id: string;
  workerId: string;
  workerName: string;
  employeeId: string;
  period: string; // e.g. "2026-05"
  regularHours: number;
  overtimeHours: number;
  baseSalary: number;
  overtimePay: number;
  deductions: number;
  netPay: number;
  status: 'DRAFT' | 'APPROVED' | 'PAID' | 'DISPUTED';
  processedAt?: string;
}

export interface LeaveRequest {
  id: string;
  workerId: string;
  workerName: string;
  type: 'ANNUAL' | 'SICK' | 'EMERGENCY' | 'UNPAID';
  startDate: string;
  endDate: string;
  days: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string;
  approvedBy?: string;
  appliedAt: string;
}

export interface ComplianceReport {
  id: string;
  orgId: string;
  period: string;
  totalWorkers: number;
  documentedWorkers: number;
  biometricEnrolled: number;
  certifiedWorkers: number;
  complianceScore: number;
  status: 'COMPLIANT' | 'AT_RISK' | 'NON_COMPLIANT';
  generatedAt: string;
}

export interface WorkerDocument {
  id: string;
  workerId: string;
  workerName: string;
  type: 'ID' | 'CONTRACT' | 'CERTIFICATION' | 'MEDICAL' | 'OTHER';
  name: string;
  url: string;
  expiresAt?: string;
  status: 'VALID' | 'EXPIRED' | 'PENDING_REVIEW';
  uploadedAt: string;
}

export interface OvertimeRecord {
  id: string;
  workerId: string;
  workerName: string;
  siteId: string;
  siteName: string;
  date: string;
  regularHours: number;
  overtimeHours: number;
  overtimeRate: number;
  approvedBy?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
}
