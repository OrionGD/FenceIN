import { 
  Activity, Search, Filter, Plus, FileText, 
  Settings, Bell, MoreVertical, ShieldCheck,
  TrendingUp, Users, Calendar, LayoutGrid
} from 'lucide-react';

export default function GeofenceViolationsPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Geofence Violations</h1>
          <p className="text-slate-400 mt-1">Manage and view geofence violations for the security officer module.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-slate-900 border border-slate-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all w-64"
            />
          </div>
          <button className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg transition-colors">
            <Filter className="w-5 h-5" />
          </button>
          <button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-blue-500/20 font-medium">
            <Plus className="w-5 h-5" />
            <span>Create New</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Records', value: '1,248', change: '+12%', icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { title: 'Active Status', value: '892', change: '+5%', icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { title: 'Pending Actions', value: '24', change: '-2%', icon: Bell, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { title: 'System Health', value: '99.9%', change: '0%', icon: ShieldCheck, color: 'text-purple-400', bg: 'bg-purple-500/10' }
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition-colors">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-sm font-medium">{stat.title}</p>
                <h3 className="text-2xl font-bold text-white mt-2">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-emerald-400 mr-1" />
              <span className="text-emerald-400 font-medium">{stat.change}</span>
              <span className="text-slate-500 ml-2">vs last month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Recent Activity</h2>
            <button className="text-slate-400 hover:text-white transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-sm">
                  <th className="pb-3 font-medium">ID</th>
                  <th className="pb-3 font-medium">Description</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[1, 2, 3, 4, 5].map((row) => (
                  <tr key={row} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 text-slate-300 font-medium">#REQ-00{row}</td>
                    <td className="py-4 text-slate-400">System update and sync for module</td>
                    <td className="py-4">
                      <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full text-xs font-medium border border-emerald-500/20">
                        Completed
                      </span>
                    </td>
                    <td className="py-4 text-slate-500">2 mins ago</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
          <div className="space-y-3">
            {[
              { label: 'Generate Report', icon: FileText },
              { label: 'Manage Users', icon: Users },
              { label: 'Schedule Task', icon: Calendar },
              { label: 'System Settings', icon: Settings }
            ].map((action, i) => (
              <button key={i} className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 transition-all group">
                <div className="flex items-center space-x-3">
                  <action.icon className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" />
                  <span className="text-slate-300 font-medium group-hover:text-white transition-colors">{action.label}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                  <LayoutGrid className="w-4 h-4 text-white" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
