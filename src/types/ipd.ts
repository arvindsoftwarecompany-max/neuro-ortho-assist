export type CallStatus = 'pending' | 'completed' | 'not_reachable' | 'wrong_number' | 'readmitted' | 'rescheduled';
export type FollowUpType = '1st' | '2nd' | '3rd';
export type PatientStatus = 'active' | 'completed' | 'readmitted';

export interface FollowUp {
  id: string;
  type: FollowUpType;
  scheduledDate: string; // YYYY-MM-DD
  completedDate?: string;
  status: CallStatus;
  notes: string;
}

export interface IpdPatient {
  id: string;
  name: string;
  mobile: string;
  ipdNumber: string;
  admissionDate: string;
  dischargeDate: string;
  diagnosis: string;
  doctor: string;
  department: string;
  followUpNotes: string;
  status: PatientStatus;
  followUps: FollowUp[];
  createdAt: string;
}
