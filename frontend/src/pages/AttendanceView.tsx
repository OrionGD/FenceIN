import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { Clock, CheckCircle2, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';

export default function AttendanceView() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [socketConnected, setSocketConnected] = useState(false);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3456/api/v1/attendance/today', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch attendance');
      return res.json();
    },
    refetchInterval: 60000 
  });

  useEffect(() => {
    const socket = io('http://localhost:3456');
    
    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('attendance_update', () => {
      // Invalidate and refetch immediately when someone checks in/out
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Real-Time Attendance</h1>
          <p className="text-slate-400 mt-1">Monitor active shifts, check-ins, and overtime live.</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <h2 className="text-lg font-medium text-slate-200">Today's Logs</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => window.open('http://localhost:3456/api/v1/reports/compliance/pdf', '_blank')}
              className="text-xs font-medium text-purple-400 bg-purple-400/10 hover:bg-purple-400/20 px-3 py-1.5 rounded-lg border border-purple-400/20 transition-colors"
            >
              Export PDF
            </button>
            <button
              onClick={() => window.open('http://localhost:3456/api/v1/reports/payroll/excel', '_blank')}
              className="text-xs font-medium text-blue-400 bg-blue-400/10 hover:bg-blue-400/20 px-3 py-1.5 rounded-lg border border-blue-400/20 transition-colors"
            >
              Export Excel
            </button>
            {socketConnected ? (
              <span className="flex items-center space-x-1.5 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                <span>Live Stream</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 text-xs font-medium text-slate-400 bg-slate-800 px-2 py-1 rounded-full border border-slate-700">
                <Clock className="w-3.5 h-3.5" />
                <span>Polling Sync</span>
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-semibold">Worker</th>
                <th className="px-6 py-4 font-semibold">Check In</th>
                <th className="px-6 py-4 font-semibold">Check Out</th>
                <th className="px-6 py-4 font-semibold">Duration</th>
                <th className="px-6 py-4 font-semibold">Overtime</th>
                <th className="px-6 py-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading attendance data...</td>
                </tr>
              ) : logs?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No workers checked in today.</td>
                </tr>
              ) : logs?.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-200 flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                      {log.user.firstName[0]}{log.user.lastName[0]}
                    </div>
                    <div>
                      <div>{log.user.firstName} {log.user.lastName}</div>
                      <div className="text-xs text-slate-500">{log.user.role.replace('_', ' ')}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-green-400 font-medium">{formatTime(log.checkIn)}</td>
                  <td className="px-6 py-4 text-slate-400 font-medium">
                    {log.checkOut ? formatTime(log.checkOut) : '--:--'}
                  </td>
                  <td className="px-6 py-4">{formatDuration(log.durationMinutes)}</td>
                  <td className="px-6 py-4">
                    {log.overtimeMinutes > 0 ? (
                      <span className="text-orange-400 font-medium">+{formatDuration(log.overtimeMinutes)}</span>
                    ) : (
                      <span className="text-slate-600">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {log.status === 'ACTIVE' ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium border bg-blue-500/10 text-blue-400 border-blue-500/20">
                        <Clock className="w-3 h-3" />
                        <span>Active Shift</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-800 text-slate-400 border-slate-700">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Completed</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
