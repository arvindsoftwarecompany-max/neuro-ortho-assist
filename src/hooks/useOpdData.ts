import { useState, useEffect, useCallback } from 'react';
import { OpdReminder } from '@/types/opd';
import { useAuth } from '@/contexts/AuthContext';

function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    if (row[i] === '"') {
      inQuotes = !inQuotes;
    } else if (row[i] === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += row[i];
    }
  }
  result.push(current.trim());
  return result;
}

function parseDate(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const m = trimmed.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return trimmed;
}

function mapCSVToOpd(headers: string[], values: string[], index: number): OpdReminder {
  const get = (name: string) => {
    const normalized = name.toLowerCase().replace(/[_\s]/g, '');
    const idx = headers.findIndex(h => h.toLowerCase().replace(/[_\s]/g, '') === normalized);
    return idx >= 0 ? (values[idx] || '').trim() : '';
  };

  const rawPayment = get('facility') || get('paymentmode') || get('payment_mode') || get('paymenttype') || get('payment_type') || '';
  const normalizePayment = (v: string): string => {
    const lower = v.toLowerCase().trim();
    if (lower.includes('rghs')) return 'RGHS';
    if (lower.includes('echs')) return 'ECHS';
    if (lower.includes('cash')) return 'Cash';
    if (lower.includes('private')) return 'Private';
    return v.trim() || '';
  };

  return {
    id: index + 1,
    name: get('name') || get('patientname') || get('patient_name') || 'Unknown',
    mobile: get('mobile') || get('phone') || '',
    city: get('city') || '',
    facility: get('facility') || '',
    next_visit: parseDate(get('nextvisit') || get('next_visit') || ''),
    reminder_1_day: get('reminder1day') || get('reminder_1_day') || get('reminder') || '',
    time: get('time') || '',
    payment_type: normalizePayment(rawPayment),
    remark: get('remark') || get('remarks') || '',
  };
}

export function useOpdData() {
  const { profile } = useAuth();
  const csvUrl = profile?.google_sheet_opd_url || '';
  const [reminders, setReminders] = useState<OpdReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!csvUrl) {
      setLoading(false);
      setError('No Google Sheet URL configured');
      return;
    }
    try {
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error('Failed to fetch');
      const text = await res.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) throw new Error('No data');
      const headers = parseCSVRow(lines[0]);
      const parsed = lines.slice(1).map((line, i) => mapCSVToOpd(headers, parseCSVRow(line), i));

      console.log('[OPD] Headers:', headers);
      console.log('[OPD] Parsed reminders:', parsed.length);

      setReminders(parsed);
      localStorage.setItem('opd_reminders_cache', JSON.stringify(parsed));
      setError(null);
    } catch (e) {
      const cached = localStorage.getItem('opd_reminders_cache');
      if (cached) setReminders(JSON.parse(cached));
      setError('Using cached data');
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, [csvUrl]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const addReminder = (reminder: Omit<OpdReminder, 'id'>) => {
    const newR = { ...reminder, id: reminders.length + 1 } as OpdReminder;
    const updated = [newR, ...reminders];
    setReminders(updated);
    localStorage.setItem('opd_reminders_cache', JSON.stringify(updated));
  };

  const updateReminder = (id: number, data: Partial<OpdReminder>) => {
    const updated = reminders.map(r => r.id === id ? { ...r, ...data } : r);
    setReminders(updated);
    localStorage.setItem('opd_reminders_cache', JSON.stringify(updated));
  };

  return { reminders, loading, lastUpdated, error, fetchData, addReminder, updateReminder };
}
