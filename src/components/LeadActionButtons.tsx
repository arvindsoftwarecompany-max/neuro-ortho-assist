import { Phone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Lead } from '@/types/leads';

interface LeadActionButtonsProps {
  lead: Lead;
  hospitalName: string;
}

function buildWhatsAppMessage(lead: Lead, hospitalName: string): string {
  const lines = [
    `🏥 *${hospitalName}*`,
    '',
    `नमस्ते *${lead.patient_name}* जी,`,
    '',
    `हम ${hospitalName} से बात कर रहे हैं।`,
  ];

  if (lead.department) {
    lines.push(`📋 *विभाग:* ${lead.department}`);
  }
  if (lead.doctor_assigned) {
    lines.push(`👨‍⚕️ *डॉक्टर:* Dr. ${lead.doctor_assigned}`);
  }
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
  if (lead.problem_description) {
    lines.push(`📝 *समस्या:* ${lead.problem_description}`);
  }

  lines.push('', 'कृपया समय पर पहुँचें। धन्यवाद! 🙏');

  return lines.join('\n');
}

export default function LeadActionButtons({ lead, hospitalName }: LeadActionButtonsProps) {
  const phone = lead.mobile?.replace(/\D/g, '') || '';
  const whatsappPhone = phone.startsWith('91') ? phone : `91${phone}`;

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const msg = buildWhatsAppMessage(lead, hospitalName);
    window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`tel:${phone}`, '_self');
  };

  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-success/30 hover:bg-success/10" onClick={handleCall} title="Call">
        <Phone className="h-3.5 w-3.5 text-success" />
      </Button>
      <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-[hsl(142,70%,40%)]/30 hover:bg-[hsl(142,70%,40%)]/10" onClick={handleWhatsApp} title="WhatsApp">
        <MessageCircle className="h-3.5 w-3.5 text-[hsl(142,70%,40%)]" />
      </Button>
    </div>
  );
}
