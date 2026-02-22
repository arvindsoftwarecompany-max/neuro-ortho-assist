import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeadsData } from '@/hooks/useLeadsData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = ['Basic Info', 'Address', 'Medical Info', 'Appointment', 'Additional'];

export default function AddLead() {
  const navigate = useNavigate();
  const { addLead } = useLeadsData();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    patient_name: '', mobile: '', email: '', age: '', gender: 'Male',
    blood_group: '', address: '', city: '', state: '', pincode: '',
    department: 'Orthopedics', sub_specialty: '', problem_description: '',
    severity: 'Medium', call_status: 'New Lead', appointment_date: '',
    appointment_time: '', doctor_assigned: '', followup_date: '',
    source: 'Phone', priority: 'Normal', employee_name: '', remarks: '',
  });

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.patient_name || !form.mobile) {
      toast({ title: 'Error', description: 'Patient name and mobile are required', variant: 'destructive' });
      return;
    }

    const leadData = {
      ...form,
      age: parseInt(form.age) || 0,
      date_created: new Date().toISOString().split('T')[0],
      last_contact_date: new Date().toISOString().split('T')[0],
    };

    setSubmitting(true);
    try {
      const res = await fetch('https://n8n.srv1237080.hstgr.cloud/webhook/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData),
      });

      if (!res.ok) throw new Error('Webhook failed');

      addLead({ ...leadData, lead_id: 0 } as any);
      toast({ title: 'Success', description: 'Lead added successfully!' });
      navigate('/leads');
    } catch (err) {
      console.error('[CRM] Webhook error:', err);
      toast({ title: 'Warning', description: 'Lead saved locally but webhook failed.', variant: 'destructive' });
      addLead({ ...leadData, lead_id: 0 } as any);
      navigate('/leads');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pt-12 lg:pt-0 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold text-foreground">Add New Lead</h1>
        <p className="text-sm text-muted-foreground mt-1">Fill in the patient information</p>
      </motion.div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => setStep(i)}
              className={cn(
                "w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-all",
                i === step ? "bg-primary text-primary-foreground glow-blue" :
                i < step ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
              )}
            >{i + 1}</button>
            {i < STEPS.length - 1 && <div className={cn("flex-1 h-0.5 rounded", i < step ? "bg-success/50" : "bg-muted")} />}
          </div>
        ))}
      </div>
      <p className="text-sm font-medium text-foreground">{STEPS[step]}</p>

      {/* Form Steps */}
      <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6 space-y-4">
        {step === 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Patient Name *</Label><Input value={form.patient_name} onChange={e => set('patient_name', e.target.value)} placeholder="Full name" className="mt-1 bg-muted/50" /></div>
              <div><Label>Mobile *</Label><Input value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="10-digit mobile" className="mt-1 bg-muted/50" /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" className="mt-1 bg-muted/50" /></div>
              <div><Label>Age</Label><Input type="number" value={form.age} onChange={e => set('age', e.target.value)} placeholder="Age" className="mt-1 bg-muted/50" /></div>
              <div><Label>Gender</Label>
                <Select value={form.gender} onValueChange={v => set('gender', v)}>
                  <SelectTrigger className="mt-1 bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Blood Group</Label>
                <Select value={form.blood_group} onValueChange={v => set('blood_group', v)}>
                  <SelectTrigger className="mt-1 bg-muted/50"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><Label>Address</Label><Textarea value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full address" className="mt-1 bg-muted/50" /></div>
            <div><Label>City *</Label><Input value={form.city} onChange={e => set('city', e.target.value)} className="mt-1 bg-muted/50" /></div>
            <div><Label>State *</Label><Input value={form.state} onChange={e => set('state', e.target.value)} className="mt-1 bg-muted/50" /></div>
            <div><Label>Pincode</Label><Input value={form.pincode} onChange={e => set('pincode', e.target.value)} className="mt-1 bg-muted/50" /></div>
          </div>
        )}
        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Department *</Label>
              <Select value={form.department} onValueChange={v => set('department', v)}>
                <SelectTrigger className="mt-1 bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Orthopedics">Orthopedics</SelectItem><SelectItem value="Neurology">Neurology</SelectItem><SelectItem value="Both">Both</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Sub-Specialty</Label><Input value={form.sub_specialty} onChange={e => set('sub_specialty', e.target.value)} placeholder="e.g. Spine, Joint Replacement" className="mt-1 bg-muted/50" /></div>
            <div className="md:col-span-2"><Label>Problem Description *</Label><Textarea value={form.problem_description} onChange={e => set('problem_description', e.target.value)} placeholder="Describe the patient's condition..." className="mt-1 bg-muted/50" rows={3} /></div>
            <div><Label>Severity</Label>
              <Select value={form.severity} onValueChange={v => set('severity', v)}>
                <SelectTrigger className="mt-1 bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>{['Low','Medium','High','Critical'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Call Status</Label>
              <Select value={form.call_status} onValueChange={v => set('call_status', v)}>
                <SelectTrigger className="mt-1 bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>{['New Lead','Contacted','Appointment Booked','Followup','Not Interested','Converted','Lost'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Doctor Assigned</Label><Input value={form.doctor_assigned} onChange={e => set('doctor_assigned', e.target.value)} className="mt-1 bg-muted/50" /></div>
            <div><Label>Appointment Date</Label><Input type="date" value={form.appointment_date} onChange={e => set('appointment_date', e.target.value)} className="mt-1 bg-muted/50" /></div>
            <div><Label>Appointment Time</Label><Input type="time" value={form.appointment_time} onChange={e => set('appointment_time', e.target.value)} className="mt-1 bg-muted/50" /></div>
            <div><Label>Followup Date</Label><Input type="date" value={form.followup_date} onChange={e => set('followup_date', e.target.value)} className="mt-1 bg-muted/50" /></div>
          </div>
        )}
        {step === 4 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Source</Label>
              <Select value={form.source} onValueChange={v => set('source', v)}>
                <SelectTrigger className="mt-1 bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>{['Walk-in','Phone','Website','Referral','Social Media'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => set('priority', v)}>
                <SelectTrigger className="mt-1 bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>{['Normal','High','Urgent'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Employee Name</Label><Input value={form.employee_name} onChange={e => set('employee_name', e.target.value)} className="mt-1 bg-muted/50" /></div>
            <div className="md:col-span-2"><Label>Remarks</Label><Textarea value={form.remarks} onChange={e => set('remarks', e.target.value)} className="mt-1 bg-muted/50" rows={3} /></div>
          </div>
        )}
      </motion.div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/')} className="gap-2">
          <ChevronLeft className="h-4 w-4" /> {step > 0 ? 'Previous' : 'Cancel'}
        </Button>
        <div className="flex gap-2">
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(s => s + 1)} className="gap-2">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2 bg-success hover:bg-success/90">
              <Save className="h-4 w-4" /> {submitting ? 'Saving...' : 'Save Lead'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
