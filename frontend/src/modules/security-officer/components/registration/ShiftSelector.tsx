import type { ShiftOption } from '../../types/registration.types';

interface ShiftSelectorProps {
  shifts: ShiftOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export default function ShiftSelector({ shifts, value, onChange, error }: ShiftSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-300 ml-1">Assigned Operational Shift</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`block w-full px-4 py-3.5 bg-slate-950/60 border rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all font-medium ${
          error ? 'border-brand-500/50' : 'border-slate-800'
        }`}
      >
        <option value="" disabled className="bg-slate-950 text-slate-500">Select Shift Schedule</option>
        {shifts.map((shift) => (
          <option key={shift.id} value={shift.id} className="bg-slate-950 text-slate-100">
            {shift.name} ({shift.startTime} - {shift.endTime})
          </option>
        ))}
      </select>
      {error && <p className="text-xs font-bold text-brand-400 ml-1">{error}</p>}
    </div>
  );
}
