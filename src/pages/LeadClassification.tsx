import { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Flame, Thermometer, Snowflake, MessageSquareText, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Lead } from '@/types/leads';
import LeadActionButtons from '@/components/LeadActionButtons';
import ChatHistoryDialog from '@/components/ChatHistoryDialog';
import { useChatData, ChatMessage } from '@/hooks/useChatData';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type Temperature = 'hot' | 'warm' | 'cold';

interface Classification {
  temperature: Temperature;
  reason: string;
  nextAction: string;
  summary: string;
}

interface ChatLead {
  mobile: string;
  patient_name: string;
  messages: ChatMessage[];
  lastTimestamp: string;
  lastMessage: string;
}

function normalizeMobile(m: string): string {
  const digits = (m || '').replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function toLeadShape(cl: ChatLead): Lead {
  return {
    lead_id: 0,
    date_created: cl.lastTimestamp,
    patient_name: cl.patient_name,
    mobile: cl.mobile,
    email: '',
    age: 0,
    gender: 'Other',
    blood_group: '',
    city: '', state: '', pincode: '', address: '',
    department: '', sub_specialty: '',
    problem_description: '',
    severity: 'Low',
    call_status: 'New Lead',
    followup_date: '', appointment_date: '', appointment_time: '',
    doctor_assigned: '', employee_name: '',
    source: 'WhatsApp' as any,
    remarks: '',
    priority: 'Normal',
    last_contact_date: cl.lastTimestamp,
  };
}

const tempConfig: Record<Temperature, { label: string; icon: any; color: string; bg: string; border: string }> = {
  hot:  { label: 'Hot Lead',  icon: Flame,       color: 'text-red-500',    bg: 'bg-red-500/10',    border: 'border-red-500/30' },
  warm: { label: 'Warm Lead', icon: Thermometer, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  cold: { label: 'Cold Lead', icon: Snowflake,   color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30' },
};

export default function LeadClassification() {
  const { profile } = useAuth();
  const { messages: allChats, loading: chatLoading, error: chatError, configured: chatConfigured, fetchData } = useChatData();
  const [tab, setTab] = useState<Temperature>('hot');
  const [chatLead, setChatLead] = useState<Lead | null>(null);
  const [analyses, setAnalyses] = useState<Record<string, Classification>>({});
  const [analyzing, setAnalyzing] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const analyzedKeysRef = useRef<Set<string>>(new Set());

  // Group chat messages by mobile → ChatLead list
  const chatLeads = useMemo<ChatLead[]>(() => {
    const map = new Map<string, ChatMessage[]>();
    allChats.forEach((m) => {
      const key = normalizeMobile(m.mobile);
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
    const list: ChatLead[] = [];
    map.forEach((msgs, mobile) => {
      const last = msgs[msgs.length - 1];
      list.push({
        mobile,
        patient_name: msgs.find((m) => m.patient_name)?.patient_name || last?.patient_name || 'Unknown',
        messages: msgs,
        lastTimestamp: last?.timestamp || '',
        lastMessage: last?.message || '',
      });
    });
    // Sort by last timestamp desc (string compare fine if ISO; else fallback)
    list.sort((a, b) => (b.lastTimestamp || '').localeCompare(a.lastTimestamp || ''));
    return list;
  }, [allChats]);

  // Auto-analyze every chat lead (cached by mobile + message count)
  useEffect(() => {
    chatLeads.forEach(async (cl) => {
      const key = `${cl.mobile}::${cl.messages.length}`;
      if (analyzedKeysRef.current.has(key)) return;
      analyzedKeysRef.current.add(key);
      setAnalyzing((s) => ({ ...s, [cl.mobile]: true }));
      try {
        const { data, error } = await supabase.functions.invoke('classify-chat-lead', {
          body: {
            patient_name: cl.patient_name,
            mobile: cl.mobile,
            messages: cl.messages.map((m) => ({
              timestamp: m.timestamp, sender: m.sender, message: m.message,
            })),
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setAnalyses((s) => ({ ...s, [cl.mobile]: data as Classification }));
        setErrors((s) => { const n = { ...s }; delete n[cl.mobile]; return n; });
      } catch (e: any) {
        setErrors((s) => ({ ...s, [cl.mobile]: e?.message || 'AI analysis failed' }));
      } finally {
        setAnalyzing((s) => ({ ...s, [cl.mobile]: false }));
      }
    });
  }, [chatLeads]);

  const reanalyze = () => {
    analyzedKeysRef.current.clear();
    setAnalyses({});
    setErrors({});
    fetchData();
  };

  const classified = useMemo(() => {
    const buckets: Record<Temperature | 'pending', ChatLead[]> = { hot: [], warm: [], cold: [], pending: [] };
    chatLeads.forEach((cl) => {
      const a = analyses[cl.mobile];
      if (a) buckets[a.temperature].push(cl);
      else buckets.pending.push(cl);
    });
    return buckets;
  }, [chatLeads, analyses]);

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Lead Classification
          </h1>
          <p className="text-sm text-muted-foreground">
            Google Chat Sheet se patients ko AI khud Hot / Warm / Cold classify karta hai
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reanalyze} disabled={chatLoading}>
          <RefreshCw className={cn('h-3.5 w-3.5', chatLoading && 'animate-spin')} />
          Re-analyze
        </Button>
      </motion.div>

      <div className="glass-card p-3 text-xs">
        {!chatConfigured && <span className="text-warning">⚠️ Settings me Google Chat Sheet URL configure karein.</span>}
        {chatConfigured && chatLoading && <span className="text-muted-foreground">⏳ Chat data load ho raha hai…</span>}
        {chatConfigured && !chatLoading && chatError && <span className="text-destructive">❌ {chatError}</span>}
        {chatConfigured && !chatLoading && !chatError && (
          <span className="text-primary">
            💬 {allChats.length} messages • {chatLeads.length} unique patients •{' '}
            {Object.keys(analyses).length}/{chatLeads.length} AI-classified
            {classified.pending.length > 0 && ` • ${classified.pending.length} pending`}
          </span>
        )}
      </div>

      {chatLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : chatLeads.length === 0 && chatConfigured ? (
        <div className="glass-card p-8 text-center text-sm text-muted-foreground">
          Google Chat Sheet me koi data nahi mila.
        </div>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as Temperature)}>
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            {(['hot', 'warm', 'cold'] as Temperature[]).map((t) => {
              const C = tempConfig[t];
              const Icon = C.icon;
              return (
                <TabsTrigger key={t} value={t} className="flex items-center gap-1.5">
                  <Icon className={cn('h-4 w-4', C.color)} />
                  <span className="hidden sm:inline">{C.label}</span>
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {classified[t].length}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(['hot', 'warm', 'cold'] as Temperature[]).map((t) => {
            const C = tempConfig[t];
            const Icon = C.icon;
            const list = classified[t];
            return (
              <TabsContent key={t} value={t} className="mt-4 space-y-3">
                {list.length === 0 ? (
                  <div className="glass-card p-8 text-center text-sm text-muted-foreground">
                    Koi {C.label.toLowerCase()} nahi hai.
                    {classified.pending.length > 0 && ` ${classified.pending.length} patients abhi analyze ho rahe hain…`}
                  </div>
                ) : (
                  list.map((cl) => {
                    const a = analyses[cl.mobile];
                    const leadShape = toLeadShape(cl);
                    return (
                      <motion.div
                        key={cl.mobile}
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
                              <h3 className="font-semibold text-foreground">{cl.patient_name}</h3>
                              <p className="text-xs text-muted-foreground">
                                {cl.mobile} • {cl.messages.length} messages • last: {cl.lastTimestamp}
                              </p>
                            </div>
                          </div>
                          <LeadActionButtons lead={leadShape} hospitalName={profile?.hospital_name || 'Hospital'} />
                        </div>

                        {a && (
                          <div className="space-y-2 mb-3">
                            <div className={cn('p-2.5 rounded-md text-xs', C.bg)}>
                              <p className={cn('font-medium mb-1 flex items-center gap-1', C.color)}>
                                <Sparkles className="h-3 w-3" />
                                Kyu {C.label} hai? (AI)
                              </p>
                              <p className="text-foreground/90">{a.reason}</p>
                            </div>
                            <div className="p-2.5 rounded-md bg-primary/5 border border-primary/20 text-xs">
                              <p className="font-medium text-primary mb-1">Aage kya karna hai?</p>
                              <p className="text-foreground/90">{a.nextAction}</p>
                            </div>
                            {a.summary && (
                              <div className="p-2.5 rounded-md bg-muted/30 text-xs">
                                <p className="font-medium text-muted-foreground mb-1">Chat Summary</p>
                                <p className="text-foreground/90">{a.summary}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {cl.messages.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setChatLead(leadShape)}
                            className="w-full text-left p-2.5 rounded-md bg-muted/30 border border-border/50 hover:border-primary/40 transition-colors mb-3"
                          >
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                              <span className="flex items-center gap-1">
                                <MessageSquareText className="h-3 w-3" />
                                Latest message • {cl.messages[cl.messages.length - 1].sender || 'Staff'}
                              </span>
                              <span>{cl.lastTimestamp}</span>
                            </div>
                            <p className="text-xs text-foreground/90 line-clamp-2">{cl.lastMessage}</p>
                            <p className="text-[10px] text-primary mt-1">
                              Puri baat-cheet dekhne ke liye click karein →
                            </p>
                          </button>
                        )}

                        <Button size="sm" variant="outline" className="h-8" onClick={() => setChatLead(leadShape)}>
                          <MessageSquareText className="h-3.5 w-3.5" />
                          Baat-cheet ({cl.messages.length})
                        </Button>
                      </motion.div>
                    );
                  })
                )}
              </TabsContent>
            );
          })}

          {classified.pending.length > 0 && (
            <div className="mt-4 glass-card p-3 text-xs">
              <p className="font-medium text-muted-foreground mb-2">
                ⏳ AI analyze kar raha hai ({classified.pending.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {classified.pending.slice(0, 10).map((cl) => (
                  <span key={cl.mobile} className="px-2 py-1 rounded bg-muted/40 flex items-center gap-1">
                    {analyzing[cl.mobile] && <Loader2 className="h-3 w-3 animate-spin" />}
                    {cl.patient_name}
                    {errors[cl.mobile] && <span className="text-destructive">!</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Tabs>
      )}

      <ChatHistoryDialog lead={chatLead} open={!!chatLead} onClose={() => setChatLead(null)} />
    </div>
  );
}
