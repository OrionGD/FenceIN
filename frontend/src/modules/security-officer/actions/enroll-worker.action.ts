import { enrollmentService } from '../services/enrollment.service';
import { workerRequestService } from '../services/worker-request.service';

export const enrollWorkerAction = async (
  workerRequestId: string, 
  image: string
): Promise<{ success: boolean; message: string }> => {
  // 1. Enroll Face Embedding
  const enrollRes = await enrollmentService.enrollFace(workerRequestId, image);
  if (!enrollRes.success) {
    throw new Error(enrollRes.message || 'Face biometrics enrollment failed');
  }

  // 2. Activate Worker Account
  const activateRes = await enrollmentService.activateWorker(workerRequestId);
  if (!activateRes.success) {
    throw new Error(activateRes.message || 'Worker activation failed');
  }

  // 3. Mark request as ACTIVE locally
  workerRequestService.updateRequestStatusLocal(workerRequestId, 'ACTIVE');

  return {
    success: true,
    message: 'Worker enrollment completed and account fully activated!'
  };
};
