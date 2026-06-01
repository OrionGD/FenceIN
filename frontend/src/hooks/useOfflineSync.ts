import { useEffect, useState } from 'react';
import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import { encryptData, decryptData } from '../utils/cryptoUtils';

interface FenceInDB extends DBSchema {
  attendance_queue: {
    key: string;
    value: {
      id: string;
      cipherText: ArrayBuffer;
      iv: Uint8Array;
    };
  };
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [db, setDb] = useState<IDBPDatabase<FenceInDB> | null>(null);
  const [pendingSyncs, setPendingSyncs] = useState(0);

  // Declared before useEffect to avoid stale closure captures (react-hooks/immutability)
  const updatePendingCount = async (database: IDBPDatabase<FenceInDB> | null = db) => {
    if (!database) return;
    const count = await database.count('attendance_queue');
    setPendingSyncs(count);
  };

  const syncQueue = async () => {
    if (!db) return;
    const tx = db.transaction('attendance_queue', 'readwrite');
    const store = tx.objectStore('attendance_queue');
    const events = await store.getAll();

    if (events.length === 0) return;

    for (const encryptedRecord of events) {
      try {
        const event = await decryptData(encryptedRecord.cipherText, encryptedRecord.iv);

        const endpoint = event.type === 'CHECK_IN'
          ? 'http://localhost:3456/api/v1/attendance/check-in'
          : `http://localhost:3456/api/v1/attendance/check-out/${event.userId}`;

        const method = event.type === 'CHECK_IN' ? 'POST' : 'PUT';

        const payload = event.type === 'CHECK_IN'
          ? {
              userId: event.userId,
              confidence: event.confidence,
              latitude: event.latitude,
              longitude: event.longitude,
              accuracy: event.accuracy
            }
          : undefined;

        const res = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: payload ? JSON.stringify(payload) : undefined
        });

        if (res.ok || res.status === 400) {
          // 400 means already checked in, we can discard the queue item
          await store.delete(encryptedRecord.id);
        }
      } catch {
        console.error('Failed to sync or decrypt event, retaining in queue:', encryptedRecord.id);
      }
    }

    updatePendingCount();
  };

  const queueAttendance = async (data: any) => {
    if (!db) return false;
    const event = { ...data, id: crypto.randomUUID(), timestamp: Date.now() };
    const encrypted = await encryptData(event);

    await db.put('attendance_queue', {
      id: event.id,
      cipherText: encrypted.cipherText,
      iv: encrypted.iv
    });

    updatePendingCount();
    return true;
  };

  useEffect(() => {
    const initDB = async () => {
      const database = await openDB<FenceInDB>('fencein-offline-db', 1, {
        upgrade(db) {
          db.createObjectStore('attendance_queue', { keyPath: 'id' });
        },
      });
      setDb(database);
      updatePendingCount(database);
    };
    initDB();

    const handleOnline = () => {
      setIsOnline(true);
      syncQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isOnline, pendingSyncs, queueAttendance, syncQueue };
}
