import { enrollmentService } from '../services/enrollment.service';

export const activateWorkerAction = async (workerId: string): Promise<{ success: boolean; message: string }> => {
  return await enrollmentService.activateWorker(workerId);
};
