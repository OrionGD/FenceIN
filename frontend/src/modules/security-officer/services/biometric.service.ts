import * as faceapi from '@vladmandic/face-api';
import type { BiometricQualityMetrics } from '../types/enrollment.types';

export const biometricService = {
  async detectFaceQuality(videoElement: HTMLVideoElement): Promise<BiometricQualityMetrics | null> {
    try {
      const detection = await faceapi.detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceLandmarks();

      if (!detection) return null;

      const landmarks = detection.landmarks;
      const box = detection.detection.box;

      // 1. Center alignment check
      const videoWidth = videoElement.videoWidth || 640;
      const videoHeight = videoElement.videoHeight || 480;
      const faceCenterX = box.x + box.width / 2;
      const faceCenterY = box.y + box.height / 2;
      const centerThresholdX = videoWidth * 0.15;
      const centerThresholdY = videoHeight * 0.15;
      const isCentered = 
        Math.abs(faceCenterX - videoWidth / 2) < centerThresholdX &&
        Math.abs(faceCenterY - videoHeight / 2) < centerThresholdY;

      // 2. Eyes visibility check (checking landmark count for eyes)
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      const eyesVisible = leftEye.length > 0 && rightEye.length > 0;

      // 3. Tilt Angle (Roll) calculation based on eye positions
      const eyeDiffX = rightEye[0].x - leftEye[0].x;
      const eyeDiffY = rightEye[0].y - leftEye[0].y;
      const tiltAngle = Math.abs((Math.atan2(eyeDiffY, eyeDiffX) * 180) / Math.PI);

      // 4. Brightness Assessment (calculating canvas pixel average)
      const brightness = this.assessBrightness(videoElement, box);

      // 5. Blur Detection (simple Laplacian variance emulation via pixel delta checks)
      const isBlurry = this.assessBlur(videoElement, box);

      // 6. Quality Score Generation
      let qualityScore = 1.0;
      if (!isCentered) qualityScore -= 0.2;
      if (!eyesVisible) qualityScore -= 0.3;
      if (tiltAngle > 12) qualityScore -= 0.25;
      if (brightness < 40 || brightness > 220) qualityScore -= 0.3;
      if (isBlurry) qualityScore -= 0.25;
      qualityScore = Math.max(0, Math.min(1.0, qualityScore));

      return {
        isCentered,
        eyesVisible,
        tiltAngle,
        brightness,
        isBlurry,
        humanDetected: true,
        qualityScore,
      };
    } catch (e) {
      console.error('Biometric quality check failed', e);
      return null;
    }
  },

  assessBrightness(video: HTMLVideoElement, box: faceapi.Rect): number {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(50, box.width);
      canvas.height = Math.max(50, box.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return 120; // safe default mid-gray

      ctx.drawImage(video, box.x, box.y, box.width, box.height, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      
      let sum = 0;
      for (let i = 0; i < imgData.length; i += 4) {
        // Luminance formula
        sum += 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
      }
      return sum / (imgData.length / 4);
    } catch {
      return 120;
    }
  },

  assessBlur(video: HTMLVideoElement, box: faceapi.Rect): boolean {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      ctx.drawImage(video, box.x, box.y, box.width, box.height, 0, 0, 64, 64);
      const imgData = ctx.getImageData(0, 0, 64, 64).data;

      let diffSum = 0;
      for (let y = 0; y < 63; y++) {
        for (let x = 0; x < 63; x++) {
          const idx = (y * 64 + x) * 4;
          const val = imgData[idx];
          const rightVal = imgData[idx + 4];
          const downVal = imgData[idx + 256];
          diffSum += Math.abs(val - rightVal) + Math.abs(val - downVal);
        }
      }
      const avgGradient = diffSum / (64 * 64);
      return avgGradient < 5.5; // low gradient average means blurry / smooth frame
    } catch {
      return false;
    }
  }
};
