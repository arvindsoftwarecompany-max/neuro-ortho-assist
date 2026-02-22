import { motion } from 'framer-motion';
import { useLeadsData } from '@/hooks/useLeadsData';
import StatCard from '@/components/StatCard';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, Users, Target, Clock } from 'lucide-react';

const COLORS = ['#2563EB', '#7C3AED', '#0D9488', '#D97706', '#DC2626'];

export default function Analytics() {
  const { leads, stats } = useLeadsData();

  const sourceData = ['Walk-in', 'Phone', 'Website', 'Referral', 'Social Media'].map((s, i) => ({
    name: s, value: leads.filter(l => l.source === s).length, color: COLORS[i],
  })).filter(d => d.value > 0);

  const cityData = Object.entries(
    leads.reduce<Record<string, number>>((acc, l) => { if (l.city) acc[l.city] = (acc[l.city] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));

  const employeeData = Object.entries(
    leads.reduce<Record<string, number>>((acc, l) => { if (l.employee_name) acc[l.employee_name] = (acc[l.employee_name] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">Performance insights and reports</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Pipeline" value={stats.totalLeads} icon={Users} variant="blue" />
        <StatCard title="Conversion Rate" value={stats.conversionRate} icon={Target} variant="teal" suffix="%" />
        <StatCard title="This Week" value={stats.newLeadsThisWeek} icon={TrendingUp} variant="purple" />
        <StatCard title="Pending Followups" value={stats.pendingFollowups} icon={Clock} variant="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Lead Source Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={sourceData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" paddingAngle={3}>
                {sourceData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'hsl(217,33%,11%)', border: '1px solid hsl(217,33%,20%)', borderRadius: '8px', color: '#fff' }} />
              <Legend formatter={v => <span className="text-xs text-muted-foreground">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Top Cities</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={cityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,33%,20%)" />
              <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'hsl(217,33%,11%)', border: '1px solid hsl(217,33%,20%)', borderRadius: '8px', color: '#fff' }} />
              <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">Employee Performance</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={employeeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,33%,20%)" />
              <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} width={100} />
              <Tooltip contentStyle={{ background: 'hsl(217,33%,11%)', border: '1px solid hsl(217,33%,20%)', borderRadius: '8px', color: '#fff' }} />
              <Bar dataKey="value" fill="#7C3AED" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
