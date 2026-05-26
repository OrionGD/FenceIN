import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { Plus, MapPin, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Circle, Popup, Marker } from 'react-leaflet';
import Modal from '@/components/Modal';

export default function SitesView() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', latitude: 0, longitude: 0, radius: 25 });
  const mapRef = useRef<any>(null);

  const { data: sites, isLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3456/api/v1/sites', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const createSite = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('http://localhost:3456/api/v1/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: data.name,
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          radius: Number(data.radius)
        })
      });
      if (!res.ok) throw new Error('Failed to save site');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      setIsModalOpen(false);
      setFormData({ name: '', latitude: 0, longitude: 0, radius: 25 });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSite.mutate(formData);
  };

  const center = useMemo(() => {
    if (sites && sites.length > 0) {
      return [sites[0].latitude, sites[0].longitude];
    }
    return [37.7749, -122.4194]; // San Francisco default
  }, [sites]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Geofence Site Management</h1>
          <p className="text-brand-200/70 mt-1">Configure physical perimeters for secure check-ins.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-emerald-500/20">
          <Plus className="w-5 h-5" />
          <span>Add Geofence</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6 flex-1 min-h-[500px]">
        <div className="col-span-1 bg-bg-secondary border border-brand-500/20 rounded-2xl shadow-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-brand-500/20 bg-bg-secondary/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400/50" />
              <input type="text" placeholder="Search sites..." className="w-full bg-bg-primary border border-brand-500/30 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none text-brand-100" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
             {isLoading ? (
                <div className="text-center text-brand-400/50 p-4">Loading sites...</div>
             ) : sites?.map((site: any) => (
                <div 
                  key={site.id} 
                  onClick={() => mapRef.current?.flyTo([site.latitude, site.longitude], 16)}
                  className="p-4 bg-bg-primary border border-brand-500/20 rounded-xl hover:border-emerald-500/50 cursor-pointer transition-colors"
                >
                  <h3 className="text-brand-100 font-semibold flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-green-500" />
                    <span>{site.name}</span>
                  </h3>
                  <div className="text-xs text-brand-400/50 mt-2 space-y-1">
                    <p>Radius: {site.radius} meters</p>
                    <p>Lat: {site.latitude.toFixed(4)}, Lon: {site.longitude.toFixed(4)}</p>
                    <p className="text-emerald-500/80">{site.workers?.length || 0} Assigned Workers</p>
                  </div>
                </div>
             ))}
          </div>
        </div>

        <div className="col-span-2 bg-bg-secondary border border-brand-500/20 rounded-2xl shadow-xl overflow-hidden relative">
          {typeof window !== 'undefined' && (
            <MapContainer 
              center={center as [number, number]} 
              zoom={13} 
              className="w-full h-full z-0"
              ref={mapRef}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              {sites?.map((site: any) => (
                <div key={site.id}>
                  <Marker position={[site.latitude, site.longitude]}>
                    <Popup className="bg-bg-secondary text-white border-none rounded-lg">
                      <div className="font-bold text-slate-800">{site.name}</div>
                      <div className="text-slate-600 text-xs">Radius: {site.radius}m</div>
                    </Popup>
                  </Marker>
                  <Circle 
                    center={[site.latitude, site.longitude]} 
                    radius={site.radius} 
                    pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.2, weight: 2 }} 
                  />
                </div>
              ))}
            </MapContainer>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Geofence Site">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-brand-200/70">Site Name</label>
            <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-emerald-500 focus:border-emerald-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-brand-200/70">Latitude</label>
              <input required type="number" step="any" value={formData.latitude} onChange={e => setFormData({...formData, latitude: Number(e.target.value)})} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-brand-200/70">Longitude</label>
              <input required type="number" step="any" value={formData.longitude} onChange={e => setFormData({...formData, longitude: Number(e.target.value)})} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-brand-200/70">Enforced Radius (meters)</label>
            <input required type="number" value={formData.radius} onChange={e => setFormData({...formData, radius: Number(e.target.value)})} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-emerald-500 focus:border-emerald-500" />
            <p className="text-[10px] text-brand-400/50 mt-1">Default is 25m. Ensure reasonable leeway for GPS drift.</p>
          </div>
          <div className="pt-4 flex justify-end space-x-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-brand-200/90 hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={createSite.isPending} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {createSite.isPending ? 'Saving...' : 'Deploy Geofence'}
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}

