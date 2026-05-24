import Webcam from 'react-webcam';

export const captureFaceAction = (webcamRef: React.RefObject<Webcam | null>): string | null => {
  if (!webcamRef.current) return null;
  return webcamRef.current.getScreenshot() || null;
};
