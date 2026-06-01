/**
 * Realtime WebSocket layer for Organization Admin module.
 * Streams live attendance events, kiosk status, and geofence alerts.
 */

import { io, Socket } from 'socket.io-client';
import { useOrgAdminStore } from '../store/org-admin.store';
import type { AttendanceRecord, KioskDevice } from '../types';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3456';

let socket: Socket | null = null;

export function connectOrgSocket(token: string, orgId: string) {
  if (socket) {
    socket.disconnect();
  }

  socket = io(`${SOCKET_URL}/org`, {
    auth: { token },
    query: { orgId },
    reconnection: true,
    reconnectionDelay: 2000,
  });

  const store = useOrgAdminStore.getState();

  socket.on('connect', () => {
    console.log('[Org Socket] Connected ✅');
  });

  socket.on('disconnect', () => {
    console.warn('[Org Socket] Disconnected ❌');
  });

  // Live attendance check-in events
  socket.on('attendance:checkin', (record: AttendanceRecord) => {
    store.addAttendanceRecord(record);
  });

  // Kiosk status updates
  socket.on('kiosk:update', (kiosk: KioskDevice) => {
    const kiosks = useOrgAdminStore.getState().kiosks.map((k) =>
      k.id === kiosk.id ? kiosk : k
    );
    store.setKiosks(kiosks);
  });

  socket.on('connect_error', (err) => {
    console.error('[Org Socket] Connection error:', err.message);
  });
}

export function disconnectOrgSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
