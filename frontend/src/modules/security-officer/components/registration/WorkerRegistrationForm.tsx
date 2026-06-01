/* eslint-disable react-hooks/incompatible-library */
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { WorkerRegistrationInput, VendorOption, SiteOption, ShiftOption } from '../../types/registration.types';
import VendorSelector from './VendorSelector';
import SkillSelector from './SkillSelector';
import ShiftSelector from './ShiftSelector';
import SiteSelector from './SiteSelector';

const registrationSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(10, 'Valid 10-digit mobile number required').max(10, 'Must be 10 digits'),
  emergencyContact: z.string().min(10, 'Valid 10-digit emergency number required').max(10, 'Must be 10 digits'),
  govId: z.string().min(12, '12-digit Aadhaar Card number required').max(12, 'Aadhaar must be 12 digits'),
  vendorId: z.string().min(1, 'Vendor agency reference is required'),
  skillType: z.string().min(1, 'Skill classification is required'),
  shiftId: z.string().min(1, 'Operational shift is required'),
  siteId: z.string().min(1, 'Project site is required'),
  address: z.string().min(6, 'Full physical address is required'),
  bloodGroup: z.string().min(1, 'Blood group is required'),
});

interface WorkerRegistrationFormProps {
  vendors: VendorOption[];
  sites: SiteOption[];
  shifts: ShiftOption[];
  onSubmit: (data: WorkerRegistrationInput) => void;
  loading: boolean;
}

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function WorkerRegistrationForm({
  vendors,
  sites,
  shifts,
  onSubmit,
  loading
}: WorkerRegistrationFormProps) {
  "use no memo";
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<WorkerRegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      emergencyContact: '',
      govId: '',
      vendorId: '',
      skillType: '',
      shiftId: '',
      siteId: '',
      address: '',
      bloodGroup: ''
    }
  });

  const selectedVendor = watch('vendorId');
  const selectedSkill = watch('skillType');
  const selectedShift = watch('shiftId');
  const selectedSite = watch('siteId');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 text-left">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name Grid */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-300 ml-1">First Name</label>
          <input
            {...register('firstName')}
            className={`block w-full px-4 py-3.5 bg-slate-950/60 border rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all font-medium ${
              errors.firstName ? 'border-brand-500/50' : 'border-slate-800'
            }`}
            placeholder="Jane"
          />
          {errors.firstName && <p className="text-xs font-bold text-brand-400 ml-1">{errors.firstName.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-300 ml-1">Last Name</label>
          <input
            {...register('lastName')}
            className={`block w-full px-4 py-3.5 bg-slate-950/60 border rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all font-medium ${
              errors.lastName ? 'border-brand-500/50' : 'border-slate-800'
            }`}
            placeholder="Smith"
          />
          {errors.lastName && <p className="text-xs font-bold text-brand-400 ml-1">{errors.lastName.message}</p>}
        </div>

        {/* Contacts Grid */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-300 ml-1">Phone Number</label>
          <input
            {...register('phone')}
            type="tel"
            maxLength={10}
            className={`block w-full px-4 py-3.5 bg-slate-950/60 border rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all font-medium ${
              errors.phone ? 'border-brand-500/50' : 'border-slate-800'
            }`}
            placeholder="9876543210"
          />
          {errors.phone && <p className="text-xs font-bold text-brand-400 ml-1">{errors.phone.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-300 ml-1">Emergency Contact Number</label>
          <input
            {...register('emergencyContact')}
            type="tel"
            maxLength={10}
            className={`block w-full px-4 py-3.5 bg-slate-950/60 border rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all font-medium ${
              errors.emergencyContact ? 'border-brand-500/50' : 'border-slate-800'
            }`}
            placeholder="9876543211"
          />
          {errors.emergencyContact && <p className="text-xs font-bold text-brand-400 ml-1">{errors.emergencyContact.message}</p>}
        </div>

        {/* Identity & Blood */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-300 ml-1">Aadhaar (Govt ID)</label>
          <input
            {...register('govId')}
            maxLength={12}
            className={`block w-full px-4 py-3.5 bg-slate-950/60 border rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all font-medium ${
              errors.govId ? 'border-brand-500/50' : 'border-slate-800'
            }`}
            placeholder="12-digit Aadhaar Number"
          />
          {errors.govId && <p className="text-xs font-bold text-brand-400 ml-1">{errors.govId.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-300 ml-1">Blood Group</label>
          <select
            {...register('bloodGroup')}
            className={`block w-full px-4 py-3.5 bg-slate-950/60 border rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all font-medium ${
              errors.bloodGroup ? 'border-brand-500/50' : 'border-slate-800'
            }`}
          >
            <option value="" disabled className="bg-slate-950 text-slate-500 font-semibold">Select Blood Group</option>
            {bloodGroups.map((bg) => (
              <option key={bg} value={bg} className="bg-slate-950 text-slate-100 font-semibold">{bg}</option>
            ))}
          </select>
          {errors.bloodGroup && <p className="text-xs font-bold text-brand-400 ml-1">{errors.bloodGroup.message}</p>}
        </div>

        {/* Dynamic Custom Dropdowns */}
        <VendorSelector
          vendors={vendors}
          value={selectedVendor}
          onChange={(val) => setValue('vendorId', val, { shouldValidate: true })}
          error={errors.vendorId?.message}
        />

        <SkillSelector
          value={selectedSkill}
          onChange={(val) => setValue('skillType', val, { shouldValidate: true })}
          error={errors.skillType?.message}
        />

        <ShiftSelector
          shifts={shifts}
          value={selectedShift}
          onChange={(val) => setValue('shiftId', val, { shouldValidate: true })}
          error={errors.shiftId?.message}
        />

        <SiteSelector
          sites={sites}
          value={selectedSite}
          onChange={(val) => setValue('siteId', val, { shouldValidate: true })}
          error={errors.siteId?.message}
        />
      </div>

      {/* Address */}
      <div className="space-y-2 col-span-2">
        <label className="text-sm font-semibold text-slate-300 ml-1">Full Physical Address</label>
        <textarea
          {...register('address')}
          rows={3}
          className={`block w-full px-4 py-3 bg-slate-950/60 border rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all font-medium ${
            errors.address ? 'border-brand-500/50' : 'border-slate-800'
          }`}
          placeholder="Building name, Street, City, Pincode"
        />
        {errors.address && <p className="text-xs font-bold text-brand-400 ml-1">{errors.address.message}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center py-4 px-4 mt-4 rounded-xl bg-brand-600 hover:bg-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/30 font-extrabold text-white text-lg transition-all shadow-[0_0_25px_rgba(13,255,0,0.2)] disabled:opacity-75 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
      >
        {loading ? (
          <div className="flex items-center space-x-2">
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Submitting Registration Profile...</span>
          </div>
        ) : (
          'Generate Enrollment Token'
        )}
      </button>
    </form>
  );
}
