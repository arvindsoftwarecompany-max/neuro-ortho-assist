import { 
  Bone, Brain, Heart, Stethoscope, Baby, Users, Ear, Eye, 
  Scissors, Activity, Wind, Droplets, Shield, Smile, Pill, Cross
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export interface DepartmentConfig {
  name: string;
  icon: LucideIcon;
  color: string; // tailwind text color token
  chartColor: string; // hex for charts
}

export const DEPARTMENTS: DepartmentConfig[] = [
  { name: 'Orthopedics', icon: Bone, color: 'text-accent', chartColor: '#0D9488' },
  { name: 'Neurology', icon: Brain, color: 'text-secondary', chartColor: '#7C3AED' },
  { name: 'Cardiology', icon: Heart, color: 'text-destructive', chartColor: '#DC2626' },
  { name: 'General Medicine', icon: Stethoscope, color: 'text-primary', chartColor: '#2563EB' },
  { name: 'General Surgery', icon: Scissors, color: 'text-warning', chartColor: '#D97706' },
  { name: 'Pediatrics', icon: Baby, color: 'text-success', chartColor: '#059669' },
  { name: 'Gynecology', icon: Users, color: 'text-pink-500', chartColor: '#EC4899' },
  { name: 'ENT', icon: Ear, color: 'text-amber-500', chartColor: '#F59E0B' },
  { name: 'Ophthalmology', icon: Eye, color: 'text-cyan-500', chartColor: '#06B6D4' },
  { name: 'Dermatology', icon: Smile, color: 'text-orange-500', chartColor: '#F97316' },
  { name: 'Urology', icon: Droplets, color: 'text-blue-400', chartColor: '#60A5FA' },
  { name: 'Gastroenterology', icon: Activity, color: 'text-lime-500', chartColor: '#84CC16' },
  { name: 'Pulmonology', icon: Wind, color: 'text-sky-500', chartColor: '#0EA5E9' },
  { name: 'Nephrology', icon: Droplets, color: 'text-indigo-500', chartColor: '#6366F1' },
  { name: 'Oncology', icon: Shield, color: 'text-rose-500', chartColor: '#F43F5E' },
  { name: 'Psychiatry', icon: Brain, color: 'text-violet-500', chartColor: '#8B5CF6' },
  { name: 'Dental', icon: Smile, color: 'text-emerald-500', chartColor: '#10B981' },
  { name: 'Physiotherapy', icon: Activity, color: 'text-teal-400', chartColor: '#2DD4BF' },
  { name: 'Other', icon: Pill, color: 'text-muted-foreground', chartColor: '#6B7280' },
];

export const DEPARTMENT_NAMES = DEPARTMENTS.map(d => d.name);

export function getDeptConfig(name: string): DepartmentConfig {
  return DEPARTMENTS.find(d => d.name === name) || DEPARTMENTS[DEPARTMENTS.length - 1];
}
