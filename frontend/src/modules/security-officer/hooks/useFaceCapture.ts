import { useEffect, useState, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { useEnrollmentStore } from '../store/enrollment.store';
import { validateFaceAction } from '../actions/validate-face.action';

export const useFaceCapture = (webcamRef: React.RefObject<any>) => {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  const { 
    setQuality, 
    setCaptureFrame, 
    setEmbedding, 
    setStatus, 
    setError
  } = useEnrollmentStore();

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoadingModels(true);
        const modelUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl),
          faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
          faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)
        ]);
        if (active) {
          setModelsLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load biometric models', err);
        setError('Failed to load biometric models. Please check internet connection.');
      } finally {
        setLoadingModels(false);
      }
    };
    load();
    return () => { active = false; };
  }, [setError]);

  const analyzeFrame = useCallback(async (): Promise<boolean> => {
    const video = webcamRef.current?.video;
    if (!video || video.readyState !== 4) return false;

    try {
      const quality = await validateFaceAction(video);
      if (quality) {
        setQuality(quality);
        return quality.qualityScore > 0.7; // True if it satisfies quality threshold
      } else {
        setQuality(null);
        return false;
      }
    } catch {
      return false;
    }
  }, [webcamRef, setQuality]);

  const captureFrame = useCallback(async (): Promise<boolean> => {
    const video = webcamRef.current?.video;
    if (!video) return false;

    setStatus('processing');
    try {
      const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceLandmarks();

      if (!detection) {
        setError('No face detected. Please align your face inside the oval.');
        setStatus('idle');
        return false;
      }

      const screenshot = webcamRef.current.getScreenshot();
      setCaptureFrame(screenshot);
      setEmbedding(null);
      setStatus('idle');
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to capture frame metrics.');
      setStatus('idle');
      return false;
    }
  }, [webcamRef, setCaptureFrame, setEmbedding, setStatus, setError]);

  return {
    modelsLoaded,
    loadingModels,
    analyzeFrame,
    captureFrame
  };
};
