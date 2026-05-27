import type { SiteOption } from '../../types/registration.types';

interface SiteSelectorProps {
  sites: SiteOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export default function SiteSelector({ sites, value, onChange, error }: SiteSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-300 ml-1">Site / Gate Assignment</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`block w-full px-4 py-3.5 bg-slate-950/60 border rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all font-medium ${
          error ? 'border-brand-500/50' : 'border-slate-800'
        }`}
      >
        <option value="" disabled className="bg-slate-950 text-slate-500">Select Project Location</option>
        {sites.map((site) => (
          <option key={site.id} value={site.id} className="bg-slate-950 text-slate-100">
            {site.name}
          </option>
        ))}
      </select>
      {error && <p className="text-xs font-bold text-brand-400 ml-1">{error}</p>}
    </div>
  );
}
