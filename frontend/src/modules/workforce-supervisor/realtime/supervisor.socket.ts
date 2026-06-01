/**
 * Realtime WebSocket layer for Workforce Supervisor module.
 * Streams live worker check-ins, task updates, and incident alerts.
 */

import { io, Socket } from 'socket.io-client';
import { useSupervisorStore } from '../store/supervisor.store';
import type { LiveWorker, IncidentReport } from '../types';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3456';

let socket: Socket | null = null;

export function connectSupervisorSocket(token: string, siteId: string) {
  if (socket) {
    socket.disconnect();
  }

  socket = io(`${SOCKET_URL}/supervisor`, {
    auth: { token },
    query: { siteId },
    reconnection: true,
    reconnectionDelay: 2000,
  });

  const store = useSupervisorStore.getState();

  socket.on('connect', () => {
    console.log('[Supervisor Socket] Connected ✅');
  });

  socket.on('disconnect', () => {
    console.warn('[Supervisor Socket] Disconnected ❌');
  });

  // Worker checks in at kiosk
  socket.on('worker:checkin', (worker: LiveWorker) => {
    store.addLiveWorker(worker);
  });

  // Worker checks out
  socket.on('worker:checkout', ({ workerId }: { workerId: string }) => {
    store.removeLiveWorker(workerId);
  });

  // New incident reported
  socket.on('incident:new', (incident: IncidentReport) => {
    store.addIncident(incident);
  });

  socket.on('connect_error', (err) => {
    console.error('[Supervisor Socket] Connection error:', err.message);
  });
}

export function disconnectSupervisorSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function emitManualAttendance(payload: { workerId: string; type: 'CHECK_IN' | 'CHECK_OUT'; reason: string }) {
  if (!socket?.connected) return;
  socket.emit('attendance:manual', payload);
}
