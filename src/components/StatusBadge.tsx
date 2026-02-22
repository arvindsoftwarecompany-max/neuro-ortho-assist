import { CallStatus } from '@/types/leads';
import { cn } from '@/lib/utils';

const statusConfig: Record<CallStatus, { class: string; dot: string }> = {
  'New Lead': { class: 'status-new', dot: 'bg-primary' },
  'Contacted': { class: 'status-contacted', dot: 'bg-secondary' },
  'Appointment Booked': { class: 'status-booked', dot: 'bg-success' },
  'Followup': { class: 'status-followup', dot: 'bg-warning' },
  'Not Interested': { class: 'status-not-interested', dot: 'bg-destructive' },
  'Converted': { class: 'status-converted', dot: 'bg-emerald-400' },
  'Lost': { class: 'status-lost', dot: 'bg-muted-foreground' },
};

export default function StatusBadge({ status }: { status: CallStatus }) {
  const config = statusConfig[status] || statusConfig['New Lead'];
  return (
    <span className={cn('status-badge', config.class)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {status}
    </span>
  );
}
