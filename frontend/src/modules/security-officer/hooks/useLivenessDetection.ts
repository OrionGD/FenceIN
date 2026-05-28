import { useState, useCallback } from 'react';
import { useEnrollmentStore } from '../store/enrollment.store';
import { useAuthStore } from '@/store/useAuthStore';

const BIOMETRICS_BASE = 'http://localhost:8000/api/v1';

/**
 * useLivenessDetection
 *
 * Routes all liveness verification to the Python FastAPI biometrics service.
 * Client-side simulation of blink detection or spoof scores is strictly forbidden.
 *
 * Replay protection:
 * - Before each capture, a one-time nonce is fetched from /api/v1/liveness/challenge
 * - The nonce is submitted alongside the frame
 * - The backend invalidates the nonce on first use (8-second TTL)
 * - Replaying a previously captured frame will be rejected with HTTP 400
 *
 * Source: Python FastAPI biometrics engine @ localhost:8000
 * Security scope: Security Officer, enrollment-only context
 */
export const useLivenessDetection = () => {
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [livenessError, setLivenessError] = useState<string | null>(null);

  const { setLiveness } = useEnrollmentStore();
  const { token } = useAuthStore();

  const performLivenessCheck = useCallback(async (videoElement: HTMLVideoElement): Promise<boolean> => {
    setChecking(true);
    setLivenessError(null);

    try {
      // ── Step 1: Request a one-time challenge nonce ─────────────────────────
      // This nonce expires in 8 seconds and is consumed on first use.
      // If this call fails the liveness check is aborted — no nonce, no check.
      const challengeRes = await fetch(`${BIOMETRICS_BASE}/liveness/challenge`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!challengeRes.ok) {
        const errBody = await challengeRes.json().catch(() => ({}));
        throw new Error(errBody.detail || `Challenge request failed (${challengeRes.status})`);
      }

      const { nonce } = await challengeRes.json();

      // ── Step 2: Capture a frame from the live video element ─────────────────
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable.');
      ctx.drawImage(videoElement, 0, 0);

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Frame capture failed.'));
        }, 'image/jpeg', 0.9);
      });

      // ── Step 3: Submit frame + nonce to the liveness endpoint ───────────────
      // The backend validates the nonce before running analysis.
      const formData = new FormData();
      formData.append('frame', blob, 'liveness_frame.jpg');
      formData.append('nonce', nonce);

      const res = await fetch(`${BIOMETRICS_BASE}/liveness-check`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || `Liveness service error ${res.status}`);
      }

      const result = await res.json();
      // Expected: { is_human: bool, blink_detected: bool, spoof_score: number, passed: bool, reason: string }
      const { is_human, blink_detected, spoof_score, passed } = result;

      setLiveness({
        isHuman: is_human,
        blinkDetected: blink_detected,
        spoofScore: spoof_score,
        passed,
      });

      setLivenessPassed(passed);
      return passed;
    } catch (err: any) {
      const message = err?.message || 'Liveness service unreachable. Please retry.';
      setLivenessError(message);
      setLivenessPassed(false);
      return false;
    } finally {
      setChecking(false);
    }
  }, [setLiveness, token]);

  return {
    livenessPassed,
    checking,
    livenessError,
    performLivenessCheck,
  };
};
