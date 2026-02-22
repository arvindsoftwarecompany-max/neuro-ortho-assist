import { useState, useEffect, useCallback } from 'react';
import { Lead, DashboardStats, CallStatus, Department } from '@/types/leads';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/1cyEo1r6_AOG4cSvGz2ZRYla4oiGYiXzvZMg6k1ZOIcA/export?format=csv';

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
  // Try various formats
  const formats = [
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
  ];
  for (const fmt of formats) {
    const m = dateStr.match(fmt);
    if (m) {
      if (fmt === formats[2]) return dateStr;
      return `${m[3]}-${m[2]}-${m[1]}`;
    }
  }
  return dateStr;
}

const validStatuses: CallStatus[] = ['New Lead', 'Contacted', 'Appointment Booked', 'Followup', 'Not Interested', 'Converted', 'Lost'];
const validDepts: Department[] = ['Orthopedics', 'Neurology', 'Both'];

function mapCSVToLead(headers: string[], values: string[], index: number): Lead {
  const get = (name: string) => {
    const idx = headers.findIndex(h => h.toLowerCase().replace(/[_\s]/g, '') === name.toLowerCase().replace(/[_\s]/g, ''));
    return idx >= 0 ? values[idx] || '' : '';
  };

  const callStatus = get('callstatus') || get('call_status') || 'New Lead';
  const dept = get('department') || 'Orthopedics';

  return {
    lead_id: parseInt(get('leadid') || get('lead_id') || get('sno') || get('sr') || String(index + 1)),
    date_created: parseDate(get('datecreated') || get('date_created') || get('date')),
    patient_name: get('patientname') || get('patient_name') || get('name') || 'Unknown',
    mobile: get('mobile') || get('phone') || get('mobileno') || get('mobile_no') || '',
    email: get('email') || '',
    age: parseInt(get('age')) || 0,
    gender: (get('gender') as any) || 'Other',
    blood_group: get('bloodgroup') || get('blood_group') || '',
    city: get('city') || '',
    state: get('state') || '',
    pincode: get('pincode') || '',
    address: get('address') || '',
    department: (validDepts.includes(dept as Department) ? dept : 'Orthopedics') as Department,
    sub_specialty: get('subspecialty') || get('sub_specialty') || '',
    problem_description: get('problemdescription') || get('problem_description') || get('problem') || '',
    severity: (get('severity') as any) || 'Medium',
    call_status: (validStatuses.includes(callStatus as CallStatus) ? callStatus : 'New Lead') as CallStatus,
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

export function useLeadsData() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(CSV_URL);
      if (!res.ok) throw new Error('Failed to fetch');
      const text = await res.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) throw new Error('No data');
      const headers = parseCSVRow(lines[0]);
      const parsed = lines.slice(1).map((line, i) => mapCSVToLead(headers, parseCSVRow(line), i));
      setLeads(parsed);
      localStorage.setItem('crm_leads_cache', JSON.stringify(parsed));
      setError(null);
    } catch (e) {
      // Fallback to cache
      const cached = localStorage.getItem('crm_leads_cache');
      if (cached) {
        setLeads(JSON.parse(cached));
      }
      setError('Using cached data');
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
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

  const today = new Date().toISOString().split('T')[0];

  const stats: DashboardStats = {
    totalLeads: leads.length,
    todayAppointments: leads.filter(l => l.appointment_date === today && l.call_status === 'Appointment Booked').length,
    followupsToday: leads.filter(l => l.followup_date === today && l.call_status === 'Followup').length,
    notInterested: leads.filter(l => l.call_status === 'Not Interested').length,
    newLeadsThisWeek: leads.filter(l => {
      const d = new Date(l.date_created);
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    }).length,
    conversionRate: leads.length > 0 ? Math.round((leads.filter(l => l.call_status === 'Converted').length / leads.length) * 100) : 0,
    pendingFollowups: leads.filter(l => l.call_status === 'Followup').length,
    activeDoctors: new Set(leads.filter(l => l.doctor_assigned).map(l => l.doctor_assigned)).size,
  };

  return { leads, loading, lastUpdated, error, stats, fetchData, addLead, updateLead };
}
