import { useState, useEffect, useCallback } from 'react';
import { Lead, DashboardStats, CallStatus, Department } from '@/types/leads';
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
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // DD-MM-YYYY or DD/MM/YYYY
  const m = trimmed.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return trimmed;
}

/** Normalize department: match known departments or keep as-is */
function normalizeDepartment(raw: string): Department {
  const val = raw.toLowerCase().trim();
  if (!val) return 'General Medicine';
  const map: Record<string, string> = {
    'ortho': 'Orthopedics', 'orthopedics': 'Orthopedics', 'orthopedic': 'Orthopedics',
    'neuro': 'Neurology', 'neurology': 'Neurology',
    'cardio': 'Cardiology', 'cardiology': 'Cardiology',
    'general medicine': 'General Medicine', 'medicine': 'General Medicine',
    'general surgery': 'General Surgery', 'surgery': 'General Surgery',
    'pediatrics': 'Pediatrics', 'paediatrics': 'Pediatrics', 'pedia': 'Pediatrics',
    'gynecology': 'Gynecology', 'gynaecology': 'Gynecology', 'gynae': 'Gynecology', 'obgyn': 'Gynecology',
    'ent': 'ENT',
    'ophthalmology': 'Ophthalmology', 'eye': 'Ophthalmology',
    'dermatology': 'Dermatology', 'skin': 'Dermatology',
    'urology': 'Urology',
    'gastroenterology': 'Gastroenterology', 'gastro': 'Gastroenterology',
    'pulmonology': 'Pulmonology', 'pulmo': 'Pulmonology', 'chest': 'Pulmonology',
    'nephrology': 'Nephrology',
    'oncology': 'Oncology',
    'psychiatry': 'Psychiatry', 'mental health': 'Psychiatry',
    'dental': 'Dental', 'dentistry': 'Dental',
    'physiotherapy': 'Physiotherapy', 'physio': 'Physiotherapy',
    'both': 'General Medicine',
  };
  // Try exact match first, then startsWith
  if (map[val]) return map[val];
  for (const [key, dept] of Object.entries(map)) {
    if (val.startsWith(key)) return dept;
  }
  // Capitalize first letter of each word as fallback
  return raw.trim().replace(/\b\w/g, c => c.toUpperCase()) || 'Other';
}

/** Normalize call status: handle common variations */
function normalizeCallStatus(raw: string): CallStatus {
  const val = raw.toLowerCase().trim();
  const map: Record<string, CallStatus> = {
    'new lead': 'New Lead',
    'new': 'New Lead',
    'contacted': 'Contacted',
    'pick phone': 'Contacted',
    'picked phone': 'Contacted',
    'appointment booked': 'Appointment Booked',
    'booked': 'Appointment Booked',
    'followup': 'Followup',
    'follow up': 'Followup',
    'follow-up': 'Followup',
    'not interested': 'Not Interested',
    'converted': 'Converted',
    'lost': 'Lost',
  };
  return map[val] || 'New Lead';
}

