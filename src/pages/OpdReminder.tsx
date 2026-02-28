import { useState, useMemo } from 'react';
import { toast } from '@/hooks/use-toast';
import {
  Clock, Plus, RefreshCw, Download, CalendarIcon, Search, Phone, MapPin, Building2, Bell, X, Pencil, CreditCard, MessageCircle, CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useOpdData } from '@/hooks/useOpdData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import StatCard from '@/components/StatCard';
import { OpdReminder as OpdReminderType } from '@/types/opd';
import OpdActionButtons, { getOpdWhatsAppUrl } from '@/components/OpdActionButtons';
import { useAuth } from '@/contexts/AuthContext';

export default function OpdReminder() {
  const { profile } = useAuth();
  const hospitalName = profile?.hospital_name || 'Hospital';
  const { reminders, loading, lastUpdated, fetchData, addReminder, updateReminder } = useOpdData();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [editReminder, setEditReminder] = useState<OpdReminderType | null>(null);
  const [editForm, setEditForm] = useState({ name: '', mobile: '', city: '', facility: '', next_visit: '', reminder_1_day: '', remark: '', payment_type: '' });
  const [paymentFilter, setPaymentFilter] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '', mobile: '', city: '', next_visit: '', remark: '', facility: '', reminder_1_day: '', time: '', payment_type: ''
  });

  const [showSearch, setShowSearch] = useState(false);
  const [searchMobile, setSearchMobile] = useState('');
  const [searchResults, setSearchResults] = useState<OpdReminderType[]>([]);
  const [searchDone, setSearchDone] = useState(false);

  const handlePatientSearch = () => {
    if (!searchMobile.trim()) return;
    const q = searchMobile.trim();
    const results = reminders.filter(r => r.mobile.includes(q));
    setSearchResults(results);
    setSearchDone(true);
  };

  const handleSearchSelect = (r: OpdReminderType) => {
    openEditSheet(r);
    setShowSearch(false);
    setSearchMobile('');
    setSearchResults([]);
    setSearchDone(false);
  };

  const today = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().split('T')[0];

  const todayAppointments = useMemo(() => reminders.filter(r => r.next_visit === today), [reminders, today]);

  const filteredReminders = useMemo(() => {
    let data = reminders;
    if (activeFilter === 'todayFollowup') {
      data = data.filter(r => r.reminder_1_day === today);
    } else if (activeFilter === 'todayVisits') {
      data = data.filter(r => r.next_visit === today);
    } else if (activeFilter === 'yesterdayMissed') {
      data = data.filter(r => r.next_visit === yesterday);
    }
    if (paymentFilter) {
      data = data.filter(r => r.payment_type === paymentFilter);
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
  }, [reminders, search, dateFrom, dateTo, activeFilter, paymentFilter, today]);

  const paymentStats = useMemo(() => ({
    RGHS: reminders.filter(r => r.payment_type === 'RGHS').length,
    ECHS: reminders.filter(r => r.payment_type === 'ECHS').length,
    Cash: reminders.filter(r => r.payment_type === 'Cash').length,
    Private: reminders.filter(r => r.payment_type === 'Private').length,
  }), [reminders]);

  const stats = useMemo(() => {
    const todayVisits = reminders.filter(r => r.next_visit === today).length;
    const todayFollowup = reminders.filter(r => r.reminder_1_day === today).length;
    const yesterdayMissed = reminders.filter(r => r.next_visit === yesterday).length;
    const facilities = new Set(reminders.map(r => r.facility).filter(Boolean)).size;
    return { total: reminders.length, todayVisits, todayFollowup, yesterdayMissed, facilities };
  }, [reminders, today, yesterday]);

  const yesterdayMissedList = useMemo(() => reminders.filter(r => r.next_visit === yesterday), [reminders, yesterday]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    addReminder(formData);
    const webhookNewUrl = profile?.webhook_opd_new_url;
    if (webhookNewUrl) {
      try {
        await fetch(webhookNewUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } catch (err) {
        console.error('Webhook failed:', err);
      }
    }
    setFormData({ name: '', mobile: '', city: '', next_visit: '', remark: '', facility: '', reminder_1_day: '', time: '', payment_type: '' });
    setShowForm(false);
  };

  const openEditSheet = (r: OpdReminderType) => {
    setEditReminder(r);
    setEditForm({ name: r.name, mobile: r.mobile, city: r.city, facility: r.facility, next_visit: r.next_visit, reminder_1_day: r.reminder_1_day, remark: r.remark || '', payment_type: r.payment_type });
  };

  const [updating, setUpdating] = useState(false);
  const [savedReminder, setSavedReminder] = useState<OpdReminderType | null>(null);
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editReminder) return;
    setUpdating(true);
    try {
      const payload = { ...editForm, id: editReminder.id };
      const webhookUpdateUrl = profile?.webhook_opd_update_url;
      if (webhookUpdateUrl) {
        const res = await fetch(webhookUpdateUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Webhook failed');
      }
      updateReminder(editReminder.id, editForm);
      const updated = { ...editReminder, ...editForm };
      setSavedReminder(updated);
      setEditReminder(null);
      toast({ title: 'Success', description: 'OPD Reminder updated & synced!' });
    } catch (err) {
      console.error('[OPD] Webhook error:', err);
      updateReminder(editReminder.id, editForm);
      const updated = { ...editReminder, ...editForm };
      setSavedReminder(updated);
      setEditReminder(null);
      toast({ title: 'Warning', description: 'Updated locally but webhook sync failed.', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const exportCSV = () => {
    if (!filteredReminders.length) return;
    const headers = ['Name', 'Mobile', 'City', 'Facility', 'Next Visit', 'Reminder 1 Day', 'Time', 'Payment Type'];
    const rows = filteredReminders.map(r => [r.name, r.mobile, r.city, r.facility, r.next_visit, r.reminder_1_day, r.time, r.payment_type]);
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
          <Button variant="secondary" size="sm" className="gap-2" onClick={() => { setShowSearch(!showSearch); if (showSearch) { setSearchMobile(''); setSearchResults([]); setSearchDone(false); } }}>
            {showSearch ? <X className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
            {showSearch ? 'Close Search' : 'Search Patient'}
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showForm ? 'Close Form' : 'Add Reminder'}
          </Button>
        </div>
      </motion.div>

      {/* Search Patient Panel */}
      {showSearch && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 ring-2 ring-secondary/30 shadow-lg">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" /> Search Existing Patient (Mobile Number)
          </h3>
          <div className="flex gap-2 items-center">
            <Input
              value={searchMobile}
              onChange={e => { setSearchMobile(e.target.value); setSearchDone(false); }}
              placeholder="Mobile number डालें..."
              className="h-9 text-sm max-w-xs"
              onKeyDown={e => e.key === 'Enter' && handlePatientSearch()}
            />
            <Button size="sm" className="h-9 gap-1" onClick={handlePatientSearch}>
              <Search className="h-3.5 w-3.5" /> Search
            </Button>
          </div>
          {searchDone && (
            <div className="mt-4">
              {searchResults.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">कोई Patient नहीं मिला इस mobile number से।</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{searchResults.length} Patient(s) मिले:</p>
                  {searchResults.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-border/50 hover:bg-primary/10 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                          {r.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                          <p className="text-xs text-muted-foreground">
                            📞 {r.mobile} • 🏙 {r.city || 'N/A'} • 🏥 {r.facility || 'N/A'} • 💳 {r.payment_type || 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Next Visit: {r.next_visit || '-'} • Reminder: {r.reminder_1_day || '-'}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" className="h-7 px-3 text-xs gap-1 flex-shrink-0" onClick={() => handleSearchSelect(r)}>
                        <Pencil className="h-3 w-3" /> Update
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Add Reminder Form - appears at top */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 ring-2 ring-primary/30 shadow-lg">
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
              <Label className="text-xs">Next Visit *</Label>
              <Input type="date" value={formData.next_visit} onChange={e => setFormData(p => ({ ...p, next_visit: e.target.value }))} required className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Type</Label>
              <select value={formData.payment_type} onChange={e => setFormData(p => ({ ...p, payment_type: e.target.value }))} className="h-9 text-sm w-full rounded-md border border-input bg-background px-3">
                <option value="">Select</option>
                <option value="RGHS">RGHS</option>
                <option value="ECHS">ECHS</option>
                <option value="Cash">Cash</option>
                <option value="Private">Private</option>
              </select>
            </div>
            <div className="md:col-span-2 lg:col-span-3 space-y-1.5">
              <Label className="text-xs">Remark (Patient ने क्या बोला)</Label>
              <Textarea value={formData.remark} onChange={e => setFormData(p => ({ ...p, remark: e.target.value }))} placeholder="Patient की बात लिखें..." className="text-sm min-h-[60px]" />
            </div>
            <div className="flex items-end">
              <Button type="submit" size="sm" className="w-full gap-2 h-9">
                <Plus className="h-3.5 w-3.5" /> Save Reminder
              </Button>
            </div>
          </form>
        </motion.div>
      )}

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
          <StatCard title="Yesterday Missed" value={stats.yesterdayMissed} icon={Clock} variant={activeFilter === 'yesterdayMissed' ? 'red' : 'red'}
            onClick={() => setActiveFilter(activeFilter === 'yesterdayMissed' ? null : 'yesterdayMissed')} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <StatCard title="Facilities" value={stats.facilities} icon={Building2} variant="purple" />
        </motion.div>
      </div>

      {/* Payment Type Breakdown */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" /> Payment Type Breakdown
          {paymentFilter && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs ml-auto" onClick={() => setPaymentFilter(null)}>Clear Filter</Button>
          )}
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {([
            { label: 'RGHS', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30', count: paymentStats.RGHS },
            { label: 'ECHS', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', count: paymentStats.ECHS },
            { label: 'Cash', color: 'bg-amber-500/15 text-amber-600 border-amber-500/30', count: paymentStats.Cash },
            { label: 'Private', color: 'bg-purple-500/15 text-purple-600 border-purple-500/30', count: paymentStats.Private },
          ] as const).map(item => (
            <div
              key={item.label}
              onClick={() => setPaymentFilter(paymentFilter === item.label ? null : item.label)}
              className={cn(
                "p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02]",
                item.color,
                paymentFilter === item.label ? "ring-2 ring-primary shadow-md" : "border-border/50"
              )}
            >
              <p className="text-xs font-medium opacity-80">{item.label}</p>
              <p className="text-2xl font-bold mt-1">{item.count}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Today's Appointments Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-primary" /> Today's Appointments
          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">{todayAppointments.length}</span>
        </h3>
        <div className="space-y-3 max-h-[350px] overflow-y-auto">
          {todayAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No appointments scheduled for today.</p>
          ) : todayAppointments.map(r => (
            <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border-l-2 border-l-primary hover:bg-primary/10 transition-colors">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                  {r.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.facility || 'No facility'} • {r.city || 'N/A'} • {r.time || 'No time'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <OpdActionButtons reminder={r} hospitalName={hospitalName} />
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => openEditSheet(r)}>
                  <Pencil className="h-3 w-3" /> Update
                </Button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Yesterday Missed Appointments */}
      {activeFilter === 'yesterdayMissed' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 ring-2 ring-destructive/30">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-destructive" /> Yesterday Missed Appointments
            <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">{yesterdayMissedList.length}</span>
          </h3>
          <div className="space-y-3 max-h-[350px] overflow-y-auto">
            {yesterdayMissedList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">कल कोई missed appointment नहीं है।</p>
            ) : yesterdayMissedList.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border-l-2 border-l-destructive hover:bg-destructive/10 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center text-xs font-bold text-destructive flex-shrink-0">
                    {r.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground">📞 {r.mobile} • 🏙 {r.city || 'N/A'} • 💳 {r.payment_type || 'N/A'}</p>
                    <p className="text-xs text-destructive/80">Appointment थी: {r.next_visit} — नहीं आए</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <OpdActionButtons reminder={r} hospitalName={hospitalName} />
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => openEditSheet(r)}>
                    <Pencil className="h-3 w-3" /> Update
                  </Button>
                </div>
              </div>
            ))}
          </div>
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
        {(dateFrom || dateTo || activeFilter || paymentFilter) && (
          <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { setDateFrom(undefined); setDateTo(undefined); setActiveFilter(null); setPaymentFilter(null); }}>Clear All</Button>
        )}
        <Button variant="outline" size="sm" onClick={exportCSV} className="h-9 text-xs gap-1 ml-auto">
          <Download className="h-3 w-3" /> Download CSV
        </Button>
      </div>

      {/* Data List */}
      <div className="glass-card overflow-hidden">
        <div className="hidden md:grid grid-cols-8 gap-2 px-4 py-3 text-xs font-semibold text-muted-foreground bg-muted/30 border-b border-border/50">
          <span>Name</span>
          <span>Mobile</span>
          <span>City</span>
          <span>Facility</span>
          <span>Next Visit</span>
          <span>Reminder</span>
          <span>Time</span>
          <span>Actions</span>
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
                  "grid grid-cols-1 md:grid-cols-8 gap-1 md:gap-2 px-4 py-3 text-sm hover:bg-muted/30 transition-colors items-center",
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
                <div className="flex items-center gap-1">
                  <OpdActionButtons reminder={r} hospitalName={hospitalName} />
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => openEditSheet(r)}>
                    <Pencil className="h-3 w-3" /> Update
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="text-xs text-muted-foreground text-center">
        Showing {filteredReminders.length} of {reminders.length} reminders
      </div>

      {/* Post-Update Success Sheet */}
      <Sheet open={!!savedReminder} onOpenChange={(open) => !open && setSavedReminder(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" /> Updated Successfully
            </SheetTitle>
          </SheetHeader>
          {savedReminder && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/30">
                <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0" />
                <p className="text-sm font-medium text-foreground">Patient details updated!</p>
              </div>

              <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-2">
                <p className="text-base font-semibold text-foreground">{savedReminder.name}</p>
                <p className="text-sm text-muted-foreground">📞 {savedReminder.mobile}</p>
                {savedReminder.city && <p className="text-sm text-muted-foreground">🏙 {savedReminder.city}</p>}
                {savedReminder.facility && <p className="text-sm text-muted-foreground">🏥 {savedReminder.facility}</p>}
                {savedReminder.next_visit && (
                  <p className="text-sm text-muted-foreground">
                    📅 Next Visit: {(() => { try { return new Date(savedReminder.next_visit).toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return savedReminder.next_visit; } })()}
                    {savedReminder.time ? ` | ⏰ ${savedReminder.time}` : ''}
                  </p>
                )}
                {savedReminder.reminder_1_day && (
                  <p className="text-sm text-muted-foreground">
                    🔔 Followup: {(() => { try { return new Date(savedReminder.reminder_1_day).toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return savedReminder.reminder_1_day; } })()}
                  </p>
                )}
                {savedReminder.payment_type && <p className="text-sm text-muted-foreground">💳 {savedReminder.payment_type}</p>}
                {savedReminder.remark && <p className="text-sm text-muted-foreground">📝 {savedReminder.remark}</p>}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => window.open(getOpdWhatsAppUrl(savedReminder, hospitalName), '_blank')}
                  className="flex-1 gap-2 bg-[hsl(142,70%,35%)] hover:bg-[hsl(142,70%,30%)] text-white"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp भेजें
                </Button>
                <Button variant="outline" onClick={() => { const phone = savedReminder.mobile?.replace(/\D/g, '') || ''; window.open(`tel:${phone}`, '_self'); }} className="gap-2">
                  <Phone className="h-4 w-4" /> Call
                </Button>
              </div>

              <Button variant="outline" onClick={() => setSavedReminder(null)} className="w-full">
                Close
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Update Sheet */}
      <Sheet open={!!editReminder} onOpenChange={(open) => !open && setEditReminder(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-foreground">Update OPD Reminder</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleUpdate} className="space-y-4 mt-6">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mobile</Label>
              <Input value={editForm.mobile} onChange={e => setEditForm(p => ({ ...p, mobile: e.target.value }))} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">City</Label>
              <Input value={editForm.city} onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Facility</Label>
              <Input value={editForm.facility} onChange={e => setEditForm(p => ({ ...p, facility: e.target.value }))} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Next Visit</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full h-9 text-sm justify-start text-left font-normal", !editForm.next_visit && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {editForm.next_visit || 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editForm.next_visit ? new Date(editForm.next_visit) : undefined}
                    onSelect={(date) => setEditForm(p => ({ ...p, next_visit: date ? format(date, 'yyyy-MM-dd') : '' }))}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reminder 1 Day</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full h-9 text-sm justify-start text-left font-normal", !editForm.reminder_1_day && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {editForm.reminder_1_day || 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editForm.reminder_1_day ? new Date(editForm.reminder_1_day) : undefined}
                    onSelect={(date) => setEditForm(p => ({ ...p, reminder_1_day: date ? format(date, 'yyyy-MM-dd') : '' }))}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Remark (Patient ने क्या बोला)</Label>
              <Textarea value={editForm.remark} onChange={e => setEditForm(p => ({ ...p, remark: e.target.value }))} placeholder="Patient की बात लिखें..." className="text-sm min-h-[60px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Type</Label>
              <select value={editForm.payment_type} onChange={e => setEditForm(p => ({ ...p, payment_type: e.target.value }))} className="h-9 text-sm w-full rounded-md border border-input bg-background px-3">
                <option value="">Select</option>
                <option value="RGHS">RGHS</option>
                <option value="ECHS">ECHS</option>
                <option value="Cash">Cash</option>
                <option value="Private">Private</option>
              </select>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={updating}>
              <Pencil className="h-3.5 w-3.5" /> {updating ? 'Updating...' : 'Update Reminder'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
