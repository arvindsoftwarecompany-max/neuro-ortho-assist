import { useState, useEffect, useCallback } from 'react';
import { IpdPatient, FollowUp, CallStatus } from '@/types/ipd';
import { addDays, format, parseISO } from 'date-fns';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/1IkvEJ7e3UNckCW4Yxj29YafQlfYVWc9Kcttt46uTTbQ/export?format=csv';
const STORAGE_KEY = 'ipd_patients';
const LOCAL_PATIENTS_KEY = 'ipd_patients_local';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function calculateFollowUpDates(dischargeDate: string): { type: '1st' | '2nd' | '3rd'; date: string }[] {
  const d = parseISO(dischargeDate);
  return [
    { type: '1st', date: format(addDays(d, 10), 'yyyy-MM-dd') },
    { type: '2nd', date: format(addDays(d, 25), 'yyyy-MM-dd') },
    { type: '3rd', date: format(addDays(d, 45), 'yyyy-MM-dd') },
  ];
}

function createFollowUps(dischargeDate: string): FollowUp[] {
  return calculateFollowUpDates(dischargeDate).map(f => ({
    id: generateId(),
    type: f.type,
    scheduledDate: f.date,
    status: 'pending' as const,
    notes: '',
  }));
}

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

function mapCSVToPatient(headers: string[], values: string[], index: number): IpdPatient {
  const get = (name: string) => {
    const normalized = name.toLowerCase().replace(/[_\s]/g, '');
    const idx = headers.findIndex(h => h.toLowerCase().replace(/[_\s]/g, '') === normalized);
    return idx >= 0 ? (values[idx] || '').trim() : '';
  };

  const dischargeDate = parseDate(get('dischargedate') || get('discharge_date') || get('discharge') || '');

  const patient: IpdPatient = {
    id: `csv-${index}`,
    name: get('name') || get('patientname') || get('patient_name') || 'Unknown',
    mobile: get('mobile') || get('phone') || get('mobileno') || get('mobile_no') || get('contact') || '',
    ipdNumber: get('ipdnumber') || get('ipd_number') || get('ipdno') || get('ipd_no') || get('ipd') || String(index + 1),
    admissionDate: parseDate(get('admissiondate') || get('admission_date') || get('admission') || ''),
    dischargeDate,
    diagnosis: get('diagnosis') || get('disease') || get('problem') || '',
    doctor: get('doctor') || get('doctorassigned') || get('doctor_assigned') || get('attendingdoctor') || '',
    department: get('department') || get('dept') || '',
    followUpNotes: get('followupnotes') || get('followup_notes') || get('notes') || get('remarks') || get('remark') || '',
    status: 'active',
    followUps: dischargeDate ? createFollowUps(dischargeDate) : [],
    createdAt: new Date().toISOString(),
  };

  return patient;
}

export function useIpdData() {
  const [patients, setPatients] = useState<IpdPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Load locally added patients
  const getLocalPatients = useCallback((): IpdPatient[] => {
    try {
      const stored = localStorage.getItem(LOCAL_PATIENTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }, []);

  const saveLocalPatients = useCallback((data: IpdPatient[]) => {
    localStorage.setItem(LOCAL_PATIENTS_KEY, JSON.stringify(data));
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(CSV_URL);
      if (!res.ok) throw new Error('Failed to fetch');
      const text = await res.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) throw new Error('No data');
      const headers = parseCSVRow(lines[0]);
      const csvPatients = lines.slice(1).map((line, i) => mapCSVToPatient(headers, parseCSVRow(line), i));

      console.log('[IPD] Headers:', headers);
      console.log('[IPD] CSV patients:', csvPatients.length);

      const localPatients = getLocalPatients();
      const merged = [...localPatients, ...csvPatients];
      setPatients(merged);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      setError(null);
    } catch (e) {
      console.error('[IPD] Fetch error:', e);
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        setPatients(JSON.parse(cached));
      } else {
        // Fallback to local only
        setPatients(getLocalPatients());
      }
      setError('Using cached data');
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, [getLocalPatients]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const addPatient = useCallback((patient: Omit<IpdPatient, 'id' | 'followUps' | 'createdAt' | 'status'>) => {
    const newPatient: IpdPatient = {
      ...patient,
      id: generateId(),
      status: 'active',
      followUps: createFollowUps(patient.dischargeDate),
      createdAt: new Date().toISOString(),
    };
    const localPatients = [...getLocalPatients(), newPatient];
    saveLocalPatients(localPatients);
    setPatients(prev => [newPatient, ...prev]);
    return newPatient;
  }, [getLocalPatients, saveLocalPatients]);

  const updatePatient = useCallback((id: string, data: Partial<IpdPatient>) => {
    setPatients(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...data } : p);
      // Update local patients too
      const localPatients = getLocalPatients().map(p => p.id === id ? { ...p, ...data } : p);
      saveLocalPatients(localPatients);
      return updated;
    });
  }, [getLocalPatients, saveLocalPatients]);

  const markFollowUpDone = useCallback((patientId: string, followUpId: string, notes: string, status: CallStatus = 'completed') => {
    setPatients(prev => {
      const updated = prev.map(p => {
        if (p.id !== patientId) return p;
        const followUps = p.followUps.map(f =>
          f.id === followUpId ? { ...f, status, notes, completedDate: format(new Date(), 'yyyy-MM-dd') } : f
        );
        const allDone = followUps.every(f => f.status === 'completed');
        return { ...p, followUps, status: status === 'readmitted' ? 'readmitted' : allDone ? 'completed' : p.status };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const rescheduleFollowUp = useCallback((patientId: string, followUpId: string, newDate: string) => {
    setPatients(prev => {
      const updated = prev.map(p => {
        if (p.id !== patientId) return p;
        return { ...p, followUps: p.followUps.map(f => f.id === followUpId ? { ...f, scheduledDate: newDate, status: 'rescheduled' as const } : f) };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deletePatient = useCallback((id: string) => {
    setPatients(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      const localPatients = getLocalPatients().filter(p => p.id !== id);
      saveLocalPatients(localPatients);
      return updated;
    });
  }, [getLocalPatients, saveLocalPatients]);

  return { patients, loading, error, lastUpdated, addPatient, updatePatient, markFollowUpDone, rescheduleFollowUp, deletePatient, fetchData };
}
