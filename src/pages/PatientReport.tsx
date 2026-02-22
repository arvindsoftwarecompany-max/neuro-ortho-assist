import { useParams, useNavigate } from 'react-router-dom';
import { useLeadsData } from '@/hooks/useLeadsData';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { ArrowLeft, Phone, Mail, MapPin, User, Activity, Calendar, Clock, FileText, Download, Stethoscope } from 'lucide-react';
import { useState } from 'react';
import { CallStatus } from '@/types/leads';
import { cn } from '@/lib/utils';

export default function PatientReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { leads, updateLead } = useLeadsData();
  const lead = leads.find(l => l.lead_id === Number(id));
  const [newRemark, setNewRemark] = useState('');
  const [apptDate, setApptDate] = useState('');
  const [apptTime, setApptTime] = useState('');
  const [followDate, setFollowDate] = useState('');
  const [followType, setFollowType] = useState('Call');

  if (!lead) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-center">
        <div>
          <p className="text-lg text-muted-foreground">Patient not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/leads')}>Back to Leads</Button>
        </div>
      </div>
    );
  }

  const handleStatusUpdate = (status: string) => {
    updateLead(lead.lead_id, { call_status: status as CallStatus });
    toast({ title: 'Status Updated', description: `Lead marked as ${status}` });
  };

  const handleAddRemark = () => {
    if (!newRemark.trim()) return;
    const existing = lead.remarks ? lead.remarks + '\n' : '';
    updateLead(lead.lead_id, { remarks: existing + `[${new Date().toLocaleDateString()}] ${newRemark}` });
    setNewRemark('');
    toast({ title: 'Remark Added' });
  };

  const handleBookAppointment = () => {
    if (!apptDate) { toast({ title: 'Error', description: 'Select a date', variant: 'destructive' }); return; }
    updateLead(lead.lead_id, { appointment_date: apptDate, appointment_time: apptTime, call_status: 'Appointment Booked' });
    setApptDate(''); setApptTime('');
    toast({ title: 'Appointment Booked!' });
  };

  const handleAddFollowup = () => {
    if (!followDate) { toast({ title: 'Error', description: 'Select a date', variant: 'destructive' }); return; }
    updateLead(lead.lead_id, { followup_date: followDate, call_status: 'Followup' });
    setFollowDate('');
    toast({ title: 'Follow-up Scheduled!' });
  };

  const exportPDF = () => {
    const content = `ORTHO NEURO HOSPITAL - Patient Report\n${'='.repeat(50)}\n\nPatient: ${lead.patient_name}\nLead ID: ${lead.lead_id}\nMobile: ${lead.mobile}\nAge/Gender: ${lead.age}/${lead.gender}\nDepartment: ${lead.department}\nProblem: ${lead.problem_description}\nStatus: ${lead.call_status}\nDoctor: ${lead.doctor_assigned}\nRemarks: ${lead.remarks}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `patient_${lead.lead_id}.txt`; a.click();
  };

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary glow-blue">
                {lead.patient_name.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{lead.patient_name}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground font-mono-med">ID: {lead.lead_id}</span>
                  <StatusBadge status={lead.call_status} />
                </div>
              </div>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={exportPDF} className="gap-2"><Download className="h-3.5 w-3.5" /> Export</Button>
      </motion.div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Info */}
            <div className="glass-card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Basic Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Age / Gender</span><span className="text-foreground">{lead.age} / {lead.gender}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Blood Group</span><span className="text-foreground">{lead.blood_group || '-'}</span></div>
                <div className="flex justify-between items-center"><span className="text-muted-foreground">Mobile</span>
                  <a href={`tel:${lead.mobile}`} className="text-primary hover:underline flex items-center gap-1"><Phone className="h-3 w-3" />{lead.mobile}</a>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="text-foreground">{lead.email || '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span className="text-foreground text-right max-w-[200px]">{lead.city}{lead.state ? `, ${lead.state}` : ''} {lead.pincode}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Source</span><span className="text-foreground">{lead.source}</span></div>
              </div>
            </div>

            {/* Medical Info */}
            <div className="glass-card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Stethoscope className="h-4 w-4 text-accent" /> Medical Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Department</span>
                  <span className={cn("font-medium", lead.department === 'Orthopedics' ? 'text-accent' : 'text-secondary')}>{lead.department}</span>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Sub-Specialty</span><span className="text-foreground">{lead.sub_specialty || '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Severity</span>
                  <span className={cn("status-badge", lead.severity === 'Critical' ? 'bg-destructive/20 text-destructive' : lead.severity === 'High' ? 'bg-warning/20 text-warning' : 'bg-muted text-muted-foreground')}>{lead.severity}</span>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Priority</span><span className="text-foreground">{lead.priority}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Doctor</span><span className="text-foreground">{lead.doctor_assigned || 'Unassigned'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Employee</span><span className="text-foreground">{lead.employee_name || '-'}</span></div>
              </div>
            </div>

            {/* Problem */}
            <div className="glass-card p-5 md:col-span-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2"><FileText className="h-4 w-4 text-warning" /> Problem Description</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{lead.problem_description || 'No description provided'}</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="appointments" className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Calendar className="h-4 w-4 text-success" /> Book Appointment</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input type="date" value={apptDate} onChange={e => setApptDate(e.target.value)} className="bg-muted/50" />
              <Input type="time" value={apptTime} onChange={e => setApptTime(e.target.value)} className="bg-muted/50" />
              <Button onClick={handleBookAppointment} className="bg-success hover:bg-success/90">Book Appointment</Button>
            </div>
          </div>
          {lead.appointment_date && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Current Appointment</h3>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">Date:</span><span className="text-foreground font-medium">{lead.appointment_date}</span>
                <span className="text-muted-foreground">Time:</span><span className="text-foreground font-medium">{lead.appointment_time || 'TBD'}</span>
                <span className="text-muted-foreground">Doctor:</span><span className="text-foreground font-medium">{lead.doctor_assigned || 'TBD'}</span>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="followups" className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Clock className="h-4 w-4 text-warning" /> Schedule Follow-up</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input type="date" value={followDate} onChange={e => setFollowDate(e.target.value)} className="bg-muted/50" />
              <Select value={followType} onValueChange={setFollowType}>
                <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>{['Call','WhatsApp','SMS','Email'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={handleAddFollowup} className="bg-primary">Schedule Follow-up</Button>
            </div>
          </div>
          {lead.followup_date && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Next Follow-up</h3>
              <p className="text-sm text-foreground">{lead.followup_date}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Add Remark</h3>
            <Textarea value={newRemark} onChange={e => setNewRemark(e.target.value)} placeholder="Add a note..." className="bg-muted/50 mb-3" rows={3} />
            <Button onClick={handleAddRemark} size="sm">Save Remark</Button>
          </div>
          {lead.remarks && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Remarks History</h3>
              <div className="space-y-2">
                {lead.remarks.split('\n').map((r, i) => (
                  <p key={i} className="text-sm text-muted-foreground p-2 rounded bg-muted/30">{r}</p>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Bottom Actions */}
      <div className="glass-card p-4 flex flex-wrap gap-2 justify-center">
        <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => handleStatusUpdate('Appointment Booked')}>
          <Calendar className="h-3.5 w-3.5 mr-1" /> Book Appointment
        </Button>
        <Button size="sm" className="bg-primary" onClick={() => handleStatusUpdate('Followup')}>
          <Clock className="h-3.5 w-3.5 mr-1" /> Add Followup
        </Button>
        <Button size="sm" variant="outline" onClick={() => handleStatusUpdate('Contacted')}>
          <Phone className="h-3.5 w-3.5 mr-1" /> Mark Contacted
        </Button>
        <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => handleStatusUpdate('Converted')}>
          Mark Converted
        </Button>
        <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate('Not Interested')}>
          Not Interested
        </Button>
      </div>
    </div>
  );
}
