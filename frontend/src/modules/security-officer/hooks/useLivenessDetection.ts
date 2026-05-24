import { useState, useCallback } from 'react';
import { useEnrollmentStore } from '../store/enrollment.store';

export const useLivenessDetection = () => {
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [checking, setChecking] = useState(false);

  const { setLiveness } = useEnrollmentStore();

  const performLivenessCheck = useCallback(async (_videoElement: HTMLVideoElement): Promise<boolean> => {
    setChecking(true);
    try {
      // Emulate deep learning liveness diagnostics looking for micromovements
      await new Promise(resolve => setTimeout(resolve, 800));

      const isHuman = true;
      const blinkDetected = Math.random() > 0.15; // 85% probability or simulation
      const spoofScore = 0.05 + Math.random() * 0.1; // Extremely low spoof index means pure human

      const passed = isHuman && blinkDetected && spoofScore < 0.25;

      setLiveness({
        isHuman,
        blinkDetected,
        spoofScore,
        passed
      });

      setLivenessPassed(passed);
      return passed;
    } catch {
      setLivenessPassed(false);
      return false;
    } finally {
      setChecking(false);
    }
  }, [setLiveness]);

  return {
    livenessPassed,
    checking,
    performLivenessCheck
  };
};
