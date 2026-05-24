export interface BiometricQualityMetrics {
  isCentered: boolean;
  eyesVisible: boolean;
  tiltAngle: number;
  brightness: number;
  isBlurry: boolean;
  humanDetected: boolean;
  qualityScore: number;
}

export interface LivenessDiagnostic {
  isHuman: boolean;
  blinkDetected: boolean;
  spoofScore: number;
  passed: boolean;
}

export interface EnrollmentState {
  workerRequestId: string | null;
  status: 'idle' | 'scanning' | 'processing' | 'success' | 'error';
  quality: BiometricQualityMetrics | null;
  liveness: LivenessDiagnostic | null;
  captureFrame: string | null;
  embedding: number[] | null;
  error: string | null;
}
