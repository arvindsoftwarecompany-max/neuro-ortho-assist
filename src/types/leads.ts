export type CallStatus = 'New Lead' | 'Contacted' | 'Appointment Booked' | 'Followup' | 'Not Interested' | 'Converted' | 'Lost';
export type Department = 'Orthopedics' | 'Neurology' | 'Both';
export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';
export type Priority = 'Normal' | 'High' | 'Urgent';
export type Gender = 'Male' | 'Female' | 'Other';
export type LeadSource = 'Walk-in' | 'Phone' | 'Website' | 'Referral' | 'Social Media';

export interface Lead {
  lead_id: number;
  date_created: string;
  patient_name: string;
  mobile: string;
  email: string;
  age: number;
  gender: Gender;
  blood_group: string;
  city: string;
  state: string;
  pincode: string;
  address: string;
  department: Department;
  sub_specialty: string;
  problem_description: string;
  severity: Severity;
  call_status: CallStatus;
  followup_date: string;
  appointment_date: string;
  appointment_time: string;
  doctor_assigned: string;
  employee_name: string;
  source: LeadSource;
  remarks: string;
  priority: Priority;
  last_contact_date: string;
}

export interface Appointment {
  appointment_id: number;
  lead_id: number;
  appointment_date: string;
  appointment_time: string;
  doctor_name: string;
  department: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled' | 'No-show';
  consultation_type: 'First Visit' | 'Follow-up' | 'Emergency';
  notes: string;
}

export interface Followup {
  followup_id: number;
  lead_id: number;
  followup_date: string;
  followup_type: 'Call' | 'WhatsApp' | 'SMS' | 'Email';
  status: 'Pending' | 'Completed' | 'Missed';
  outcome: string;
  next_action: string;
  created_by: string;
}

export interface DashboardStats {
  totalLeads: number;
  todayAppointments: number;
  followupsToday: number;
  notInterested: number;
  newLeadsThisWeek: number;
  conversionRate: number;
  pendingFollowups: number;
  activeDoctors: number;
}
