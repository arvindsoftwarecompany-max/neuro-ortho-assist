import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import SearchLeads from "@/pages/SearchLeads";
import AddLead from "@/pages/AddLead";
import PatientReport from "@/pages/PatientReport";
import Analytics from "@/pages/Analytics";
import CalendarView from "@/pages/CalendarView";
import SettingsPage from "@/pages/SettingsPage";
import OpdReminder from "@/pages/OpdReminder";
import IpdFollowup from "@/pages/IpdFollowup";
import AuthPage from "@/pages/AuthPage";
import ConfigPage from "@/pages/ConfigPage";
import NotFound from "@/pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!profile?.is_configured) return <Navigate to="/config" replace />;

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (user && profile?.is_configured) return <Navigate to="/" replace />;
  if (user && !profile?.is_configured) return <Navigate to="/config" replace />;
  return <>{children}</>;
}

function ConfigRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<AuthRoute><AuthPage /></AuthRoute>} />
    <Route path="/config" element={<ConfigRoute><ConfigPage /></ConfigRoute>} />
    <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
      <Route path="/" element={<Dashboard />} />
      <Route path="/opd-reminder" element={<OpdReminder />} />
      <Route path="/ipd-followup" element={<IpdFollowup />} />
      <Route path="/leads" element={<SearchLeads />} />
      <Route path="/add-lead" element={<AddLead />} />
      <Route path="/patient/:id" element={<PatientReport />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/calendar" element={<CalendarView />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