function mapCSVToLead(headers: string[], values: string[], index: number): Lead {
  const get = (name: string) => {
    const normalized = name.toLowerCase().replace(/[_\s]/g, '');
    const idx = headers.findIndex(h => h.toLowerCase().replace(/[_\s]/g, '') === normalized);
    return idx >= 0 ? (values[idx] || '').trim() : '';
  };

  const rawDept = get('department') || get('dept');
  const rawStatus = get('callstatus') || get('call_status') || get('status');

  return {
    lead_id: parseInt(get('leadid') || get('lead_id') || get('sno') || get('sr') || String(index + 1)),
    date_created: parseDate(get('datecreated') || get('date_created') || get('date')),
    patient_name: get('patientname') || get('patient_name') || get('name') || 'Unknown',
    mobile: get('mobile') || get('phone') || get('mobileno') || get('mobile_no') || '',
    email: get('email') || '',
    age: parseInt(get('age')) || 0,
    gender: (get('gender') as any) || 'Other',
    blood_group: get('paymentmode') || get('payment_mode') || get('paymenttype') || get('payment_type') || get('bloodgroup') || get('blood_group') || '',
    city: get('city') || '',
    state: get('state') || '',
    pincode: get('pincode') || '',
    address: get('address') || '',
    department: normalizeDepartment(rawDept),
    sub_specialty: get('subspecialty') || get('sub_specialty') || '',
    problem_description: get('problemdescription') || get('problem_description') || get('problem') || '',
    severity: (get('severity') as any) || 'Medium',
    call_status: normalizeCallStatus(rawStatus),
    followup_date: parseDate(get('followupdate') || get('followup_date')),
    appointment_date: parseDate(get('appointmentdate') || get('appointment_date')),
    appointment_time: get('appointmenttime') || get('appointment_time') || '',
    doctor_assigned: get('doctorassigned') || get('doctor_assigned') || get('doctor') || '',
    employee_name: get('employeename') || get('employee_name') || get('employee') || '',
    source: (get('source') as any) || 'Phone',
    remarks: get('remarks') || get('remark') || '',
    priority: (get('priority') as any) || 'Normal',
    last_contact_date: parseDate(get('lastcontactdate') || get('last_contact_date')),
  };
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function computeStats(leads: Lead[]): DashboardStats {
  const today = getToday();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];

  return {
    totalLeads: leads.length,
    todayAppointments: leads.filter(l => l.appointment_date === today).length,
    followupsToday: leads.filter(l => l.followup_date === today).length,
    notInterested: leads.filter(l => l.call_status === 'Not Interested').length,
    newLeadsThisWeek: leads.filter(l => l.date_created >= weekAgoStr).length,
    conversionRate: leads.length > 0
      ? Math.round((leads.filter(l => l.call_status === 'Appointment Booked' || l.call_status === 'Converted').length / leads.length) * 100)
      : 0,
    pendingFollowups: leads.filter(l => l.followup_date >= today && l.call_status !== 'Converted' && l.call_status !== 'Lost').length,
    activeDoctors: new Set(leads.filter(l => l.doctor_assigned).map(l => l.doctor_assigned)).size,
  };
}

export function useLeadsData() {
  const { profile } = useAuth();
  const csvUrl = profile?.google_sheet_leads_url || '';
  const [leads, setLeads] = useState<Lead[]>([]);
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
      const parsed = lines.slice(1).map((line, i) => mapCSVToLead(headers, parseCSVRow(line), i));

      // Debug logging
      console.log('[CRM] Raw headers:', headers);
      console.log('[CRM] Parsed leads:', parsed.length);
      console.log('[CRM] Departments:', parsed.map(l => l.department));
      console.log('[CRM] Today:', getToday());
      console.log('[CRM] Appointments today:', parsed.filter(l => l.appointment_date === getToday()).length);
      console.log('[CRM] Followups today:', parsed.filter(l => l.followup_date === getToday()).length);

      setLeads(parsed);
      localStorage.setItem('crm_leads_cache', JSON.stringify(parsed));
      setError(null);
    } catch (e) {
      const cached = localStorage.getItem('crm_leads_cache');
      if (cached) {
        setLeads(JSON.parse(cached));
      }
      setError('Using cached data');
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, [csvUrl]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 900000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const addLead = (lead: Omit<Lead, 'lead_id'>) => {
    const newLead = { ...lead, lead_id: leads.length + 1 } as Lead;
    const updated = [newLead, ...leads];
    setLeads(updated);
    localStorage.setItem('crm_leads_cache', JSON.stringify(updated));
  };

  const updateLead = (id: number, data: Partial<Lead>) => {
    const updated = leads.map(l => l.lead_id === id ? { ...l, ...data } : l);
    setLeads(updated);
    localStorage.setItem('crm_leads_cache', JSON.stringify(updated));
  };

  // Compute stats dynamically from current leads
  const stats = computeStats(leads);

  return { leads, loading, lastUpdated, error, stats, fetchData, addLead, updateLead };
}
