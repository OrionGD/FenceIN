// Workforce Supervisor Domain Types

export interface AssignedSite {
  id: string;
  name: string;
  address: string;
  activeWorkers: number;
  totalWorkers: number;
  kioskStatus: 'ONLINE' | 'OFFLINE' | 'PARTIAL';
  pendingAttendance: number;
  openIncidents: number;
}

export interface LiveWorker {
  id: string;
  name: string;
  employeeId: string;
  photo?: string;
  siteId: string;
  checkInTime: string;
  duration: number; // minutes elapsed
  zone?: string;
  status: 'CHECKED_IN' | 'ON_BREAK' | 'OVERTIME';
}

export interface IncidentReport {
  id: string;
  siteId: string;
  siteName: string;
  reportedBy: string;
  type: 'INJURY' | 'EQUIPMENT_FAILURE' | 'UNAUTHORIZED_ACCESS' | 'WORKER_DISPUTE' | 'OTHER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'ESCALATED' | 'RESOLVED';
  reportedAt: string;
  resolvedAt?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedToName: string;
  siteId: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  dueAt: string;
  createdAt: string;
}
