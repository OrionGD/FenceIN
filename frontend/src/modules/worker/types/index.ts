// Worker Domain Types

export interface WorkerProfile {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  photo?: string;
  orgName: string;
  vendorName?: string;
  siteName?: string;
  role: 'PERMANENT' | 'CONTRACT' | 'TEMP';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  biometricEnrolled: boolean;
  joinedAt: string;
}

export interface MyAttendance {
  id: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  hours?: number;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'OVERTIME' | 'HALF_DAY';
  siteName: string;
}

export interface MyShift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  siteName: string;
  days: string[];
  supervisorName: string;
}

export interface SupportTicket {
  id: string;
  workerId: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
  resolvedAt?: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'ATTENDANCE' | 'SHIFT' | 'PAYROLL' | 'INCIDENT' | 'SYSTEM';
  read: boolean;
  createdAt: string;
}
