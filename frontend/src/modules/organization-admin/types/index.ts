// Organization Admin Domain Types

export interface Site {
  id: string;
  name: string;
  address: string;
  orgId: string;
  supervisorId?: string;
  supervisorName?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  workerCount: number;
  kioskCount: number;
  latitude: number;
  longitude: number;
  geofenceRadius: number; // meters
  createdAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  orgId: string;
  contactEmail: string;
  contactPhone: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  workerCount: number;
  contractStart: string;
  contractEnd: string;
  complianceScore: number;
}

export interface Worker {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  orgId: string;
  vendorId?: string;
  vendorName?: string;
  siteId?: string;
  siteName?: string;
  role: 'PERMANENT' | 'CONTRACT' | 'TEMP';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ONBOARDING';
  biometricEnrolled: boolean;
  createdAt: string;
  profilePhoto?: string;
}

export interface Shift {
  id: string;
  name: string;
  siteId: string;
  siteName: string;
  startTime: string;
  endTime: string;
  days: ('MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN')[];
  workerCount: number;
  supervisorId?: string;
}

export interface Geofence {
  id: string;
  siteId: string;
  siteName: string;
  latitude: number;
  longitude: number;
  radius: number;
  alertOnBreach: boolean;
  autoCheckout: boolean;
}

export interface AttendanceRecord {
  id: string;
  workerId: string;
  workerName: string;
  siteId: string;
  siteName: string;
  checkIn: string;
  checkOut?: string;
  duration?: number; // minutes
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'OVERTIME' | 'MANUAL';
  confidence?: number;
  livenessScore?: number;
  latitude?: number;
  longitude?: number;
}

export interface KioskDevice {
  id: string;
  name: string;
  siteId: string;
  siteName: string;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR';
  lastSeen: string;
  totalScansToday: number;
  failedScansToday: number;
}
