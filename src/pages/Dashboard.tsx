import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, CalendarCheck, Clock, XCircle, TrendingUp, Target, Bell, UserCheck,
  Plus, RefreshCw, Bone, Brain, Pencil, CreditCard, Landmark, Banknote, Shield
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { useLeadsData } from '@/hooks/useLeadsData';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { CallStatus, Department, Lead } from '@/types/leads';
import { cn } from '@/lib/utils';
import LeadUpdateSheet from '@/components/LeadUpdateSheet';

const COLORS = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626', '#10B981', '#6B7280'];

type DeptTab = 'All' | 'Orthopedics' | 'Neurology';

export default function Dashboard() {
  const { leads, stats, loading, lastUpdated, fetchData, updateLead } = useLeadsData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DeptTab>('All');
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [activePayment, setActivePayment] = useState<string | null>(null);

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
  const todayFollowups = filteredLeads.filter(l => l.followup_date === today).slice(0, 5);
  const todayAppointments = filteredLeads.filter(l => l.appointment_date === today).slice(0, 5);
  const overdueFollowups = filteredLeads.filter(l => l.followup_date && l.followup_date < today && l.call_status !== 'Converted' && l.call_status !== 'Lost').slice(0, 5);

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
          <StatCard title="Today's Appointments" value={filteredStats.todayAppointments} icon={CalendarCheck} variant="green" onClick={() => navigate('/leads?filter=today_appointments')} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <StatCard title="Followups Today" value={filteredStats.followupsToday} icon={Clock} variant="amber" onClick={() => navigate('/leads?filter=today_followups')} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <StatCard title="Conversion Rate" value={filteredStats.conversionRate} icon={Target} variant="teal" suffix="%" />
        </motion.div>
      </div>

      {/* Stats Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard title="New This Week" value={filteredStats.newLeadsThisWeek} icon={TrendingUp} variant="purple" onClick={() => navigate('/leads')} />
        <StatCard title="Pending Followups" value={filteredStats.pendingFollowups} icon={Bell} variant="amber" onClick={() => navigate('/leads?filter=pending_followups')} />
        <StatCard title="Active Doctors" value={filteredStats.activeDoctors} icon={UserCheck} variant="blue" />
        <StatCard title="Not Interested" value={filteredStats.notInterested} icon={XCircle} variant="red" onClick={() => navigate('/leads?status=Not Interested')} />
      </div>

      {/* Payment Type Breakdown */}
      {(() => {
        const paymentTypes = [
          { name: 'RGHS', icon: Shield, color: 'bg-primary/15 text-primary', border: 'border-primary/20', bg: 'bg-primary/5' },
          { name: 'ECHS', icon: Landmark, color: 'bg-secondary/15 text-secondary', border: 'border-secondary/20', bg: 'bg-secondary/5' },
          { name: 'Cash', icon: Banknote, color: 'bg-success/15 text-success', border: 'border-success/20', bg: 'bg-success/5' },
          { name: 'Private', icon: CreditCard, color: 'bg-warning/15 text-warning', border: 'border-warning/20', bg: 'bg-warning/5' },
        ];
        const paymentLeads = activePayment ? filteredLeads.filter(l => l.blood_group === activePayment).slice(0, 10) : [];
        return (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {paymentTypes.map(pt => {
                const count = filteredLeads.filter(l => l.blood_group === pt.name).length;
                const isActive = activePayment === pt.name;
                return (
                  <motion.div key={pt.name} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className={cn(
                      "glass-card-hover p-4 md:p-5 cursor-pointer transition-all",
                      isActive && `ring-2 ring-primary/50 ${pt.bg}`
                    )}
                    onClick={() => setActivePayment(isActive ? null : pt.name)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{pt.name}</p>
                        <p className="text-2xl md:text-3xl font-bold text-foreground">{count}</p>
                      </div>
                      <div className={cn('p-2.5 rounded-lg', pt.color)}>
                        <pt.icon className="h-5 w-5" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {activePayment && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" /> {activePayment} Patients
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                      {filteredLeads.filter(l => l.blood_group === activePayment).length}
                    </span>
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setActivePayment(null)} className="text-xs text-primary">Close</Button>
                </div>
                <div className="space-y-3">
                  {paymentLeads.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No {activePayment} patients found.</p>
                  ) : paymentLeads.map(lead => (
                    <div key={lead.lead_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => navigate(`/patient/${lead.lead_id}`)}>
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          {lead.patient_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{lead.patient_name}</p>
                          <p className="text-xs text-muted-foreground">{lead.department} • {lead.mobile} • Dr. {lead.doctor_assigned || 'Unassigned'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={lead.call_status} />
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={(e) => { e.stopPropagation(); setEditLead(lead); }}>
                          <Pencil className="h-3 w-3" /> Update
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        );
      })()}

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

      {/* Today's Appointments + Followups Today */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's Appointments */}
        <div className="glass-card p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-success" /> Today's Appointments
              <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full">{todayAppointments.length}</span>
            </h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/leads?filter=today_appointments')} className="text-xs text-primary">View All</Button>
          </div>
          <div className="space-y-3">
            {todayAppointments.length === 0 ? (
              <div className="text-center py-8">
                <CalendarCheck className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No appointments scheduled for today.</p>
              </div>
            ) : todayAppointments.map(lead => (
              <div key={lead.lead_id} className="flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/20 hover:bg-success/10 transition-colors">
                <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => navigate(`/patient/${lead.lead_id}`)}>
                  <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center text-xs font-bold text-success">
                    {lead.patient_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{lead.patient_name}</p>
                    <p className="text-xs text-muted-foreground">{lead.mobile} • {lead.appointment_time || 'TBD'} • Dr. {lead.doctor_assigned || 'Unassigned'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <StatusBadge status={lead.call_status} />
                    <p className="text-xs text-muted-foreground mt-1">{lead.department}</p>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={(e) => { e.stopPropagation(); setEditLead(lead); }}>
                    <Pencil className="h-3 w-3" /> Update
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Followups Today */}
        <div className="glass-card p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" /> Followups Today
              <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full">{todayFollowups.length}</span>
            </h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/leads?filter=today_followups')} className="text-xs text-primary">View All</Button>
          </div>
          <div className="space-y-3">
            {todayFollowups.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No follow-ups scheduled for today.</p>
              </div>
            ) : todayFollowups.map(lead => (
              <div key={lead.lead_id} className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20 hover:bg-warning/10 transition-colors">
                <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => navigate(`/patient/${lead.lead_id}`)}>
                  <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center text-xs font-bold text-warning">
                    {lead.patient_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{lead.patient_name}</p>
                    <p className="text-xs text-muted-foreground">{lead.department} • {lead.mobile}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={lead.call_status} />
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={(e) => { e.stopPropagation(); setEditLead(lead); }}>
                    <Pencil className="h-3 w-3" /> Update
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Overdue Followups + Recent Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Overdue Followups */}
        <div className="glass-card p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Bell className="h-4 w-4 text-destructive" /> Overdue Followups
              <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">{overdueFollowups.length}</span>
            </h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/leads?filter=overdue_followups')} className="text-xs text-primary">View All</Button>
          </div>
          <div className="space-y-3">
            {overdueFollowups.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No overdue follow-ups. You're all caught up!</p>
              </div>
            ) : overdueFollowups.map(lead => (
              <div key={lead.lead_id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20 hover:bg-destructive/10 transition-colors">
                <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => navigate(`/patient/${lead.lead_id}`)}>
                  <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center text-xs font-bold text-destructive">
                    {lead.patient_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{lead.patient_name}</p>
                    <p className="text-xs text-destructive">Due: {lead.followup_date} ⚠</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={lead.call_status} />
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={(e) => { e.stopPropagation(); setEditLead(lead); }}>
                    <Pencil className="h-3 w-3" /> Update
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Leads */}
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
      </div>
      <LeadUpdateSheet lead={editLead} open={!!editLead} onClose={() => setEditLead(null)} onUpdate={updateLead} />
    </div>
  );
}
