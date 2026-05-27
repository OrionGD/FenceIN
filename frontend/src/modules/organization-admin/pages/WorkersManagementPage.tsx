import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { Users, Plus, Search, Edit2, Trash2, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import Modal from '@/components/Modal';

export default function WorkersView() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<any>(null);
  const [assignWorker, setAssignWorker] = useState<any>(null);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'WORKER' });
  const [assignSiteId, setAssignSiteId] = useState('');

  const { data: workers, isLoading } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3456/api/v1/workers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const { data: sites } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3456/api/v1/sites', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return res.json();
    }
  });

  const createOrUpdateWorker = useMutation({
    mutationFn: async (data: any) => {
      const isEditing = !!editingWorker;
      const endpoint = isEditing ? `http://localhost:3456/api/v1/workers/${editingWorker.id}` : 'http://localhost:3456/api/v1/workers';
      const method = isEditing ? 'PUT' : 'POST';
      
      const payload = { ...data };
      if (isEditing && !payload.password) delete payload.password; // Don't send empty password

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save worker');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      setIsModalOpen(false);
      setEditingWorker(null);
      setFormData({ firstName: '', lastName: '', email: '', password: '', role: 'WORKER' });
    }
  });

  const deleteWorker = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`http://localhost:3456/api/v1/workers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete worker');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workers'] })
  });

  const assignSiteMutation = useMutation({
    mutationFn: async (data: { workerId: string, siteId: string }) => {
      const res = await fetch('http://localhost:3456/api/v1/sites/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
         const err = await res.json();
         throw new Error(err.message || 'Failed to assign site');
      }
      return res.json();
    },
    onSuccess: () => {
      alert('Assigned Successfully');
      setIsAssignModalOpen(false);
      setAssignWorker(null);
      setAssignSiteId('');
    },
    onError: (err: any) => {
      alert(err.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createOrUpdateWorker.mutate(formData);
  };

  const openAdd = () => {
    setEditingWorker(null);
    setFormData({ firstName: '', lastName: '', email: '', password: '', role: 'WORKER' });
    setIsModalOpen(true);
  };

  const openEdit = (worker: any) => {
    setEditingWorker(worker);
    setFormData({ firstName: worker.firstName, lastName: worker.lastName, email: worker.email, password: '', role: worker.role });
    setIsModalOpen(true);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Workforce Management</h1>
          <p className="text-brand-200/70 mt-1">Manage permanent and temporary contractors.</p>
        </div>
        <button onClick={openAdd} className="flex items-center space-x-2 bg-brand-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-brand-500/20">
          <Plus className="w-5 h-5" />
          <span>Add Worker</span>
        </button>
      </div>

      <div className="bg-bg-secondary border border-brand-500/20 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-brand-500/20 flex justify-between items-center bg-bg-secondary/50">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400/50" />
            <input type="text" placeholder="Search workers..." className="w-full bg-bg-primary border border-brand-500/30 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none text-brand-100" />
          </div>
          <div className="flex items-center space-x-2 text-sm text-brand-200/70">
            <Users className="w-4 h-4" />
            <span>{workers?.length || 0} Total Workers</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-brand-200/90">
            <thead className="bg-brand-900/40/50 text-brand-200/70 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-brand-400/50">Loading workforce data...</td></tr>
              ) : workers?.map((worker: any) => (
                <tr key={worker.id} className="hover:bg-brand-900/40/20 transition-colors">
                  <td className="px-6 py-4 font-medium text-brand-100">{worker.firstName} {worker.lastName}</td>
                  <td className="px-6 py-4">{worker.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${worker.isActive ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' : 'bg-brand-950/20 text-brand-400 border-brand-500/20'}`}>
                      {worker.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex items-center justify-end space-x-3">
                    <button onClick={() => { setAssignWorker(worker); setIsAssignModalOpen(true); }} className="text-brand-400 hover:text-brand-300 transition-colors" title="Assign Geofence"><MapPin className="w-4 h-4" /></button>
                    <button onClick={() => openEdit(worker)} className="text-brand-400 hover:text-brand-300 transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => { if(window.confirm('Delete worker?')) deleteWorker.mutate(worker.id) }} className="text-brand-400 hover:text-brand-300 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingWorker ? 'Edit Worker' : 'Add Worker'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-brand-200/70">First Name</label>
              <input required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-brand-500 focus:border-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-brand-200/70">Last Name</label>
              <input required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-brand-500 focus:border-blue-500" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-brand-200/70">Email Address</label>
            <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-brand-500 focus:border-blue-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-brand-200/70">Password {editingWorker && '(Leave blank to keep current)'}</label>
            <input type="password" required={!editingWorker} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-brand-500 focus:border-blue-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-brand-200/70">Role</label>
            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-brand-500 focus:border-blue-500">
              <option value="WORKER">Standard Worker</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="HR_ADMIN">HR Admin</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end space-x-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-brand-200/90 hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={createOrUpdateWorker.isPending} className="px-6 py-2 bg-brand-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {createOrUpdateWorker.isPending ? 'Saving...' : 'Save Worker'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title={`Assign Geofence to ${assignWorker?.firstName}`}>
        <form onSubmit={(e) => { e.preventDefault(); assignSiteMutation.mutate({ workerId: assignWorker.id, siteId: assignSiteId }) }} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-brand-200/70">Select Site</label>
            <select required value={assignSiteId} onChange={e => setAssignSiteId(e.target.value)} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-emerald-500 focus:border-emerald-500">
              <option value="">Select a geofence site...</option>
              {sites?.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name} (Radius: {s.radius}m)</option>
              ))}
            </select>
          </div>
          <div className="pt-4 flex justify-end space-x-3">
            <button type="button" onClick={() => setIsAssignModalOpen(false)} className="px-4 py-2 text-sm font-medium text-brand-200/90 hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={assignSiteMutation.isPending || !assignSiteId} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {assignSiteMutation.isPending ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}

