import { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Flame, Thermometer, Snowflake, MessageSquareText, Loader2, RefreshCw, Sparkles, Bell, Phone, MessageCircle, PhoneCall, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { Lead } from '@/types/leads';
import ChatHistoryDialog from '@/components/ChatHistoryDialog';
import LeadUpdateSheet from '@/components/LeadUpdateSheet';
import { useChatData, ChatMessage } from '@/hooks/useChatData';
import { useLeadsData } from '@/hooks/useLeadsData';
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
  firstTimestamp: string;
}

function normalizeMobile(m: string): string {
  const digits = (m || '').replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function fmtDate(s: string): string {
  if (!s) return '-';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString('hi-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function isToday(s: string): boolean {
  if (!s) return false;
  const d = new Date(s);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function toLeadShape(cl: ChatLead, existing?: Lead): Lead {
  if (existing) return { ...existing, mobile: cl.mobile, patient_name: cl.patient_name };
  return {
    lead_id: 0,
    date_created: cl.firstTimestamp,
    patient_name: cl.patient_name,
    mobile: cl.mobile,
    email: '', age: 0, gender: 'Other',
    blood_group: '', city: '', state: '', pincode: '', address: '',
    department: '', sub_specialty: '',
    problem_description: '',
    severity: 'Low', call_status: 'New Lead',
    followup_date: '', appointment_date: '', appointment_time: '',
    doctor_assigned: '', employee_name: '',
    source: 'WhatsApp' as any,
    remarks: '', priority: 'Normal',
    last_contact_date: cl.lastTimestamp,
  };
}

const tempBadge: Record<Temperature, { label: string; icon: any; className: string }> = {
  hot:  { label: 'HOT',  icon: Flame,       className: 'bg-red-500/15 text-red-500 border-red-500/40' },
  warm: { label: 'WARM', icon: Thermometer, className: 'bg-orange-500/15 text-orange-500 border-orange-500/40' },
  cold: { label: 'COLD', icon: Snowflake,   className: 'bg-blue-500/15 text-blue-400 border-blue-500/40' },
};

interface LeadClassificationProps {
  defaultFilter?: 'all' | Temperature;
  title?: string;
  subtitle?: string;
  skipAnalysis?: boolean;
  minimal?: boolean;
  onlyCalled?: boolean;
}

export default function LeadClassification({ defaultFilter, title, subtitle, skipAnalysis, minimal, onlyCalled }: LeadClassificationProps) {
  const { profile } = useAuth();
  const { leads, updateLead } = useLeadsData();
  const { messages: allChats, loading: chatLoading, error: chatError, configured: chatConfigured, fetchData } = useChatData();
  const [chatLead, setChatLead] = useState<Lead | null>(null);
  const [updateLeadState, setUpdateLeadState] = useState<Lead | null>(null);
  const [filter, setFilter] = useState<'all' | Temperature>(defaultFilter || 'all');
  const [analyses, setAnalyses] = useState<Record<string, Classification>>({});
  const [analyzing, setAnalyzing] = useState<Record<string, boolean>>({});
  const analyzedKeysRef = useRef<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;
  const calledStorageKey = `lead-classification-called::${profile?.hospital_name || 'anon'}`;
  const analysisStorageKey = `lead-classification-analyses::${profile?.hospital_name || 'anon'}`;
  const [calledMap, setCalledMap] = useState<Record<string, boolean>>({});

  // Load calledMap whenever storage key becomes stable (profile loaded)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(calledStorageKey);
      if (stored) setCalledMap(JSON.parse(stored));
    } catch {}
  }, [calledStorageKey]);

  // Persist calledMap whenever it changes
  useEffect(() => {
    try { localStorage.setItem(calledStorageKey, JSON.stringify(calledMap)); } catch {}
  }, [calledMap, calledStorageKey]);

  // Load persisted analyses whenever storage key becomes stable
  useEffect(() => {
    try {
      const stored = localStorage.getItem(analysisStorageKey);
      if (stored) setAnalyses(JSON.parse(stored));
    } catch {}
  }, [analysisStorageKey]);

  // Persist analyses whenever they change
  useEffect(() => {
    try { localStorage.setItem(analysisStorageKey, JSON.stringify(analyses)); } catch {}
  }, [analyses, analysisStorageKey]);

  const toggleCalled = (mobile: string) => setCalledMap((s) => ({ ...s, [mobile]: !s[mobile] }));

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
      const first = msgs[0];
      const last = msgs[msgs.length - 1];
      list.push({
        mobile,
        patient_name: msgs.find((m) => m.patient_name)?.patient_name || 'Unknown',
        messages: msgs,
        firstTimestamp: first?.timestamp || '',
        lastTimestamp: last?.timestamp || '',
      });
    });
    list.sort((a, b) => (b.lastTimestamp || '').localeCompare(a.lastTimestamp || ''));
    return list;
  }, [allChats]);

  useEffect(() => {
    if (skipAnalysis) return;
    // Only analyze: (1) today's leads + (2) last 50 most recent leads
    const todayLeads = chatLeads.filter((cl) => isToday(cl.firstTimestamp) || isToday(cl.lastTimestamp));
    const last50 = chatLeads.slice(0, 50);
    const toAnalyzeMap = new Map<string, ChatLead>();
    todayLeads.forEach((cl) => toAnalyzeMap.set(cl.mobile, cl));
    last50.forEach((cl) => toAnalyzeMap.set(cl.mobile, cl));

    toAnalyzeMap.forEach(async (cl) => {
      const key = `${cl.mobile}::${cl.messages.length}`;
      if (analyzedKeysRef.current.has(key)) return;
      analyzedKeysRef.current.add(key);
      setAnalyzing((s) => ({ ...s, [cl.mobile]: true }));
      try {
        const { data, error } = await supabase.functions.invoke('classify-chat-lead', {
          body: {
            patient_name: cl.patient_name, mobile: cl.mobile,
            messages: cl.messages.map((m) => ({ timestamp: m.timestamp, sender: m.sender, message: m.message })),
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setAnalyses((s) => ({ ...s, [cl.mobile]: data as Classification }));
      } catch (e) {
        // silent — row will show pending
      } finally {
        setAnalyzing((s) => ({ ...s, [cl.mobile]: false }));
      }
    });
  }, [chatLeads]);

  const reanalyze = () => {
    analyzedKeysRef.current.clear();
    setAnalyses({});
    fetchData();
  };

  const findExistingLead = (mobile: string): Lead | undefined => {
    const target = normalizeMobile(mobile);
    return leads.find((l) => normalizeMobile(l.mobile) === target);
  };

  const filteredLeads = useMemo(() => {
    let list = chatLeads;
    if (onlyCalled) list = list.filter((cl) => !!calledMap[cl.mobile]);
    if (filter === 'all') return list;
    return list.filter((cl) => analyses[cl.mobile]?.temperature === filter);
  }, [chatLeads, analyses, filter, onlyCalled, calledMap]);

  useEffect(() => { setPage(1); }, [filter, chatLeads.length]);
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedLeads = useMemo(
    () => filteredLeads.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredLeads, currentPage]
  );

  const counts = useMemo(() => {
    const c = { hot: 0, warm: 0, cold: 0, pending: 0 };
    chatLeads.forEach((cl) => {
      const a = analyses[cl.mobile];
      if (a) c[a.temperature]++;
      else c.pending++;
    });
    return c;
  }, [chatLeads, analyses]);

  const handleCall = (mobile: string) => window.open(`tel:${mobile.replace(/\D/g, '')}`, '_self');
  const handleWhatsApp = (cl: ChatLead) => {
    const phone = cl.mobile.replace(/\D/g, '');
    const wa = phone.startsWith('91') ? phone : `91${phone}`;
    const a = analyses[cl.mobile];
    const msg = `नमस्ते ${cl.patient_name} जी,\n\n${profile?.hospital_name || 'Hospital'} से बात कर रहे हैं।${a ? `\n\n${a.nextAction}` : ''}\n\nधन्यवाद! 🙏`;
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-4 pt-12 lg:pt-0">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> {title || 'Lead Classification'}
          </h1>
          {!minimal && (
            <p className="text-sm text-muted-foreground">
              {subtitle || 'Google Chat Sheet ke har patient ko AI khud Hot / Warm / Cold classify karta hai'}
            </p>
          )}
        </div>
        {!minimal && (
          <Button variant="outline" size="sm" onClick={reanalyze} disabled={chatLoading}>
            <RefreshCw className={cn('h-3.5 w-3.5', chatLoading && 'animate-spin')} /> Re-analyze
          </Button>
        )}
      </motion.div>

      {!minimal && (
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'hot', 'warm', 'cold'] as const).map((f) => {
            const count = f === 'all' ? chatLeads.length : counts[f as Temperature];
            const label = f === 'all' ? 'All' : tempBadge[f as Temperature].label;
            return (
              <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)} className="h-8">
                {label} <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{count}</Badge>
              </Button>
            );
          })}
          {counts.pending > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
              <Loader2 className="h-3 w-3 animate-spin" /> {counts.pending} AI analyze ho rahe hain…
            </span>
          )}
        </div>
      )}

      {!minimal && (
        <div className="glass-card p-3 text-xs">
          {!chatConfigured && <span className="text-warning">⚠️ Settings me Google Chat Sheet URL configure karein.</span>}
          {chatConfigured && chatLoading && <span className="text-muted-foreground">⏳ Chat data load ho raha hai…</span>}
          {chatConfigured && !chatLoading && chatError && <span className="text-destructive">❌ {chatError}</span>}
          {chatConfigured && !chatLoading && !chatError && (
            <span className="text-primary">
              💬 {allChats.length} messages • {chatLeads.length} unique patients • {Object.keys(analyses).length} AI-classified (today + last 50)
            </span>
          )}
        </div>
      )}

      {chatLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : chatLeads.length === 0 ? (
        <div className="glass-card p-8 text-center text-sm text-muted-foreground">Google Chat Sheet me koi data nahi mila.</div>
      ) : minimal ? (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="whitespace-nowrap">Mobile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedLeads.map((cl) => {
                  const isCalled = !!calledMap[cl.mobile];
                  return (
                    <TableRow key={cl.mobile} className={cn('hover:bg-muted/20', isCalled && 'bg-success/5')}>
                      <TableCell className="font-medium text-sm">
                        {cl.patient_name}
                        {isCalled && <CheckCircle2 className="inline-block ml-1 h-3.5 w-3.5 text-success" />}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{cl.mobile}</TableCell>
                    </TableRow>
                  );
                })}
                {pagedLeads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-sm text-muted-foreground py-8">
                      Is filter me koi lead nahi hai.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {filteredLeads.length > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border/50 text-xs">
              <span className="text-muted-foreground">
                {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredLeads.length)} of {filteredLeads.length}
              </span>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" className="h-7 px-2" disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </Button>
                <span className="px-2">Page {currentPage} / {totalPages}</span>
                <Button size="sm" variant="outline" className="h-7 px-2" disabled={currentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="whitespace-nowrap">Mobile</TableHead>
                  <TableHead className="whitespace-nowrap">AI Status</TableHead>
                  <TableHead className="min-w-[220px]">Patient ki Zaroorat (Kya chahiye)</TableHead>
                  <TableHead className="min-w-[220px]">Aage Kya Karna Hai</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedLeads.map((cl) => {
                  const a = analyses[cl.mobile];
                  const isAnalyzing = analyzing[cl.mobile];
                  const T = a ? tempBadge[a.temperature] : null;
                  const Icon = T?.icon;
                  const existing = findExistingLead(cl.mobile);
                  const leadShape = toLeadShape(cl, existing);
                  const isCalled = !!calledMap[cl.mobile];
                  return (
                    <TableRow key={cl.mobile} className={cn('hover:bg-muted/20', isCalled && 'bg-success/5')}>
                      <TableCell className="text-xs whitespace-nowrap">{fmtDate(cl.firstTimestamp)}</TableCell>
                      <TableCell className="font-medium text-sm">
                        {cl.patient_name}
                        {isCalled && <CheckCircle2 className="inline-block ml-1 h-3.5 w-3.5 text-success" />}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{cl.mobile}</TableCell>
                      <TableCell>
                        {a && T && Icon ? (
                          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold', T.className)}>
                            <Icon className="h-3 w-3" /> {T.label}
                          </span>
                        ) : isAnalyzing ? (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> AI…</span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Pending</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-foreground/90">
                        {a ? (
                          <div className="space-y-1">
                            <p>{a.summary}</p>
                            <p className="text-muted-foreground italic">{a.reason}</p>
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-foreground/90">
                        {a ? a.nextAction : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0" title="Call" onClick={() => handleCall(cl.mobile)} disabled={isCalled}>
                            <Phone className="h-3.5 w-3.5 text-success" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0" title="WhatsApp" onClick={() => handleWhatsApp(cl)} disabled={isCalled}>
                            <MessageCircle className="h-3.5 w-3.5 text-[hsl(142,70%,40%)]" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 gap-1" title="Chat dekhein" onClick={() => setChatLead(leadShape)} disabled={isCalled}>
                            <MessageSquareText className="h-3.5 w-3.5" />
                            <span className="text-[11px]">{cl.messages.length}</span>
                          </Button>
                          <Button size="sm" className="h-7 px-2 gap-1" title="Follow-up form" onClick={() => setUpdateLeadState(leadShape)} disabled={isCalled}>
                            <Bell className="h-3.5 w-3.5" />
                            <span className="text-[11px] hidden sm:inline">Follow-up</span>
                          </Button>
                          <Button
                            size="sm"
                            variant={isCalled ? 'default' : 'outline'}
                            className={cn('h-7 px-2 gap-1', isCalled && 'bg-success hover:bg-success/90 text-white')}
                            title={isCalled ? 'call ho chuka ha' : 'Mark as Called'}
                            onClick={() => toggleCalled(cl.mobile)}
                            disabled={isCalled}
                          >
                            {isCalled ? <CheckCircle2 className="h-3.5 w-3.5" /> : <PhoneCall className="h-3.5 w-3.5" />}
                            <span className="text-[11px] hidden sm:inline">{isCalled ? 'call ho chuka ha' : 'Call done?'}</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {pagedLeads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                      Is filter me koi lead nahi hai.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {filteredLeads.length > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border/50 text-xs">
              <span className="text-muted-foreground">
                {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredLeads.length)} of {filteredLeads.length}
              </span>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" className="h-7 px-2" disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </Button>
                <span className="px-2">Page {currentPage} / {totalPages}</span>
                <Button size="sm" variant="outline" className="h-7 px-2" disabled={currentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <ChatHistoryDialog lead={chatLead} open={!!chatLead} onClose={() => setChatLead(null)} />
      <LeadUpdateSheet
        lead={updateLeadState}
        open={!!updateLeadState}
        onClose={() => setUpdateLeadState(null)}
        onUpdate={updateLead}
        hospitalName={profile?.hospital_name}
        webhookUpdateUrl={profile?.webhook_update_url}
        webhookLeadUrl={profile?.webhook_lead_url}
      />

    </div>
  );
}
