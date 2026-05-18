import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Thermometer, Snowflake, MessageSquareText, Bell, Loader2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLeadsData } from '@/hooks/useLeadsData';
import { useAuth } from '@/contexts/AuthContext';
import { Lead } from '@/types/leads';
import LeadActionButtons from '@/components/LeadActionButtons';
import LeadUpdateSheet from '@/components/LeadUpdateSheet';
import ChatHistoryDialog from '@/components/ChatHistoryDialog';
import { cn } from '@/lib/utils';

type Temperature = 'hot' | 'warm' | 'cold';

function classify(l: Lead): Temperature {
  const urgent = l.priority === 'Urgent';
  const highPrio = l.priority === 'High';
  const critical = l.severity === 'Critical' || l.severity === 'High';
  const today = new Date().toISOString().split('T')[0];
  const hasUpcomingAppt = l.appointment_date && l.appointment_date >= today;

  if (urgent || critical || l.call_status === 'Appointment Booked' || hasUpcomingAppt) return 'hot';
  if (highPrio || l.call_status === 'Contacted' || l.call_status === 'Followup') return 'warm';
  return 'cold';
}

function getReason(l: Lead, t: Temperature): string {
  const reasons: string[] = [];
  if (l.priority === 'Urgent') reasons.push('Priority "Urgent" set hai');
  if (l.severity === 'Critical' || l.severity === 'High') reasons.push(`Severity ${l.severity} hai`);
  if (l.call_status === 'Appointment Booked') reasons.push('Appointment book ho chuki hai');
  if (l.call_status === 'Contacted') reasons.push('Patient se contact ho chuka hai');
  if (l.call_status === 'Followup') reasons.push('Followup pending hai');
  if (l.call_status === 'New Lead') reasons.push('Naya lead hai, abhi contact nahi hua');
  if (l.call_status === 'Not Interested') reasons.push('Patient ne interest nahi dikhaya');
  if (l.appointment_date) reasons.push(`Appointment: ${l.appointment_date}`);
  if (reasons.length === 0) {
    return t === 'hot' ? 'High priority lead hai, turant attention chahiye.' :
           t === 'warm' ? 'Engaged lead hai, follow karna zaroori hai.' :
           'Low engagement, periodic check-in karein.';
  }
  return reasons.join('. ') + '.';
}

function getNextAction(l: Lead, t: Temperature): string {
  if (l.call_status === 'Appointment Booked') return 'WhatsApp se appointment confirm karein aur reminder bhejein.';
  if (l.call_status === 'New Lead') return 'Pehle call karke patient ki problem samjhein aur appointment offer karein.';
  if (l.call_status === 'Contacted') return 'Patient se follow-up karke appointment book karwayein.';
  if (l.call_status === 'Followup') return `Followup date par call karein${l.followup_date ? ` (${l.followup_date})` : ''}.`;
  if (l.call_status === 'Not Interested') return 'Ek polite re-engagement message bhejein future me.';
  return t === 'hot' ? 'Turant call karein aur appointment confirm karein.' :
         t === 'warm' ? 'Aaj-kal me follow-up karein.' :
         'Week me ek baar check-in karein.';
}

const tempConfig: Record<Temperature, { label: string; icon: any; color: string; bg: string; border: string }> = {
  hot:  { label: 'Hot Lead',  icon: Flame,       color: 'text-red-500',    bg: 'bg-red-500/10',    border: 'border-red-500/30' },
  warm: { label: 'Warm Lead', icon: Thermometer, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  cold: { label: 'Cold Lead', icon: Snowflake,   color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30' },
};

export default function LeadClassification() {
  const { leads, loading, updateLead } = useLeadsData();
  const { profile } = useAuth();
  const [tab, setTab] = useState<Temperature>('hot');
  const [chatLead, setChatLead] = useState<Lead | null>(null);
  const [updateLeadState, setUpdateLeadState] = useState<Lead | null>(null);

  const classified = useMemo(() => {
    const buckets: Record<Temperature, Lead[]> = { hot: [], warm: [], cold: [] };
    leads.forEach(l => buckets[classify(l)].push(l));
    return buckets;
  }, [leads]);

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold text-foreground">Lead Classification</h1>
        <p className="text-sm text-muted-foreground">Leads ko Hot / Warm / Cold me dekhein aur action lein</p>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as Temperature)}>
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            {(['hot', 'warm', 'cold'] as Temperature[]).map(t => {
              const C = tempConfig[t];
              const Icon = C.icon;
              return (
                <TabsTrigger key={t} value={t} className="flex items-center gap-1.5">
                  <Icon className={cn('h-4 w-4', C.color)} />
                  <span className="hidden sm:inline">{C.label}</span>
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{classified[t].length}</Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(['hot', 'warm', 'cold'] as Temperature[]).map(t => {
            const C = tempConfig[t];
            const Icon = C.icon;
            return (
              <TabsContent key={t} value={t} className="mt-4 space-y-3">
                {classified[t].length === 0 ? (
                  <div className="glass-card p-8 text-center text-sm text-muted-foreground">
                    Koi {C.label.toLowerCase()} nahi hai.
                  </div>
                ) : (
                  classified[t].map(lead => (
                    <motion.div
                      key={lead.lead_id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn('glass-card p-4 border-l-4', C.border)}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn('p-2 rounded-lg', C.bg)}>
                            <Icon className={cn('h-4 w-4', C.color)} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{lead.patient_name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {lead.mobile} • {lead.department}
                            </p>
                          </div>
                        </div>
                        <LeadActionButtons lead={lead} hospitalName={profile?.hospital_name || 'Hospital'} />
                      </div>

                      <div className="space-y-2 mb-3">
                        <div className={cn('p-2.5 rounded-md text-xs', C.bg)}>
                          <p className={cn('font-medium mb-1', C.color)}>Kyu {C.label} hai?</p>
                          <p className="text-foreground/90">{getReason(lead, t)}</p>
                        </div>
                        <div className="p-2.5 rounded-md bg-primary/5 border border-primary/20 text-xs">
                          <p className="font-medium text-primary mb-1">Aage kya karna hai?</p>
                          <p className="text-foreground/90">{getNextAction(lead, t)}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" className="h-8" onClick={() => setChatLead(lead)}>
                          <MessageSquareText className="h-3.5 w-3.5" />
                          Baat-cheet
                        </Button>
                        <Button size="sm" className="h-8" onClick={() => setUpdateLeadState(lead)}>
                          <Bell className="h-3.5 w-3.5" />
                          Follow-up
                        </Button>
                      </div>
                    </motion.div>
                  ))
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      <ChatHistoryDialog lead={chatLead} open={!!chatLead} onClose={() => setChatLead(null)} />
      <LeadUpdateSheet
        lead={updateLeadState}
        open={!!updateLeadState}
        onClose={() => setUpdateLeadState(null)}
        onUpdate={updateLead}
        hospitalName={profile?.hospital_name}
        webhookUpdateUrl={profile?.webhook_update_url}
      />
    </div>
  );
}
