import type { WorkerRegistrationInput, WorkerRegistrationResponse } from '../types/registration.types';
import { registrationService } from '../services/registration.service';
import { workerRequestService } from '../services/worker-request.service';

export const registerWorkerAction = async (input: WorkerRegistrationInput): Promise<WorkerRegistrationResponse> => {
  try {
    // Attempt REST Gateway Submission
    return await registrationService.registerWorker(input);
  } catch (error) {
    console.warn('REST gateway offline, generating offline credential request...', error);
    
    // Save to local storage queue
    const saved = workerRequestService.saveLocalRequest(input);
    
    return {
      success: true,
      workerRequestId: saved.id,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${saved.id}`,
      status: 'PENDING_SECURITY_ENROLLMENT'
    };
  }
};
