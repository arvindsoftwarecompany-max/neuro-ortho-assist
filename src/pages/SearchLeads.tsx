import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Filter, Download, Phone, Eye, ChevronLeft, ChevronRight, ArrowUpDown, X, SearchX } from 'lucide-react';
import { useLeadsData } from '@/hooks/useLeadsData';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CallStatus, Department, Severity, Priority } from '@/types/leads';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE_OPTIONS = [15, 30, 50, 100];
const ALL_STATUSES: CallStatus[] = ['New Lead', 'Contacted', 'Appointment Booked', 'Followup', 'Not Interested', 'Converted', 'Lost'];
const ALL_DEPARTMENTS: Department[] = ['Orthopedics', 'Neurology', 'Both'];
const ALL_SEVERITIES: Severity[] = ['Low', 'Medium', 'High', 'Critical'];
const ALL_PRIORITIES: Priority[] = ['Normal', 'High', 'Urgent'];

/** Safe lowercase includes check */
function safeIncludes(value: unknown, query: string): boolean {
  if (value == null) return false;
  return String(value).toLowerCase().trim().includes(query);
}

export default function SearchLeads() {
  const { leads } = useLeadsData();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Initialize filters from URL params
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [deptFilter, setDeptFilter] = useState<string>(searchParams.get('department') || 'all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('lead_id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [showFilters, setShowFilters] = useState(false);

  const specialFilter = searchParams.get('filter');
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Active filter count for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (deptFilter !== 'all') count++;
    if (severityFilter !== 'all') count++;
    if (priorityFilter !== 'all') count++;
    if (search.trim()) count++;
    return count;
  }, [statusFilter, deptFilter, severityFilter, priorityFilter, search]);

  // Single memoized filter pipeline — the ONLY place filtering happens
  const filtered = useMemo(() => {
    let result = [...leads];

    // 1. Special date-based filters from dashboard cards
    if (specialFilter === 'today_appointments') {
      result = result.filter(l => l.appointment_date === today);
    } else if (specialFilter === 'today_followups') {
      result = result.filter(l => l.followup_date === today);
    } else if (specialFilter === 'pending_followups') {
      result = result.filter(l => l.followup_date === today && l.call_status !== 'Converted' && l.call_status !== 'Lost');
    } else if (specialFilter === 'overdue_followups') {
      result = result.filter(l => l.followup_date && l.followup_date < today && l.call_status !== 'Converted' && l.call_status !== 'Lost');
    }

    // 2. Department filter
    if (deptFilter !== 'all') {
      result = result.filter(l => l.department === deptFilter);
    }

    // 3. Status filter
    if (statusFilter !== 'all') {
      result = result.filter(l => l.call_status === statusFilter);
    }

    // 4. Severity filter
    if (severityFilter !== 'all') {
      result = result.filter(l => l.severity === severityFilter);
    }

    // 5. Priority filter
    if (priorityFilter !== 'all') {
      result = result.filter(l => l.priority === priorityFilter);
    }

    // 6. Search — case-insensitive, partial, null-safe across all key fields
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(l =>
        safeIncludes(l.patient_name, q) ||
        safeIncludes(l.mobile, q) ||
        safeIncludes(l.city, q) ||
        safeIncludes(l.department, q) ||
        safeIncludes(l.problem_description, q) ||
        safeIncludes(l.call_status, q) ||
        safeIncludes(l.doctor_assigned, q) ||
        safeIncludes(l.email, q)
      );
    }

    // 7. Sort
    result.sort((a, b) => {
      const av = (a as any)[sortField];
      const bv = (b as any)[sortField];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });

    return result;
  }, [leads, search, statusFilter, deptFilter, severityFilter, priorityFilter, sortField, sortDir, specialFilter, today]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const toggleSort = useCallback((field: string) => {
    setSortField(prev => {
      if (prev === field) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        return prev;
      }
      setSortDir('asc');
      return field;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setStatusFilter('all');
    setDeptFilter('all');
    setSeverityFilter('all');
    setPriorityFilter('all');
    setSearch('');
    setPage(1);
  }, []);

  const exportCSV = useCallback(() => {
    const headers = ['Lead ID', 'Patient Name', 'Mobile', 'Age', 'Gender', 'City', 'Department', 'Status', 'Doctor', 'Appointment Date'];
    const rows = filtered.map(l => [l.lead_id, l.patient_name, l.mobile, l.age, l.gender, l.city, l.department, l.call_status, l.doctor_assigned, l.appointment_date]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'leads_export.csv'; a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  return (
    <div className="space-y-5 pt-12 lg:pt-0">
      {/* Active special filter banner */}
      <AnimatePresence>
        {specialFilter && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="glass-card p-3 flex items-center justify-between border border-primary/30">
            <span className="text-sm text-primary font-medium">
              {specialFilter === 'today_appointments' && '📅 Today\'s Appointments'}
              {specialFilter === 'today_followups' && '🔔 Today\'s Follow-ups'}
              {specialFilter === 'pending_followups' && '⏳ Pending Follow-ups'}
              {specialFilter === 'overdue_followups' && '⚠️ Overdue Follow-ups'}
            </span>
            <Button variant="ghost" size="sm" onClick={() => navigate('/leads')} className="text-xs gap-1">
              <X className="h-3 w-3" /> Clear
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Search Leads</h1>
          <p className="text-sm text-muted-foreground">
            Showing {filtered.length} of {leads.length} leads
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2 relative">
            <Filter className="h-3.5 w-3.5" /> Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </motion.div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, mobile, city, department, status, doctor..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="pl-10 bg-card/50 border-border/50"
        />
        {search && (
          <button onClick={() => { setSearch(''); setPage(1); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="glass-card p-4 overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className={cn("bg-muted/50", statusFilter !== 'all' && "border-primary/50 ring-1 ring-primary/20")}>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Department</label>
                <Select value={deptFilter} onValueChange={v => { setDeptFilter(v); setPage(1); }}>
                  <SelectTrigger className={cn("bg-muted/50", deptFilter !== 'all' && "border-primary/50 ring-1 ring-primary/20")}>
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {ALL_DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Severity</label>
                <Select value={severityFilter} onValueChange={v => { setSeverityFilter(v); setPage(1); }}>
                  <SelectTrigger className={cn("bg-muted/50", severityFilter !== 'all' && "border-primary/50 ring-1 ring-primary/20")}>
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severity</SelectItem>
                    {ALL_SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
                <Select value={priorityFilter} onValueChange={v => { setPriorityFilter(v); setPage(1); }}>
                  <SelectTrigger className={cn("bg-muted/50", priorityFilter !== 'all' && "border-primary/50 ring-1 ring-primary/20")}>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    {ALL_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-xs">
                <X className="h-3 w-3" /> Reset All Filters
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table or Empty State */}
      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="glass-card p-12 flex flex-col items-center justify-center text-center">
          <SearchX className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No leads match your filters</h3>
          <p className="text-sm text-muted-foreground mb-4">Try adjusting your search or filters to find what you're looking for.</p>
          <Button variant="outline" size="sm" onClick={clearFilters} className="gap-2">
            <X className="h-3.5 w-3.5" /> Reset All Filters
          </Button>
        </motion.div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  {[
                    { key: 'lead_id', label: '#' },
                    { key: 'patient_name', label: 'Patient Name' },
                    { key: 'mobile', label: 'Mobile' },
                    { key: 'age', label: 'Age' },
                    { key: 'city', label: 'City' },
                    { key: 'department', label: 'Dept' },
                    { key: 'call_status', label: 'Status' },
                    { key: 'appointment_date', label: 'Appointment' },
                    { key: 'followup_date', label: 'Follow-up' },
                    { key: 'doctor_assigned', label: 'Doctor' },
                  ].map(col => (
                    <th key={col.key}
                      className="px-3 py-3 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground whitespace-nowrap"
                      onClick={() => toggleSort(col.key)}>
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {sortField === col.key && <ArrowUpDown className="h-3 w-3 text-primary" />}
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(lead => {
                  const isOverdue = lead.followup_date && lead.followup_date < today && lead.call_status === 'Followup';
                  const isTodayAppt = lead.appointment_date === today;
                  return (
                    <tr key={lead.lead_id}
                      className={cn(
                        "border-b border-border/30 hover:bg-muted/20 transition-colors",
                        isTodayAppt && "bg-success/5",
                        isOverdue && "bg-destructive/5",
                        lead.priority === 'Urgent' && "border-l-2 border-l-destructive",
                        lead.priority === 'High' && "border-l-2 border-l-warning",
                      )}>
                      <td className="px-3 py-3 font-mono-med text-xs text-muted-foreground">{lead.lead_id}</td>
                      <td className="px-3 py-3 font-medium text-foreground whitespace-nowrap">{lead.patient_name}</td>
                      <td className="px-3 py-3 font-mono-med text-xs whitespace-nowrap">
                        <a href={`tel:${lead.mobile}`} className="text-primary hover:underline">{lead.mobile}</a>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{lead.age || '-'}{lead.gender ? `/${lead.gender.charAt(0)}` : ''}</td>
                      <td className="px-3 py-3 text-muted-foreground">{lead.city || '-'}</td>
                      <td className="px-3 py-3">
                        <span className={cn("text-xs font-medium",
                          lead.department === 'Orthopedics' ? 'text-accent' : lead.department === 'Neurology' ? 'text-secondary' : 'text-primary'
                        )}>{lead.department}</span>
                      </td>
                      <td className="px-3 py-3"><StatusBadge status={lead.call_status} /></td>
                      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {lead.appointment_date || '-'}{lead.appointment_time ? ` ${lead.appointment_time}` : ''}
                      </td>
                      <td className={cn("px-3 py-3 text-xs whitespace-nowrap", isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                        {lead.followup_date || '-'}
                        {isOverdue && ' ⚠'}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{lead.doctor_assigned || '-'}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => navigate(`/patient/${lead.lead_id}`)} className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {lead.mobile && (
                            <a href={`tel:${lead.mobile}`} className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-primary">
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-border/30 gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Showing {((safePage - 1) * perPage) + 1}-{Math.min(safePage * perPage, filtered.length)} of {filtered.length}</span>
              <Select value={String(perPage)} onValueChange={v => { setPerPage(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-[70px] h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ITEMS_PER_PAGE_OPTIONS.map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" disabled={safePage === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pageNum = safePage <= 3 ? i + 1 : safePage + i - 2;
                if (pageNum < 1 || pageNum > totalPages) return null;
                return (
                  <Button key={pageNum} variant={pageNum === safePage ? 'default' : 'ghost'} size="sm"
                    className="w-8 h-8 text-xs" onClick={() => setPage(pageNum)}>
                    {pageNum}
                  </Button>
                );
              })}
              <Button variant="ghost" size="sm" disabled={safePage >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
