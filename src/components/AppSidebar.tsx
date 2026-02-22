import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Search, UserPlus, BarChart3, Calendar, Settings, 
  Menu, X, Activity, Brain, Bone
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/leads', label: 'Search Leads', icon: Search },
  { path: '/add-lead', label: 'Add Lead', icon: UserPlus },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden glass-card p-2 text-foreground"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen flex flex-col border-r border-border/50 bg-sidebar transition-all duration-300",
          collapsed ? "w-[68px]" : "w-[240px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border/50">
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center glow-blue">
              <Activity className="h-5 w-5 text-primary" />
            </div>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-foreground leading-tight">Ortho Neuro</h1>
              <p className="text-[10px] text-muted-foreground">Hospital CRM</p>
            </div>
          )}
          <button
            onClick={() => { setCollapsed(!collapsed); setMobileOpen(false); }}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors hidden lg:block"
          >
            {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </button>
          <button onClick={() => setMobileOpen(false)} className="ml-auto text-muted-foreground lg:hidden">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Department indicators */}
        {!collapsed && (
          <div className="px-4 py-3 space-y-1.5">
            <div className="flex items-center gap-2 text-[11px]">
              <Bone className="h-3 w-3 text-ortho-teal" />
              <span className="text-muted-foreground">Orthopedics</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <Brain className="h-3 w-3 text-neural-purple" />
              <span className="text-muted-foreground">Neurology</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                location.pathname === item.path
                  ? "bg-primary/15 text-primary font-medium glow-blue"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <item.icon className="h-4.5 w-4.5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="p-4 border-t border-border/50">
            <div className="glass-card p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Powered by</p>
              <p className="text-xs font-semibold gradient-text">OrthoNeuro CRM</p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
