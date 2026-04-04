import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import AdminDashboard from './components/AdminDashboard';
import PartnerPortal from './components/PartnerPortal';
import AdSpecialistDashboard from './components/AdSpecialistDashboard';
import { LayoutDashboard, Users, Megaphone } from 'lucide-react';
import { cn } from './lib/utils';

function NavLink({ to, icon: Icon, children }: { to: string; icon: any; children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
        isActive 
          ? "bg-gray-900 text-white" 
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      )}
    >
      <Icon className="w-4 h-4" />
      {children}
    </Link>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F7F5] font-sans text-gray-900">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white font-bold text-lg">P</div>
            <span className="font-semibold tracking-tight">知島策展管理</span>
          </div>
          <div className="flex items-center gap-2">
            <NavLink to="/" icon={LayoutDashboard}>PPA 邀請看板</NavLink>
            <NavLink to="/partner" icon={Users}>知島審核看板</NavLink>
            <NavLink to="/ads" icon={Megaphone}>廣告投手審核</NavLink>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/partner" element={<PartnerPortal />} />
          <Route path="/ads" element={<AdSpecialistDashboard />} />
        </Routes>
      </Layout>
    </Router>
  );
}
