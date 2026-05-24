import { biometricService } from '../services/biometric.service';
import type { BiometricQualityMetrics } from '../types/enrollment.types';

export const validateFaceAction = async (videoElement: HTMLVideoElement): Promise<BiometricQualityMetrics | null> => {
  return await biometricService.detectFaceQuality(videoElement);
};
