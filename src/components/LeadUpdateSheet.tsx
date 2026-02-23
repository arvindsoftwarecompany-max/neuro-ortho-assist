import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Lead } from '@/types/leads';
import { Phone, Calendar, Clock, Save } from 'lucide-react';

interface LeadUpdateSheetProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: number, data: Partial<Lead>) => void;
}

export default function LeadUpdateSheet({ lead, open, onClose, onUpdate }: LeadUpdateSheetProps) {
  const [mobile, setMobile] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [followupDate, setFollowupDate] = useState('');

  // Auto-fill form when lead changes
  useEffect(() => {
    if (lead && open) {
      setMobile(lead.mobile || '');
      setAppointmentDate(lead.appointment_date || '');
      setAppointmentTime(lead.appointment_time || '');
      setFollowupDate(lead.followup_date || '');
    }
  }, [lead, open]);

  // Sync form when lead changes
  const resetForm = () => {
    if (lead) {
      setMobile(lead.mobile || '');
      setAppointmentDate(lead.appointment_date || '');
      setAppointmentTime(lead.appointment_time || '');
      setFollowupDate(lead.followup_date || '');
    }
  };

  const handleSubmit = () => {
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

    onUpdate(lead.lead_id, updates);
    toast({ title: 'Updated!', description: `${lead.patient_name} updated successfully.` });
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); if (v && lead) { setMobile(lead.mobile || ''); setAppointmentDate(lead.appointment_date || ''); setAppointmentTime(lead.appointment_time || ''); setFollowupDate(lead.followup_date || ''); } }}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-background border-border">
        <SheetHeader>
          <SheetTitle className="text-foreground flex items-center gap-2">
            Update Lead
          </SheetTitle>
          <SheetDescription>
            {lead ? `${lead.patient_name} (ID: ${lead.lead_id})` : ''}
          </SheetDescription>
        </SheetHeader>

        {lead && (
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
              <Input
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                placeholder="Enter mobile number"
                className="bg-muted/50"
                maxLength={15}
              />
            </div>

            {/* Appointment Date */}
            <div className="space-y-2">
              <Label className="text-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-success" /> Appointment Date
              </Label>
              <Input
                type="date"
                value={appointmentDate}
                onChange={e => setAppointmentDate(e.target.value)}
                className="bg-muted/50"
              />
            </div>

            {/* Appointment Time */}
            <div className="space-y-2">
              <Label className="text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-success" /> Appointment Time
              </Label>
              <Input
                type="time"
                value={appointmentTime}
                onChange={e => setAppointmentTime(e.target.value)}
                className="bg-muted/50"
              />
            </div>

            {/* Followup Date */}
            <div className="space-y-2">
              <Label className="text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-warning" /> Follow-up Date
              </Label>
              <Input
                type="date"
                value={followupDate}
                onChange={e => setFollowupDate(e.target.value)}
                className="bg-muted/50"
              />
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
