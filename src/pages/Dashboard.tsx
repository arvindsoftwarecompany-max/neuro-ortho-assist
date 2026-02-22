import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, CalendarCheck, Clock, XCircle, TrendingUp, Target, Bell, UserCheck,
  Plus, RefreshCw, Bone, Brain
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { useLeadsData } from '@/hooks/useLeadsData';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { CallStatus, Department } from '@/types/leads';
import { cn } from '@/lib/utils';

const COLORS = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626', '#10B981', '#6B7280'];

type DeptTab = 'All' | 'Orthopedics' | 'Neurology';

export default function Dashboard() {
  const { leads, stats, loading, lastUpdated, fetchData } = useLeadsData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DeptTab>('All');

  // Filter leads by selected department tab
  const filteredLeads = useMemo(() => {
    if (activeTab === 'All') return leads;
    return leads.filter(l => l.department === activeTab);
  }, [leads, activeTab]);

  // Recompute stats for filtered leads
  const filteredStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    const fl = filteredLeads;

    return {
      totalLeads: fl.length,
      todayAppointments: fl.filter(l => l.appointment_date === today).length,
      followupsToday: fl.filter(l => l.followup_date === today).length,
      notInterested: fl.filter(l => l.call_status === 'Not Interested').length,
      newLeadsThisWeek: fl.filter(l => l.date_created >= weekAgoStr).length,
      conversionRate: fl.length > 0
        ? Math.round((fl.filter(l => l.call_status === 'Appointment Booked' || l.call_status === 'Converted').length / fl.length) * 100)
        : 0,
      pendingFollowups: fl.filter(l => l.followup_date >= today && l.call_status !== 'Converted' && l.call_status !== 'Lost').length,
      activeDoctors: new Set(fl.filter(l => l.doctor_assigned).map(l => l.doctor_assigned)).size,
    };
  }, [filteredLeads]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  // Chart data from filtered leads
  const statusData = (['New Lead', 'Contacted', 'Appointment Booked', 'Followup', 'Not Interested', 'Converted', 'Lost'] as CallStatus[])
    .map((status, i) => ({
      name: status,
      value: filteredLeads.filter(l => l.call_status === status).length,
      color: COLORS[i],
    }))
    .filter(d => d.value > 0);

  const deptData = [
    { name: 'Orthopedics', count: leads.filter(l => l.department === 'Orthopedics').length, color: '#0D9488' },
    { name: 'Neurology', count: leads.filter(l => l.department === 'Neurology').length, color: '#7C3AED' },
    { name: 'Both', count: leads.filter(l => l.department === 'Both').length, color: '#2563EB' },
  ];

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    return {
      day: d.toLocaleDateString('en', { weekday: 'short' }),
      leads: filteredLeads.filter(l => l.date_created === dateStr).length,
      appointments: filteredLeads.filter(l => l.appointment_date === dateStr).length,
    };
  });

  const recentLeads = filteredLeads.slice(0, 5);
  const todayAppointments = filteredLeads.filter(l => l.appointment_date === today).slice(0, 5);
  const overdueFollowups = filteredLeads.filter(l => l.followup_date && l.followup_date < today).slice(0, 5);

  const deptTabs: DeptTab[] = ['All', 'Orthopedics', 'Neurology'];

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back • Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" className="gap-2" onClick={() => navigate('/add-lead')}>
            <Plus className="h-3.5 w-3.5" /> New Lead
          </Button>
        </div>
      </motion.div>

      {/* Department Filter Tabs */}
      <div className="flex gap-2">
        {deptTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === tab
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {tab === 'Orthopedics' && <Bone className="h-3.5 w-3.5 inline mr-1.5" />}
            {tab === 'Neurology' && <Brain className="h-3.5 w-3.5 inline mr-1.5" />}
            {tab} {tab === 'All' ? `(${leads.length})` : `(${leads.filter(l => l.department === tab).length})`}
          </button>
        ))}
      </div>

      {/* Stats Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <StatCard title="Total Leads" value={filteredStats.totalLeads} icon={Users} variant="blue" onClick={() => navigate('/leads')} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <StatCard title="Today's Appointments" value={filteredStats.todayAppointments} icon={CalendarCheck} variant="green" onClick={() => navigate('/leads?status=Appointment Booked')} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <StatCard title="Followups Today" value={filteredStats.followupsToday} icon={Clock} variant="amber" onClick={() => navigate('/leads?status=Followup')} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <StatCard title="Not Interested" value={filteredStats.notInterested} icon={XCircle} variant="red" onClick={() => navigate('/leads?status=Not Interested')} />
        </motion.div>
      </div>

      {/* Stats Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard title="New This Week" value={filteredStats.newLeadsThisWeek} icon={TrendingUp} variant="purple" onClick={() => navigate('/leads')} />
        <StatCard title="Conversion Rate" value={filteredStats.conversionRate} icon={Target} variant="teal" suffix="%" />
        <StatCard title="Pending Followups" value={filteredStats.pendingFollowups} icon={Bell} variant="amber" onClick={() => navigate('/leads?status=Followup')} />
        <StatCard title="Active Doctors" value={filteredStats.activeDoctors} icon={UserCheck} variant="blue" />
      </div>

      {/* Department Breakdown (always from all leads) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {deptData.map(dept => (
          <motion.div key={dept.name} className="glass-card-hover p-5 cursor-pointer" whileHover={{ scale: 1.02 }}
            onClick={() => navigate(`/leads?department=${dept.name}`)}>
            <div className="flex items-center gap-3 mb-3">
              {dept.name === 'Orthopedics' ? <Bone className="h-5 w-5 text-accent" /> : <Brain className="h-5 w-5 text-secondary" />}
              <h3 className="font-semibold text-foreground">{dept.name}</h3>
            </div>
            <p className="text-3xl font-bold font-mono-med text-foreground">{dept.count}</p>
            <p className="text-xs text-muted-foreground mt-1">Total patients</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Lead Status Distribution</h3>
          {statusData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">No leads in this category</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={2}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(217, 33%, 11%)', border: '1px solid hsl(217, 33%, 20%)', borderRadius: '8px', color: '#fff' }} />
                <Legend formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Status Breakdown</h3>
          {statusData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">No data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={statusData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 20%)" />
                <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} width={120} />
                <Tooltip contentStyle={{ background: 'hsl(217, 33%, 11%)', border: '1px solid hsl(217, 33%, 20%)', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Line Chart */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Weekly Trend</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={last7}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 20%)" />
            <XAxis dataKey="day" tick={{ fill: '#94A3B8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: 'hsl(217, 33%, 11%)', border: '1px solid hsl(217, 33%, 20%)', borderRadius: '8px', color: '#fff' }} />
            <Legend />
            <Line type="monotone" dataKey="leads" stroke="#2563EB" strokeWidth={2} dot={{ fill: '#2563EB', r: 4 }} />
            <Line type="monotone" dataKey="appointments" stroke="#059669" strokeWidth={2} dot={{ fill: '#059669', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Leads + Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-foreground">Recent Leads</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/leads')} className="text-xs text-primary">View All</Button>
          </div>
          <div className="space-y-3">
            {recentLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No leads found</p>
            ) : recentLeads.map(lead => (
              <div key={lead.lead_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/patient/${lead.lead_id}`)}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {lead.patient_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{lead.patient_name}</p>
                    <p className="text-xs text-muted-foreground">{lead.department} • {lead.city}</p>
                  </div>
                </div>
                <StatusBadge status={lead.call_status} />
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-foreground">Today's Appointments</h3>
          </div>
          <div className="space-y-3">
            {todayAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No appointments scheduled for today</p>
            ) : todayAppointments.map(lead => (
              <div key={lead.lead_id} className="flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/20 cursor-pointer"
                onClick={() => navigate(`/patient/${lead.lead_id}`)}>
                <div>
                  <p className="text-sm font-medium text-foreground">{lead.patient_name}</p>
                  <p className="text-xs text-muted-foreground">{lead.appointment_time || 'TBD'} • Dr. {lead.doctor_assigned || 'Unassigned'}</p>
                </div>
                <span className="text-xs text-success font-medium">{lead.department}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
