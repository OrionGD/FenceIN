import { useState, useEffect, useCallback } from 'react';

export const useCameraPermission = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [requesting, setRequesting] = useState(false);

  const requestPermission = useCallback(async () => {
    setRequesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Stop stream immediately after verifying
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
    } catch {
      setHasPermission(false);
    } finally {
      setRequesting(false);
    }
  }, []);

  useEffect(() => {
    // Check initially if permission exists
    navigator.permissions?.query({ name: 'camera' as any })
      .then((status) => {
        if (status.state === 'granted') {
          setHasPermission(true);
        } else if (status.state === 'denied') {
          setHasPermission(false);
        } else {
          setHasPermission(null);
        }
      })
      .catch(() => {
        setHasPermission(null);
      });
  }, []);

  return { hasPermission, requesting, requestPermission };
};
