// Vendor Manager Domain Types

export interface VendorWorker {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  email: string;
  phone: string;
  siteId?: string;
  siteName?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ONBOARDING';
  biometricEnrolled: boolean;
  complianceStatus: 'COMPLIANT' | 'PENDING' | 'NON_COMPLIANT';
  contractStart: string;
  contractEnd: string;
  joinedAt: string;
}

export interface BillingRecord {
  id: string;
  vendorId: string;
  period: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  workerCount: number;
  amount: number;
  currency: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'DISPUTED';
  submittedAt?: string;
  paidAt?: string;
}

export interface WorkerContract {
  id: string;
  workerId: string;
  workerName: string;
  vendorId: string;
  siteId: string;
  siteName: string;
  startDate: string;
  endDate: string;
  hourlyRate: number;
  overtimeRate: number;
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
}

export interface VendorCompliance {
  vendorId: string;
  totalWorkers: number;
  documentedWorkers: number;
  biometricWorkers: number;
  certifiedWorkers: number;
  score: number;
  status: 'COMPLIANT' | 'AT_RISK' | 'NON_COMPLIANT';
  lastAudit: string;
  nextAuditDue: string;
}
