// Super Admin Domain Types

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'EXPIRED';
  plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  siteCount: number;
  workerCount: number;
  adminEmail: string;
  country: string;
  createdAt: string;
  expiresAt: string;
}

export interface SystemUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: GlobalRole;
  orgId?: string;
  orgName?: string;
  status: 'ACTIVE' | 'LOCKED' | 'PENDING';
  lastLogin: string;
  createdAt: string;
}

export type GlobalRole =
  | 'SUPER_ADMIN'
  | 'ORG_ADMIN'
  | 'HR_ADMIN'
  | 'SUPERVISOR'
  | 'SECURITY_OFFICER'
  | 'VENDOR_MANAGER'
  | 'WORKER';

export interface Kiosk {
  id: string;
  name: string;
  orgId: string;
  siteId: string;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR';
  lastPing: string;
  ipAddress: string;
  firmwareVersion: string;
  location: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: GlobalRole;
  action: string;
  targetResource: string;
  targetId: string;
  ipAddress: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface SystemMetric {
  label: string;
  value: number | string;
  unit?: string;
  trend: 'UP' | 'DOWN' | 'STABLE';
  trendValue: string;
}

export interface SecurityIncident {
  id: string;
  type: 'SPOOF_ATTEMPT' | 'UNAUTHORIZED_ACCESS' | 'GEOFENCE_BREACH' | 'FAILED_BIOMETRIC' | 'ACCOUNT_LOCKOUT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'ESCALATED';
  orgId?: string;
  siteId?: string;
  userId?: string;
  description: string;
  detectedAt: string;
  resolvedAt?: string;
}

export interface Subscription {
  id: string;
  orgId: string;
  orgName: string;
  plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'TRIALING';
  amount: number;
  currency: string;
  billingCycle: 'MONTHLY' | 'ANNUAL';
  nextBillingDate: string;
  workerSeats: number;
}
