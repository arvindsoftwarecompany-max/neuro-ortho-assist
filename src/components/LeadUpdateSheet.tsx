import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Lead } from '@/types/leads';
import { Phone, Calendar, Clock, Save, MessageCircle, CheckCircle2 } from 'lucide-react';

interface LeadUpdateSheetProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: number, data: Partial<Lead>) => void;
  hospitalName?: string;
}

function buildWhatsAppMessage(lead: Lead, hospitalName: string): string {
  const lines = [
    `🏥 *${hospitalName}*`,
    '',
    `नमस्ते *${lead.patient_name}* जी,`,
    '',
    `हम ${hospitalName} से बात कर रहे हैं।`,
  ];
  if (lead.department) lines.push(`📋 *विभाग:* ${lead.department}`);
  if (lead.doctor_assigned) lines.push(`👨‍⚕️ *डॉक्टर:* Dr. ${lead.doctor_assigned}`);
  if (lead.appointment_date) {
    const d = new Date(lead.appointment_date);
    const dateStr = d.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    lines.push(`📅 *अगली अपॉइंटमेंट:* ${dateStr}${lead.appointment_time ? ` | ⏰ ${lead.appointment_time}` : ''}`);
  }
  if (lead.followup_date) {
    const d = new Date(lead.followup_date);
    const dateStr = d.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    lines.push(`🔔 *फॉलोअप तारीख:* ${dateStr}`);
  }
  if (lead.problem_description) lines.push(`📝 *समस्या:* ${lead.problem_description}`);
  lines.push('', 'कृपया समय पर पहुँचें। धन्यवाद! 🙏');
  return lines.join('\n');
}

