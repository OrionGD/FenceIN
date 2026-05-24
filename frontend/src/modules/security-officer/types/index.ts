// Security Officer Domain Types

export interface BiometricEvent {
  id: string;
  workerId?: string;
  workerName?: string;
  kioskId: string;
  kioskName: string;
  siteId: string;
  type: 'CHECK_IN' | 'CHECK_OUT' | 'FAILED' | 'SPOOF_DETECTED';
  confidence?: number;
  livenessScore?: number;
  spoofProbability?: number;
  timestamp: string;
  imageSnapshot?: string;
}

export interface GeofenceViolation {
  id: string;
  workerId: string;
  workerName: string;
  siteId: string;
  siteName: string;
  violationType: 'UNAUTHORIZED_ENTRY' | 'UNAUTHORIZED_EXIT' | 'OUT_OF_BOUNDS';
  latitude: number;
  longitude: number;
  detectedAt: string;
  resolvedAt?: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
}

export interface BlockedWorker {
  id: string;
  workerId: string;
  workerName: string;
  employeeId: string;
  reason: string;
  blockedBy: string;
  blockedAt: string;
  expiresAt?: string;
  autoRelease: boolean;
}

export interface SurveillanceLog {
  id: string;
  kioskId: string;
  kioskName: string;
  eventType: 'SCAN_ATTEMPT' | 'FACE_DETECTED' | 'LIVENESS_CHECK' | 'SPOOF_ALERT' | 'KIOSK_OFFLINE';
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  details: string;
  timestamp: string;
}
