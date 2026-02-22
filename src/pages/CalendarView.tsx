import { motion } from 'framer-motion';
import { useLeadsData } from '@/hooks/useLeadsData';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export default function CalendarView() {
  const { leads } = useLeadsData();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  const days = Array.from({ length: 42 }, (_, i) => {
    const dayNum = i - firstDay + 1;
    if (dayNum < 1 || dayNum > daysInMonth) return null;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const appts = leads.filter(l => l.appointment_date === dateStr);
    const followups = leads.filter(l => l.followup_date === dateStr);
    return { dayNum, dateStr, appts, followups, isToday: dateStr === today };
  });

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
        <p className="text-sm text-muted-foreground">Appointments & follow-ups overview</p>
      </motion.div>

      <div className="glass-card p-5">
        <div className="flex justify-between items-center mb-6">
          <button onClick={prevMonth} className="text-muted-foreground hover:text-foreground text-sm">← Prev</button>
          <h2 className="text-lg font-semibold text-foreground">
            {currentMonth.toLocaleDateString('en', { month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={nextMonth} className="text-muted-foreground hover:text-foreground text-sm">Next →</button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-xs text-muted-foreground font-medium py-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => (
            <div key={i} className={cn(
              "min-h-[80px] md:min-h-[100px] rounded-lg p-1.5 text-xs transition-colors",
              day ? "bg-muted/20 hover:bg-muted/40 cursor-pointer" : "",
              day?.isToday && "ring-1 ring-primary bg-primary/10"
            )}>
              {day && (
                <>
                  <span className={cn("font-medium", day.isToday ? "text-primary" : "text-foreground")}>{day.dayNum}</span>
                  {day.appts.length > 0 && (
                    <div className="mt-1 px-1 py-0.5 rounded bg-success/20 text-[10px] text-success truncate">
                      <CalendarIcon className="h-2.5 w-2.5 inline mr-0.5" />{day.appts.length} appt
                    </div>
                  )}
                  {day.followups.length > 0 && (
                    <div className="mt-0.5 px-1 py-0.5 rounded bg-warning/20 text-[10px] text-warning truncate">
                      <Clock className="h-2.5 w-2.5 inline mr-0.5" />{day.followups.length} f/u
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
