import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { Building2, Plus, Search, Edit2, Trash2, Link } from 'lucide-react';
import { motion } from 'framer-motion';
import Modal from '@/components/Modal';

export default function VendorsView() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [formData, setFormData] = useState({ companyName: '', contactEmail: '', contactPhone: '', managerId: '' });

  const { data: vendors, isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3456/api/v1/vendors', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const { data: managers } = useQuery({
    queryKey: ['vendor-managers'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3456/api/v1/workers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      // In a real app we might fetch just users with VENDOR_MANAGER role, but filtering here for demo
      return data.filter((w: any) => w.role === 'VENDOR_MANAGER' || w.role === 'SUPER_ADMIN' || w.role === 'HR_ADMIN');
    }
  });

  const createOrUpdateVendor = useMutation({
    mutationFn: async (data: any) => {
      const isEditing = !!editingVendor;
      const endpoint = isEditing ? `http://localhost:3456/api/v1/vendors/${editingVendor.id}` : 'http://localhost:3456/api/v1/vendors';
      const method = isEditing ? 'PUT' : 'POST';
      
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to save vendor');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setIsModalOpen(false);
      setEditingVendor(null);
      setFormData({ companyName: '', contactEmail: '', contactPhone: '', managerId: '' });
    }
  });

  const deleteVendor = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`http://localhost:3456/api/v1/vendors/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete vendor');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendors'] })
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createOrUpdateVendor.mutate(formData);
  };

  const openAdd = () => {
    setEditingVendor(null);
    setFormData({ companyName: '', contactEmail: '', contactPhone: '', managerId: '' });
    setIsModalOpen(true);
  };

  const openEdit = (vendor: any) => {
    setEditingVendor(vendor);
    setFormData({ companyName: vendor.companyName, contactEmail: vendor.contactEmail, contactPhone: vendor.contactPhone || '', managerId: vendor.managerId });
    setIsModalOpen(true);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Vendor Management</h1>
          <p className="text-brand-200/70 mt-1">Manage contracting companies and their managers.</p>
        </div>
        <button onClick={openAdd} className="flex items-center space-x-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-brand-500/20 cursor-pointer">
          <Plus className="w-5 h-5" />
          <span>Add Vendor</span>
        </button>
      </div>

      <div className="bg-bg-secondary border border-brand-500/20 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-brand-500/20 flex justify-between items-center bg-bg-secondary/50">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400/50" />
            <input type="text" placeholder="Search vendors..." className="w-full bg-bg-primary border border-brand-500/30 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none text-brand-100" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-brand-200/90">
            <thead className="bg-brand-900/40/50 text-brand-200/70 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-semibold">Company Name</th>
                <th className="px-6 py-4 font-semibold">Contact Email</th>
                <th className="px-6 py-4 font-semibold">Manager</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-brand-400/50">Loading vendors...</td></tr>
              ) : vendors?.map((vendor: any) => (
                <tr key={vendor.id} className="hover:bg-brand-900/40/20 transition-colors">
                  <td className="px-6 py-4 font-medium text-brand-100 flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-900/40 flex items-center justify-center text-brand-200/70">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <span>{vendor.companyName}</span>
                  </td>
                  <td className="px-6 py-4">{vendor.contactEmail}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2 text-brand-200/70">
                      <Link className="w-3.5 h-3.5" />
                      <span>{vendor.manager?.firstName} {vendor.manager?.lastName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right flex items-center justify-end space-x-3">
                    <button onClick={() => openEdit(vendor)} className="text-brand-500 hover:text-brand-300 transition-colors cursor-pointer"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => { if(window.confirm('Delete vendor?')) deleteVendor.mutate(vendor.id) }} className="text-brand-400 hover:text-brand-300 transition-colors cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingVendor ? 'Edit Vendor' : 'Add Vendor'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-brand-200/70">Company Name</label>
            <input required value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-brand-500 focus:border-brand-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-brand-200/70">Contact Email</label>
              <input required type="email" value={formData.contactEmail} onChange={e => setFormData({...formData, contactEmail: e.target.value})} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-brand-500 focus:border-brand-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-brand-200/70">Contact Phone</label>
              <input value={formData.contactPhone} onChange={e => setFormData({...formData, contactPhone: e.target.value})} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-brand-500 focus:border-brand-500" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-brand-200/70">Assign Internal Manager</label>
            <select required value={formData.managerId} onChange={e => setFormData({...formData, managerId: e.target.value})} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-brand-500 focus:border-brand-500">
              <option value="">Select a manager...</option>
              {managers?.map((m: any) => (
                <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.role})</option>
              ))}
            </select>
          </div>
          <div className="pt-4 flex justify-end space-x-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-brand-200/90 hover:text-white transition-colors cursor-pointer">Cancel</button>
            <button type="submit" disabled={createOrUpdateVendor.isPending} className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer">
              {createOrUpdateVendor.isPending ? 'Saving...' : 'Save Vendor'}
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}

