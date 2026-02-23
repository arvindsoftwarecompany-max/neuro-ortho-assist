import { useState, useMemo } from 'react';
import {
  Clock, Plus, RefreshCw, Download, CalendarIcon, Search, Phone, MapPin, Building2, Bell, X
} from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useOpdData } from '@/hooks/useOpdData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import StatCard from '@/components/StatCard';

export default function OpdReminder() {
  const { reminders, loading, lastUpdated, fetchData, addReminder } = useOpdData();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '', mobile: '', city: '', facility: '', next_visit: '', reminder_1_day: '', time: ''
  });

  const today = new Date().toISOString().split('T')[0];

  const filteredReminders = useMemo(() => {
    let data = reminders;
    // Active filter from stat card click
    if (activeFilter === 'todayFollowup') {
      data = data.filter(r => r.reminder_1_day === today);
    } else if (activeFilter === 'todayVisits') {
      data = data.filter(r => r.next_visit === today);
    }
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(r =>
        r.name.toLowerCase().includes(q) || r.mobile.includes(q) || r.city.toLowerCase().includes(q) || r.facility.toLowerCase().includes(q)
      );
    }
    if (dateFrom) {
      const from = format(dateFrom, 'yyyy-MM-dd');
      data = data.filter(r => r.next_visit >= from);
    }
    if (dateTo) {
      const to = format(dateTo, 'yyyy-MM-dd');
      data = data.filter(r => r.next_visit <= to);
    }
    return data;
  }, [reminders, search, dateFrom, dateTo, activeFilter, today]);

  const stats = useMemo(() => {
    const todayVisits = reminders.filter(r => r.next_visit === today).length;
    const todayFollowup = reminders.filter(r => r.reminder_1_day === today).length;
    const overdue = reminders.filter(r => r.next_visit && r.next_visit < today).length;
    const facilities = new Set(reminders.map(r => r.facility).filter(Boolean)).size;
    return { total: reminders.length, todayVisits, todayFollowup, overdue, facilities };
  }, [reminders, today]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addReminder(formData);
    setFormData({ name: '', mobile: '', city: '', facility: '', next_visit: '', reminder_1_day: '', time: '' });
    setShowForm(false);
  };

  const exportCSV = () => {
    if (!filteredReminders.length) return;
    const headers = ['Name', 'Mobile', 'City', 'Facility', 'Next Visit', 'Reminder 1 Day', 'Time'];
    const rows = filteredReminders.map(r => [r.name, r.mobile, r.city, r.facility, r.next_visit, r.reminder_1_day, r.time]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'opd_reminders.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading OPD reminders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">OPD Reminder</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage patient visit reminders • Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showForm ? 'Close Form' : 'Add Reminder'}
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <StatCard title="Total Patients" value={stats.total} icon={Clock} variant="blue" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <StatCard title="Today's Visits" value={stats.todayVisits} icon={CalendarIcon} variant={activeFilter === 'todayVisits' ? 'green' : 'green'}
            onClick={() => setActiveFilter(activeFilter === 'todayVisits' ? null : 'todayVisits')} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <StatCard title="Today Followup" value={stats.todayFollowup} icon={Bell} variant={activeFilter === 'todayFollowup' ? 'green' : 'amber'}
            onClick={() => setActiveFilter(activeFilter === 'todayFollowup' ? null : 'todayFollowup')} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <StatCard title="Overdue" value={stats.overdue} icon={Clock} variant="red" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <StatCard title="Facilities" value={stats.facilities} icon={Building2} variant="purple" />
        </motion.div>
      </div>

      {/* Add Reminder Form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> Add New OPD Reminder
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Name *</Label>
              <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required placeholder="Patient name" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mobile *</Label>
              <Input value={formData.mobile} onChange={e => setFormData(p => ({ ...p, mobile: e.target.value }))} required placeholder="Mobile number" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">City</Label>
              <Input value={formData.city} onChange={e => setFormData(p => ({ ...p, city: e.target.value }))} placeholder="City" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Facility</Label>
              <Input value={formData.facility} onChange={e => setFormData(p => ({ ...p, facility: e.target.value }))} placeholder="Facility name" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Next Visit *</Label>
              <Input type="date" value={formData.next_visit} onChange={e => setFormData(p => ({ ...p, next_visit: e.target.value }))} required className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reminder 1 Day</Label>
              <Input value={formData.reminder_1_day} onChange={e => setFormData(p => ({ ...p, reminder_1_day: e.target.value }))} placeholder="Yes/No" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Time</Label>
              <Input type="time" value={formData.time} onChange={e => setFormData(p => ({ ...p, time: e.target.value }))} className="h-9 text-sm" />
            </div>
            <div className="flex items-end">
              <Button type="submit" size="sm" className="w-full gap-2 h-9">
                <Plus className="h-3.5 w-3.5" /> Save Reminder
              </Button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, mobile, city, facility..." className="pl-9 h-9 text-sm" />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("h-9 text-xs gap-1", dateFrom && "border-primary/50")}>
              <CalendarIcon className="h-3 w-3" />
              {dateFrom ? format(dateFrom, 'dd MMM yyyy') : 'From Date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("h-9 text-xs gap-1", dateTo && "border-primary/50")}>
              <CalendarIcon className="h-3 w-3" />
              {dateTo ? format(dateTo, 'dd MMM yyyy') : 'To Date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>Clear</Button>
        )}
        <Button variant="outline" size="sm" onClick={exportCSV} className="h-9 text-xs gap-1 ml-auto">
          <Download className="h-3 w-3" /> Download CSV
        </Button>
      </div>

      {/* Data List */}
      <div className="glass-card overflow-hidden">
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-7 gap-2 px-4 py-3 text-xs font-semibold text-muted-foreground bg-muted/30 border-b border-border/50">
          <span>Name</span>
          <span>Mobile</span>
          <span>City</span>
          <span>Facility</span>
          <span>Next Visit</span>
          <span>Reminder</span>
          <span>Time</span>
        </div>
        <div className="divide-y divide-border/30 max-h-[500px] overflow-y-auto">
          {filteredReminders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No reminders found.</p>
          ) : filteredReminders.map(r => {
            const isToday = r.next_visit === today;
            const isOverdue = r.next_visit && r.next_visit < today;
            return (
              <div
                key={r.id}
                className={cn(
                  "grid grid-cols-1 md:grid-cols-7 gap-1 md:gap-2 px-4 py-3 text-sm hover:bg-muted/30 transition-colors",
                  isToday && "bg-primary/5 border-l-2 border-l-primary",
                  isOverdue && "bg-destructive/5 border-l-2 border-l-destructive"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary md:flex hidden">
                    {r.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-foreground">{r.name}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Phone className="h-3 w-3 md:hidden" />
                  <span>{r.mobile}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3 w-3 md:hidden" />
                  <span>{r.city}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Building2 className="h-3 w-3 md:hidden" />
                  <span>{r.facility}</span>
                </div>
                <div>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    isToday && "bg-primary/20 text-primary font-medium",
                    isOverdue && "bg-destructive/20 text-destructive font-medium",
                    !isToday && !isOverdue && "text-muted-foreground"
                  )}>
                    {r.next_visit || '-'}
                  </span>
                </div>
                <span className="text-muted-foreground">{r.reminder_1_day || '-'}</span>
                <span className="text-muted-foreground">{r.time || '-'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="text-xs text-muted-foreground text-center">
        Showing {filteredReminders.length} of {reminders.length} reminders
      </div>
    </div>
  );
}
