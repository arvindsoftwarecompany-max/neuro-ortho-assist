import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import SearchLeads from "@/pages/SearchLeads";
import AddLead from "@/pages/AddLead";
import PatientReport from "@/pages/PatientReport";
import Analytics from "@/pages/Analytics";
import CalendarView from "@/pages/CalendarView";
import SettingsPage from "@/pages/SettingsPage";
import OpdReminder from "@/pages/OpdReminder";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/opd-reminder" element={<OpdReminder />} />
            <Route path="/leads" element={<SearchLeads />} />
            <Route path="/add-lead" element={<AddLead />} />
            <Route path="/patient/:id" element={<PatientReport />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
