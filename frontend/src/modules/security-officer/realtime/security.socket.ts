/**
 * Realtime WebSocket layer for Security Officer module.
 * Connects to the NestJS Socket.IO server and streams live
 * biometric events, geofence alerts, and kiosk status updates.
 */

import { io, Socket } from 'socket.io-client';
import { useSecurityStore } from '../store/security.store';
import type { BiometricEvent, GeofenceViolation } from '../types';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3456';

let socket: Socket | null = null;

export function connectSecuritySocket(token: string) {
  if (socket) {
    socket.disconnect();
  }

  socket = io(`${SOCKET_URL}/security`, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 10,
  });

  const store = useSecurityStore.getState();

  socket.on('connect', () => {
    console.log('[Security Socket] Connected ✅');
  });

  socket.on('disconnect', () => {
    console.warn('[Security Socket] Disconnected ❌');
  });

  // Live biometric check-in/out events
  socket.on('biometric:event', (event: BiometricEvent) => {
    store.addFeedEvent(event);
    if (event.type === 'SPOOF_DETECTED' || event.type === 'FAILED') {
      store.addAlert(event);
    }
  });

  // Geofence violation alert
  socket.on('geofence:violation', (violation: GeofenceViolation) => {
    store.setViolations([violation, ...useSecurityStore.getState().violations]);
  });

  // Kiosk status change
  socket.on('kiosk:status', ({ kioskId, status }: { kioskId: string; status: string }) => {
    console.log(`[Security Socket] Kiosk ${kioskId} -> ${status}`);
  });

  socket.on('connect_error', (err) => {
    console.error('[Security Socket] Connection error:', err.message);
  });
}

export function disconnectSecuritySocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('[Security Socket] Manually disconnected');
  }
}

export function emitSecurityAction(event: string, payload: any) {
  if (!socket?.connected) {
    console.warn('[Security Socket] Cannot emit — socket not connected');
    return;
  }
  socket.emit(event, payload);
}
