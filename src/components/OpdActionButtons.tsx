import { Phone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OpdReminder } from '@/types/opd';

interface OpdActionButtonsProps {
  reminder: OpdReminder;
  hospitalName: string;
}

export function buildOpdWhatsAppMessage(reminder: OpdReminder, hospitalName: string): string {
  const lines = [
    `🏥 *${hospitalName}*`,
    '',
    `नमस्ते *${reminder.name}* जी,`,
    '',
    `हम ${hospitalName} से बात कर रहे हैं।`,
  ];

  if (reminder.facility) lines.push(`📋 *विभाग:* ${reminder.facility}`);
  if (reminder.next_visit) {
    try {
      const d = new Date(reminder.next_visit);
      const dateStr = d.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      lines.push(`📅 *अगली अपॉइंटमेंट:* ${dateStr}${reminder.time ? ` | ⏰ ${reminder.time}` : ''}`);
    } catch {
      lines.push(`📅 *अगली अपॉइंटमेंट:* ${reminder.next_visit}`);
    }
  }
  if (reminder.reminder_1_day) {
    try {
      const d = new Date(reminder.reminder_1_day);
      const dateStr = d.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      lines.push(`🔔 *फॉलोअप तारीख:* ${dateStr}`);
    } catch {
      lines.push(`🔔 *फॉलोअप तारीख:* ${reminder.reminder_1_day}`);
    }
  }
  if (reminder.payment_type) lines.push(`💳 *Payment:* ${reminder.payment_type}`);
  if (reminder.city) lines.push(`🏙 *City:* ${reminder.city}`);
  if (reminder.remark) lines.push(`📝 *नोट:* ${reminder.remark}`);

  lines.push('', 'कृपया समय पर पहुँचें। धन्यवाद! 🙏');
  return lines.join('\n');
}

export function getOpdWhatsAppUrl(reminder: OpdReminder, hospitalName: string): string {
  const phone = reminder.mobile?.replace(/\D/g, '') || '';
  const whatsappPhone = phone.startsWith('91') ? phone : `91${phone}`;
  const msg = buildOpdWhatsAppMessage(reminder, hospitalName);
  return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(msg)}`;
}

export default function OpdActionButtons({ reminder, hospitalName }: OpdActionButtonsProps) {
  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(getOpdWhatsAppUrl(reminder, hospitalName), '_blank');
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = reminder.mobile?.replace(/\D/g, '') || '';
    window.open(`tel:${phone}`, '_self');
  };

  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1 border-success/30 text-success hover:bg-success/10" onClick={handleCall} title="Call">
        <Phone className="h-3 w-3" /> Call
      </Button>
      <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1 border-[hsl(142,70%,40%)]/30 text-[hsl(142,70%,40%)] hover:bg-[hsl(142,70%,40%)]/10" onClick={handleWhatsApp} title="WhatsApp">
        <MessageCircle className="h-3 w-3" /> WA
      </Button>
    </div>
  );
}
