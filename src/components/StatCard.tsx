import { LucideIcon } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'teal';
  suffix?: string;
  onClick?: () => void;
}

const variantStyles = {
  blue: 'stat-card-blue',
  green: 'stat-card-green',
  amber: 'stat-card-amber',
  red: 'stat-card-red',
  purple: 'stat-card-purple',
  teal: 'stat-card-teal',
};

const iconBg = {
  blue: 'bg-primary/15 text-primary',
  green: 'bg-success/15 text-success',
  amber: 'bg-warning/15 text-warning',
  red: 'bg-destructive/15 text-destructive',
  purple: 'bg-secondary/15 text-secondary',
  teal: 'bg-accent/15 text-accent',
};

export default function StatCard({ title, value, icon: Icon, variant, suffix, onClick }: StatCardProps) {
  return (
    <div
      className={cn(variantStyles[variant], 'p-4 md:p-5 cursor-pointer')}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl md:text-3xl font-bold text-foreground">
            <AnimatedCounter value={value} suffix={suffix} />
          </p>
        </div>
        <div className={cn('p-2.5 rounded-lg', iconBg[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