export default function LeadUpdateSheet({ lead, open, onClose, onUpdate, hospitalName = 'Hospital' }: LeadUpdateSheetProps) {
  const [mobile, setMobile] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [followupDate, setFollowupDate] = useState('');
  const [savedLead, setSavedLead] = useState<Lead | null>(null);

  useEffect(() => {
    if (lead && open) {
      setMobile(lead.mobile || '');
      setAppointmentDate(lead.appointment_date || '');
      setAppointmentTime(lead.appointment_time || '');
      setFollowupDate(lead.followup_date || '');
      setSavedLead(null);
    }
  }, [lead, open]);

  const handleWhatsApp = (l: Lead) => {
    const phone = l.mobile?.replace(/\D/g, '') || '';
    const whatsappPhone = phone.startsWith('91') ? phone : `91${phone}`;
    const msg = buildWhatsAppMessage(l, hospitalName);
    window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleCall = (l: Lead) => {
    const phone = l.mobile?.replace(/\D/g, '') || '';
    window.open(`tel:${phone}`, '_self');
  };

  const handleSubmit = async () => {
    if (!lead) return;
    if (!mobile.trim()) {
      toast({ title: 'Error', description: 'Mobile number is required', variant: 'destructive' });
      return;
    }

    const updates: Partial<Lead> = {};
    if (mobile !== lead.mobile) updates.mobile = mobile.trim();
    if (appointmentDate !== lead.appointment_date) {
      updates.appointment_date = appointmentDate;
      if (appointmentDate) updates.call_status = 'Appointment Booked';
    }
    if (appointmentTime !== lead.appointment_time) updates.appointment_time = appointmentTime;
    if (followupDate !== lead.followup_date) {
      updates.followup_date = followupDate;
      if (followupDate && !appointmentDate) updates.call_status = 'Followup';
    }

    if (Object.keys(updates).length === 0) {
      toast({ title: 'No Changes', description: 'Nothing was changed.' });
      onClose();
      return;
    }

    try {
      await fetch('https://n8n.srv1237080.hstgr.cloud/webhook/updatedr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead.lead_id,
          patient_name: lead.patient_name,
          mobile: mobile.trim(),
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          followup_date: followupDate,
          ...updates,
        }),
      });
    } catch (err) {
      console.error('[CRM] Update webhook error:', err);
    }

    const updatedLead: Lead = { ...lead, ...updates, mobile: mobile.trim(), appointment_date: appointmentDate, appointment_time: appointmentTime, followup_date: followupDate };
    onUpdate(lead.lead_id, updates);
    toast({ title: 'Updated!', description: `${lead.patient_name} updated successfully.` });
    setSavedLead(updatedLead);
  };

  const handleClose = () => {
    setSavedLead(null);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-background border-border">
        <SheetHeader>
          <SheetTitle className="text-foreground flex items-center gap-2">
            {savedLead ? 'Updated Successfully' : 'Update Lead'}
          </SheetTitle>
          <SheetDescription>
            {lead ? `${lead.patient_name} (ID: ${lead.lead_id})` : ''}
          </SheetDescription>
        </SheetHeader>

        {savedLead ? (
          /* Post-Save: Show patient details + WhatsApp */
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/30">
              <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0" />
              <p className="text-sm font-medium text-foreground">Patient details updated!</p>
            </div>

            <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-2">
              <p className="text-base font-semibold text-foreground">{savedLead.patient_name}</p>
              <p className="text-sm text-muted-foreground">📞 {savedLead.mobile}</p>
              {savedLead.department && <p className="text-sm text-muted-foreground">📋 {savedLead.department}</p>}
              {savedLead.doctor_assigned && <p className="text-sm text-muted-foreground">👨‍⚕️ Dr. {savedLead.doctor_assigned}</p>}
              {savedLead.appointment_date && (
                <p className="text-sm text-muted-foreground">
                  📅 Appointment: {new Date(savedLead.appointment_date).toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {savedLead.appointment_time ? ` | ⏰ ${savedLead.appointment_time}` : ''}
                </p>
              )}
              {savedLead.followup_date && (
                <p className="text-sm text-muted-foreground">
                  🔔 Followup: {new Date(savedLead.followup_date).toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
              {savedLead.problem_description && <p className="text-sm text-muted-foreground">📝 {savedLead.problem_description}</p>}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => handleWhatsApp(savedLead)} className="flex-1 gap-2 bg-[hsl(142,70%,35%)] hover:bg-[hsl(142,70%,30%)] text-white">
                <MessageCircle className="h-4 w-4" /> WhatsApp भेजें
              </Button>
              <Button variant="outline" onClick={() => handleCall(savedLead)} className="gap-2">
                <Phone className="h-4 w-4" /> Call
              </Button>
            </div>

            <Button variant="outline" onClick={handleClose} className="w-full">
              Close
            </Button>
          </div>
        ) : lead && (
          <div className="mt-6 space-y-5">
            {/* Patient info (read-only) */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-sm font-medium text-foreground">{lead.patient_name}</p>
              <p className="text-xs text-muted-foreground">{lead.department} • {lead.city}</p>
            </div>

            {/* Mobile */}
            <div className="space-y-2">
              <Label className="text-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-primary" /> Mobile Number
              </Label>
              <Input value={mobile} onChange={e => setMobile(e.target.value)} placeholder="Enter mobile number" className="bg-muted/50" maxLength={15} />
            </div>

            {/* Appointment Date */}
            <div className="space-y-2">
              <Label className="text-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-success" /> Appointment Date
              </Label>
              <Input type="date" value={appointmentDate} onChange={e => setAppointmentDate(e.target.value)} className="bg-muted/50" />
            </div>

            {/* Appointment Time */}
            <div className="space-y-2">
              <Label className="text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-success" /> Appointment Time
              </Label>
              <Input type="time" value={appointmentTime} onChange={e => setAppointmentTime(e.target.value)} className="bg-muted/50" />
            </div>

            {/* Followup Date */}
            <div className="space-y-2">
              <Label className="text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-warning" /> Follow-up Date
              </Label>
              <Input type="date" value={followupDate} onChange={e => setFollowupDate(e.target.value)} className="bg-muted/50" />
            </div>

            {/* Submit */}
            <Button onClick={handleSubmit} className="w-full gap-2 bg-primary">
              <Save className="h-4 w-4" /> Save Changes
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
