import { useState, useEffect } from 'react';
import { registrationService } from '../services/registration.service';
import { registerWorkerAction } from '../actions/register-worker.action';
import type { VendorOption, SiteOption, ShiftOption, WorkerRegistrationInput, WorkerRegistrationResponse } from '../types/registration.types';

export const useWorkerRegistration = () => {
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [shifts, setShifts] = useState<ShiftOption[]>([]);
  
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [result, setResult] = useState<WorkerRegistrationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoadingOptions(true);
        setError(null);
        const [vList, sList, shList] = await Promise.all([
          registrationService.getVendors(),
          registrationService.getSites(),
          registrationService.getShifts()
        ]);

        setVendors(vList);
        setSites(sList);
        setShifts(shList);
      } catch (err: any) {
        console.error('Failed to load form options', err);
        setError(err.message || 'Failed to connect to the authorization boundary. Dropdowns are offline.');
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
  }, []);

  const registerWorker = async (input: WorkerRegistrationInput) => {
    setRegistering(true);
    setError(null);
    try {
      const res = await registerWorkerAction(input);
      setResult(res);
      return res;
    } catch (err: any) {
      setError(err.message || 'Worker registration failed. Please try again.');
      throw err;
    } finally {
      setRegistering(false);
    }
  };

  const resetResult = () => {
    setResult(null);
    setError(null);
  };

  return {
    vendors,
    sites,
    shifts,
    loadingOptions,
    registering,
    result,
    error,
    registerWorker,
    resetResult
  };
};
