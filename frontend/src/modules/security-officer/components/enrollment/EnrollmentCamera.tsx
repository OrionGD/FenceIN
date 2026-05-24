import { useEffect } from 'react';
import Webcam from 'react-webcam';

interface EnrollmentCameraProps {
  webcamRef: React.RefObject<Webcam | null>;
  onFrame: () => void;
  isActive: boolean;
}

export default function EnrollmentCamera({ webcamRef, onFrame, isActive }: EnrollmentCameraProps) {
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      onFrame();
    }, 400);

    return () => clearInterval(interval);
  }, [isActive, onFrame]);

  return (
    <div className="relative w-full h-full bg-bg-primary flex items-center justify-center">
      {isActive ? (
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode: 'user', width: 480, height: 640 }}
          className="object-cover w-full h-full -scale-x-100"
        />
      ) : (
        <div className="text-text-muted font-semibold text-sm">Camera Stream Terminated</div>
      )}
    </div>
  );
}
