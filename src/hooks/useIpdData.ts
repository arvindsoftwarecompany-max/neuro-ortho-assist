import { useState, useEffect, useCallback } from 'react';
import { IpdPatient, FollowUp, CallStatus } from '@/types/ipd';
import { addDays, format, parseISO } from 'date-fns';

const STORAGE_KEY = 'ipd_patients';

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

export function useIpdData() {
  const [patients, setPatients] = useState<IpdPatient[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { setPatients(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  const save = useCallback((data: IpdPatient[]) => {
    setPatients(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, []);

  const addPatient = useCallback((patient: Omit<IpdPatient, 'id' | 'followUps' | 'createdAt' | 'status'>) => {
    const newPatient: IpdPatient = {
      ...patient,
      id: generateId(),
      status: 'active',
      followUps: createFollowUps(patient.dischargeDate),
      createdAt: new Date().toISOString(),
    };
    save([newPatient, ...patients]);
    return newPatient;
  }, [patients, save]);

  const updatePatient = useCallback((id: string, data: Partial<IpdPatient>) => {
    save(patients.map(p => p.id === id ? { ...p, ...data } : p));
  }, [patients, save]);

  const markFollowUpDone = useCallback((patientId: string, followUpId: string, notes: string, status: CallStatus = 'completed') => {
    save(patients.map(p => {
      if (p.id !== patientId) return p;
      const followUps = p.followUps.map(f =>
        f.id === followUpId ? { ...f, status, notes, completedDate: format(new Date(), 'yyyy-MM-dd') } : f
      );
      const allDone = followUps.every(f => f.status === 'completed');
      return { ...p, followUps, status: status === 'readmitted' ? 'readmitted' : allDone ? 'completed' : p.status };
    }));
  }, [patients, save]);

  const rescheduleFollowUp = useCallback((patientId: string, followUpId: string, newDate: string) => {
    save(patients.map(p => {
      if (p.id !== patientId) return p;
      return { ...p, followUps: p.followUps.map(f => f.id === followUpId ? { ...f, scheduledDate: newDate, status: 'rescheduled' as const } : f) };
    }));
  }, [patients, save]);

  const deletePatient = useCallback((id: string) => {
    save(patients.filter(p => p.id !== id));
  }, [patients, save]);

  return { patients, addPatient, updatePatient, markFollowUpDone, rescheduleFollowUp, deletePatient };
}
