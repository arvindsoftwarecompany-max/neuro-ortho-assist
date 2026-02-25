import { useState, useMemo } from 'react';
import { useIpdData, calculateFollowUpDates } from '@/hooks/useIpdData';
import { IpdPatient, FollowUp, CallStatus } from '@/types/ipd';
import { format, parseISO, isToday, isBefore, startOfDay, differenceInDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Phone, Plus, Search, CheckCircle, Clock, AlertTriangle, Users,
  PhoneCall, FileText, CalendarDays, Download, Trash2, Eye, Edit, X,
  PhoneOff, RotateCcw, Building
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_COLORS: Record<CallStatus, string> = {
  pending: 'bg-warning/20 text-[hsl(var(--warning))]',
  completed: 'bg-success/20 text-[hsl(var(--success))]',
  not_reachable: 'bg-destructive/20 text-destructive',
  wrong_number: 'bg-muted text-muted-foreground',
  readmitted: 'bg-secondary/20 text-secondary',
  rescheduled: 'bg-primary/20 text-primary',
};

const STATUS_LABELS: Record<CallStatus, string> = {
  pending: 'Pending',
  completed: 'Completed',
  not_reachable: 'Not Reachable',
  wrong_number: 'Wrong Number',
  readmitted: 'Readmitted',
  rescheduled: 'Rescheduled',
};

const DEPARTMENTS = ['Orthopedics', 'Neurology', 'General Surgery', 'Medicine', 'Cardiology', 'Other'];
const DOCTORS = ['Dr. Sharma', 'Dr. Gupta', 'Dr. Patel', 'Dr. Singh', 'Dr. Verma', 'Other'];

export default function IpdFollowup() {
  const { patients, addPatient, markFollowUpDone, rescheduleFollowUp, deletePatient, updatePatient } = useIpdData();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterFollowUpType, setFilterFollowUpType] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<IpdPatient | null>(null);
  const [callDialog, setCallDialog] = useState<{ patient: IpdPatient; followUp: FollowUp } | null>(null);
  const [callNotes, setCallNotes] = useState('');
  const [callStatus, setCallStatus] = useState<CallStatus>('completed');
  const [rescheduleDate, setRescheduleDate] = useState('');

  // Form state
  const [form, setForm] = useState({
    name: '', mobile: '', ipdNumber: '', admissionDate: '', dischargeDate: '',
    diagnosis: '', doctor: '', department: '', followUpNotes: '',
  });

  const today = startOfDay(new Date());
  const todayStr = format(today, 'yyyy-MM-dd');

  // Computed metrics
  const metrics = useMemo(() => {
    let dueToday = 0, overdue = 0, completedThisWeek = 0, totalActive = 0;
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);

    patients.forEach(p => {
      if (p.status === 'active') totalActive++;
      p.followUps.forEach(f => {
        if (f.status === 'pending' || f.status === 'rescheduled') {
          const d = parseISO(f.scheduledDate);
          if (isToday(d)) dueToday++;
          else if (isBefore(d, today)) overdue++;
        }
        if (f.status === 'completed' && f.completedDate) {
          const cd = parseISO(f.completedDate);
          if (cd >= weekAgo) completedThisWeek++;
        }
      });
    });
    return { dueToday, overdue, completedThisWeek, totalActive };
  }, [patients, today]);

  // Today's calls: due today or overdue
  const todaysCalls = useMemo(() => {
    const calls: { patient: IpdPatient; followUp: FollowUp; priority: number }[] = [];
    patients.forEach(p => {
      if (p.status !== 'active') return;
      p.followUps.forEach(f => {
        if (f.status !== 'pending' && f.status !== 'rescheduled') return;
        const d = parseISO(f.scheduledDate);
        if (isBefore(d, today)) {
          calls.push({ patient: p, followUp: f, priority: 0 });
        } else if (isToday(d)) {
          calls.push({ patient: p, followUp: f, priority: 1 });
        }
      });
    });
    return calls.sort((a, b) => a.priority - b.priority);
  }, [patients, today]);

  // Filtered patients for list view
  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const q = search.toLowerCase().trim();
      if (q && !(
        p.name.toLowerCase().includes(q) ||
        p.mobile.includes(q) ||
        p.ipdNumber.toLowerCase().includes(q) ||
        p.doctor.toLowerCase().includes(q) ||
        p.diagnosis.toLowerCase().includes(q)
      )) return false;
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (filterDept !== 'all' && p.department !== filterDept) return false;
      if (filterFollowUpType !== 'all') {
        const hasType = p.followUps.some(f => f.type === filterFollowUpType && (f.status === 'pending' || f.status === 'rescheduled'));
        if (!hasType) return false;
      }
      return true;
    });
  }, [patients, search, filterStatus, filterDept, filterFollowUpType]);

  const handleAddPatient = () => {
    if (!form.name || !form.mobile || !form.dischargeDate || !form.ipdNumber) {
      toast.error('Name, Mobile, IPD Number और Discharge Date भरें');
      return;
    }
    if (!/^\d{10}$/.test(form.mobile)) {
      toast.error('Valid 10-digit mobile number डालें');
      return;
    }
    // Duplicate check
    const dup = patients.find(p => p.mobile === form.mobile || p.ipdNumber === form.ipdNumber);
    if (dup) {
      toast.error(`Duplicate: Patient already exists (${dup.name})`);
      return;
    }
    addPatient(form);
    toast.success('Patient added successfully!');
    setForm({ name: '', mobile: '', ipdNumber: '', admissionDate: '', dischargeDate: '', diagnosis: '', doctor: '', department: '', followUpNotes: '' });
    setShowAddForm(false);
  };

  const handleCallAction = () => {
    if (!callDialog) return;
    if (callStatus === 'rescheduled' && rescheduleDate) {
      rescheduleFollowUp(callDialog.patient.id, callDialog.followUp.id, rescheduleDate);
      toast.success('Follow-up rescheduled');
    } else {
      markFollowUpDone(callDialog.patient.id, callDialog.followUp.id, callNotes, callStatus);
      toast.success(`Call marked as ${STATUS_LABELS[callStatus]}`);
    }
    setCallDialog(null);
    setCallNotes('');
    setCallStatus('completed');
    setRescheduleDate('');
  };

  const exportToCSV = () => {
    const rows = [['Name', 'Mobile', 'IPD No', 'Admission', 'Discharge', 'Diagnosis', 'Doctor', 'Department', 'Status', '1st FU', '2nd FU', '3rd FU']];
    filteredPatients.forEach(p => {
      const fu = (type: string) => {
        const f = p.followUps.find(x => x.type === type);
        return f ? `${f.scheduledDate} (${f.status})` : '';
      };
      rows.push([p.name, p.mobile, p.ipdNumber, p.admissionDate, p.dischargeDate, p.diagnosis, p.doctor, p.department, p.status, fu('1st'), fu('2nd'), fu('3rd')]);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ipd-followup-${todayStr}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const getNextFollowUp = (p: IpdPatient): FollowUp | undefined => {
    return p.followUps.find(f => f.status === 'pending' || f.status === 'rescheduled');
  };

  const getFollowUpColor = (f: FollowUp) => {
    const d = parseISO(f.scheduledDate);
    if (f.status === 'completed') return 'border-l-[hsl(var(--success))]';
    if (isBefore(d, today)) return 'border-l-destructive';
    if (isToday(d)) return 'border-l-[hsl(var(--warning))]';
    return 'border-l-primary';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold gradient-text flex items-center gap-2">
            <Building className="h-7 w-7 text-primary" />
            IPD Follow-up Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Discharge patient follow-up tracking & call management</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddForm(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Patient
          </Button>
          <Button variant="outline" onClick={exportToCSV} className="gap-2">
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="stat-card-amber cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Calls Due Today</p>
                  <p className="text-2xl font-bold text-[hsl(var(--warning))]">{metrics.dueToday}</p>
                </div>
                <PhoneCall className="h-8 w-8 text-[hsl(var(--warning))]/40" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="stat-card-red cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Overdue Calls</p>
                  <p className="text-2xl font-bold text-destructive">{metrics.overdue}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-destructive/40" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="stat-card-green">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Completed This Week</p>
                  <p className="text-2xl font-bold text-[hsl(var(--success))]">{metrics.completedThisWeek}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-[hsl(var(--success))]/40" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="stat-card-blue">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Active</p>
                  <p className="text-2xl font-bold text-primary">{metrics.totalActive}</p>
                </div>
                <Users className="h-8 w-8 text-primary/40" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="glass-card">
          <TabsTrigger value="dashboard">Today's Calls</TabsTrigger>
          <TabsTrigger value="patients">All Patients</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* TODAY'S CALLS */}
        <TabsContent value="dashboard" className="space-y-4">
          {todaysCalls.length === 0 ? (
            <Card className="glass-card p-8 text-center">
              <CheckCircle className="h-12 w-12 text-[hsl(var(--success))] mx-auto mb-3" />
              <p className="text-lg font-medium">All caught up! No pending calls for today.</p>
              <p className="text-sm text-muted-foreground mt-1">Check All Patients tab for upcoming follow-ups.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {todaysCalls.map(({ patient: p, followUp: f }) => {
                const daysOverdue = differenceInDays(today, parseISO(f.scheduledDate));
                const isOverdue = daysOverdue > 0;
                return (
                  <motion.div key={`${p.id}-${f.id}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <Card className={`glass-card border-l-4 ${isOverdue ? 'border-l-destructive' : 'border-l-[hsl(var(--warning))]'}`}>
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground">{p.name}</span>
                              <Badge variant="outline" className="text-xs">{f.type} Follow-up</Badge>
                              {isOverdue && (
                                <Badge className="bg-destructive/20 text-destructive text-xs">{daysOverdue} days overdue</Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span>📱 {p.mobile}</span>
                              <span>🏥 IPD: {p.ipdNumber}</span>
                              <span>🩺 {p.diagnosis}</span>
                              <span>👨‍⚕️ {p.doctor}</span>
                              <span>📅 Discharged: {differenceInDays(today, parseISO(p.dischargeDate))} days ago</span>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button size="sm" variant="outline" onClick={() => window.open(`tel:${p.mobile}`)}>
                              <Phone className="h-4 w-4 mr-1" /> Call
                            </Button>
                            <Button size="sm" onClick={() => { setCallDialog({ patient: p, followUp: f }); setCallNotes(''); setCallStatus('completed'); }}>
                              <CheckCircle className="h-4 w-4 mr-1" /> Mark Done
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setSelectedPatient(p)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ALL PATIENTS */}
        <TabsContent value="patients" className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search name, mobile, IPD no, diagnosis..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="readmitted">Readmitted</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dept</SelectItem>
                {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterFollowUpType} onValueChange={setFilterFollowUpType}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Follow-up" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Follow-ups</SelectItem>
                <SelectItem value="1st">1st Follow-up</SelectItem>
                <SelectItem value="2nd">2nd Follow-up</SelectItem>
                <SelectItem value="3rd">3rd Follow-up</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>IPD No</TableHead>
                    <TableHead>Discharge</TableHead>
                    <TableHead>Next Follow-up</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {patients.length === 0 ? 'No patients added yet. Click "Add Patient" to start.' : 'No results found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPatients.map(p => {
                      const nextFU = getNextFollowUp(p);
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{p.name}</p>
                              <p className="text-xs text-muted-foreground">{p.doctor} · {p.department}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <a href={`tel:${p.mobile}`} className="text-primary hover:underline">{p.mobile}</a>
                          </TableCell>
                          <TableCell className="font-mono-med text-xs">{p.ipdNumber}</TableCell>
                          <TableCell className="text-sm">{p.dischargeDate}</TableCell>
                          <TableCell>
                            {nextFU ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm">{nextFU.scheduledDate}</span>
                                <Badge variant="outline" className="text-[10px]">{nextFU.type}</Badge>
                              </div>
                            ) : <span className="text-xs text-muted-foreground">All done</span>}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${p.status === 'active' ? 'bg-success/20 text-[hsl(var(--success))]' : p.status === 'readmitted' ? 'bg-destructive/20 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSelectedPatient(p)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => window.open(`tel:${p.mobile}`)}>
                                <Phone className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { deletePatient(p.id); toast.success('Patient deleted'); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* REPORTS */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Total Patients</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold text-primary">{patients.length}</p></CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Follow-up Completion Rate</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-[hsl(var(--success))]">
                  {patients.length > 0
                    ? Math.round((patients.flatMap(p => p.followUps).filter(f => f.status === 'completed').length / Math.max(patients.flatMap(p => p.followUps).length, 1)) * 100)
                    : 0}%
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Readmission Rate</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-destructive">
                  {patients.length > 0 ? Math.round((patients.filter(p => p.status === 'readmitted').length / patients.length) * 100) : 0}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Dept breakdown */}
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-sm">Department-wise Patients</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {DEPARTMENTS.map(dept => {
                  const count = patients.filter(p => p.department === dept).length;
                  if (count === 0) return null;
                  const pct = Math.round((count / Math.max(patients.length, 1)) * 100);
                  return (
                    <div key={dept} className="flex items-center gap-3">
                      <span className="text-sm w-32 text-muted-foreground">{dept}</span>
                      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ADD PATIENT DIALOG */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Discharged Patient</DialogTitle>
            <DialogDescription>Enter patient details. Follow-up dates will be auto-calculated from discharge date.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Patient Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Patient name" /></div>
              <div><Label>Mobile *</Label><Input value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="10-digit mobile" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>IPD Number *</Label><Input value={form.ipdNumber} onChange={e => setForm(f => ({ ...f, ipdNumber: e.target.value }))} placeholder="IPD/12345" /></div>
              <div>
                <Label>Department</Label>
                <Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Admission Date</Label><Input type="date" value={form.admissionDate} onChange={e => setForm(f => ({ ...f, admissionDate: e.target.value }))} /></div>
              <div><Label>Discharge Date *</Label><Input type="date" value={form.dischargeDate} onChange={e => setForm(f => ({ ...f, dischargeDate: e.target.value }))} /></div>
            </div>
            <div><Label>Diagnosis</Label><Input value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} placeholder="Disease / Diagnosis" /></div>
            <div>
              <Label>Doctor</Label>
              <Select value={form.doctor} onValueChange={v => setForm(f => ({ ...f, doctor: v }))}>
                <SelectTrigger><SelectValue placeholder="Select Doctor" /></SelectTrigger>
                <SelectContent>{DOCTORS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Follow-up Notes</Label><Textarea value={form.followUpNotes} onChange={e => setForm(f => ({ ...f, followUpNotes: e.target.value }))} placeholder="Special instructions..." rows={2} /></div>

            {/* Preview calculated dates */}
            {form.dischargeDate && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground mb-2">Auto-calculated Follow-up Dates:</p>
                {calculateFollowUpDates(form.dischargeDate).map(f => (
                  <div key={f.type} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="text-[10px] w-10 justify-center">{f.type}</Badge>
                    <span>{f.date}</span>
                    <span className="text-xs text-muted-foreground">
                      ({f.type === '1st' ? '10 days' : f.type === '2nd' ? '25 days' : '45 days'} after discharge)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            <Button onClick={handleAddPatient}>Add Patient</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CALL ACTION DIALOG */}
      <Dialog open={!!callDialog} onOpenChange={() => setCallDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Call Status</DialogTitle>
            <DialogDescription>
              {callDialog?.patient.name} — {callDialog?.followUp.type} Follow-up
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Status</Label>
              <Select value={callStatus} onValueChange={v => setCallStatus(v as CallStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">✅ Call Completed</SelectItem>
                  <SelectItem value="not_reachable">📵 Not Reachable</SelectItem>
                  <SelectItem value="wrong_number">❌ Wrong Number</SelectItem>
                  <SelectItem value="readmitted">🏥 Patient Readmitted</SelectItem>
                  <SelectItem value="rescheduled">📅 Reschedule</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {callStatus === 'rescheduled' && (
              <div><Label>New Date</Label><Input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} /></div>
            )}
            <div><Label>Notes</Label><Textarea value={callNotes} onChange={e => setCallNotes(e.target.value)} placeholder="Call remarks..." rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCallDialog(null)}>Cancel</Button>
            <Button onClick={handleCallAction}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PATIENT DETAIL DIALOG */}
      <Dialog open={!!selectedPatient} onOpenChange={() => setSelectedPatient(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPatient?.name}</DialogTitle>
            <DialogDescription>IPD: {selectedPatient?.ipdNumber} · {selectedPatient?.department}</DialogDescription>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Mobile:</span> <a href={`tel:${selectedPatient.mobile}`} className="text-primary">{selectedPatient.mobile}</a></div>
                <div><span className="text-muted-foreground">Doctor:</span> {selectedPatient.doctor}</div>
                <div><span className="text-muted-foreground">Admission:</span> {selectedPatient.admissionDate || 'N/A'}</div>
                <div><span className="text-muted-foreground">Discharge:</span> {selectedPatient.dischargeDate}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Diagnosis:</span> {selectedPatient.diagnosis}</div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Follow-up Timeline</p>
                <div className="space-y-2">
                  {selectedPatient.followUps.map(f => (
                    <div key={f.id} className={`glass-card p-3 border-l-4 ${getFollowUpColor(f)}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{f.type}</Badge>
                          <span className="text-sm">{f.scheduledDate}</span>
                        </div>
                        <Badge className={`text-[10px] ${STATUS_COLORS[f.status]}`}>{STATUS_LABELS[f.status]}</Badge>
                      </div>
                      {f.notes && <p className="text-xs text-muted-foreground mt-1">{f.notes}</p>}
                      {f.completedDate && <p className="text-[10px] text-muted-foreground">Done: {f.completedDate}</p>}
                      {(f.status === 'pending' || f.status === 'rescheduled') && (
                        <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => {
                          setCallDialog({ patient: selectedPatient, followUp: f });
                          setSelectedPatient(null);
                        }}>
                          Update Status
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedPatient.followUpNotes && (
                <div>
                  <p className="text-sm font-medium mb-1">Notes</p>
                  <p className="text-sm text-muted-foreground">{selectedPatient.followUpNotes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
