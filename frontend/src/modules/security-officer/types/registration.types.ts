export interface VendorOption {
  id: string;
  name: string;
}

export interface SiteOption {
  id: string;
  name: string;
}

export interface ShiftOption {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

export interface WorkerRegistrationInput {
  firstName: string;
  lastName: string;
  phone: string;
  emergencyContact: string;
  govId: string;
  vendorId: string;
  skillType: string;
  shiftId: string;
  siteId: string;
  address: string;
  bloodGroup: string;
  profilePhoto?: string;
}

export interface WorkerRegistrationResponse {
  success: boolean;
  workerRequestId: string;
  qrCodeUrl: string;
  status: 'PENDING_SECURITY_ENROLLMENT';
  // New fields for onboarding display
  corporateEmail?: string;
  temporaryPassword?: string;
}
