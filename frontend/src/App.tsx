import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-slate-50 flex items-center justify-center">
        <div className="text-center space-y-6">
          <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            FenceIn Platform
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            AI-Powered Biometric Workforce Intelligence & Contractor Operations
          </p>
          <div className="flex justify-center gap-4">
            <button className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors font-medium">
              Admin Login
            </button>
            <button className="px-6 py-3 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors font-medium">
              Kiosk Mode
            </button>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
