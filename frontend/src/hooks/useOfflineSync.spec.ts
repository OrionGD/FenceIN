import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfflineSync } from './useOfflineSync';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as idb from 'idb';
import * as cryptoUtils from '../utils/cryptoUtils';

vi.mock('idb', () => ({
  openDB: vi.fn(),
}));

vi.mock('../utils/cryptoUtils', () => ({
  encryptData: vi.fn(),
  decryptData: vi.fn(),
}));

describe('useOfflineSync', () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      count: vi.fn().mockResolvedValue(0),
      put: vi.fn(),
      transaction: vi.fn(),
    };
    (idb.openDB as any).mockResolvedValue(mockDb);
  });

  it('should initialize and listen to online/offline events', async () => {
    const { result } = renderHook(() => useOfflineSync());

    await waitFor(() => {
      expect(result.current.isOnline).toBe(navigator.onLine);
    });

    expect(idb.openDB).toHaveBeenCalledWith('fencein-offline-db', 1, expect.any(Object));
    expect(result.current.isOnline).toBe(navigator.onLine);
    expect(mockDb.count).toHaveBeenCalledWith('attendance_queue');
  });

  it('should queue attendance by encrypting data and storing in IDB', async () => {
    const { result } = renderHook(() => useOfflineSync());
    
    // Wait for DB initialization (so result.current queueAttendance has db)
    await waitFor(() => {
      expect(mockDb.count).toHaveBeenCalled();
    });

    const mockEncrypted = { cipherText: new ArrayBuffer(8), iv: new Uint8Array(12) };
    (cryptoUtils.encryptData as any).mockResolvedValue(mockEncrypted);
    mockDb.count.mockResolvedValue(1);

    let success: boolean;
    await act(async () => {
      success = await result.current.queueAttendance({ type: 'CHECK_IN', userId: 'user-1' });
    });

    expect(success!).toBe(true);
    expect(cryptoUtils.encryptData).toHaveBeenCalled();
    expect(mockDb.put).toHaveBeenCalledWith('attendance_queue', expect.objectContaining({
      cipherText: mockEncrypted.cipherText,
      iv: mockEncrypted.iv,
    }));
    expect(result.current.pendingSyncs).toBe(1);
  });
});
