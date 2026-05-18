import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatMessage {
  timestamp: string;
  mobile: string;
  patient_name: string;
  sender: string;
  message: string;
  raw: Record<string, string>;
}

function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    if (row[i] === '"') inQuotes = !inQuotes;
    else if (row[i] === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else current += row[i];
  }
  result.push(current.trim());
  return result;
}

function normalizeMobile(m: string): string {
  const digits = (m || '').replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function useChatData() {
  const { profile } = useAuth();
  const csvUrl = profile?.google_sheet_chat_url || '';
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!csvUrl) {
      setError('Google Chat Sheet URL configure nahi hai');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error('Failed to fetch');
      const text = await res.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { setMessages([]); return; }
      const headers = parseCSVRow(lines[0]).map(h => h.toLowerCase().replace(/[_\s]/g, ''));
      const get = (values: string[], name: string) => {
        const idx = headers.findIndex(h => h === name.toLowerCase().replace(/[_\s]/g, ''));
        return idx >= 0 ? (values[idx] || '').trim() : '';
      };
      const parsed: ChatMessage[] = [];
      lines.slice(1).forEach(line => {
        const values = parseCSVRow(line);
        const raw: Record<string, string> = {};
        headers.forEach((h, i) => { raw[h] = values[i] || ''; });
        const timestamp = get(values, 'timestamp') || get(values, 'date') || get(values, 'time') || '';
        const mobile = get(values, 'mobile') || get(values, 'phone') || get(values, 'mobileno') || '';
        const patient_name = get(values, 'patientname') || get(values, 'name') || '';
        const question = get(values, 'question') || get(values, 'query') || get(values, 'patientmessage') || '';
        const reply = get(values, 'reply') || get(values, 'response') || get(values, 'answer') || '';
        const single = get(values, 'message') || get(values, 'chat') || get(values, 'note') || get(values, 'remarks') || '';

        if (question || reply) {
          if (question) parsed.push({ timestamp, mobile, patient_name, sender: 'Patient', message: question, raw });
          if (reply) parsed.push({ timestamp, mobile, patient_name, sender: 'Staff', message: reply, raw });
        } else {
          parsed.push({
            timestamp, mobile, patient_name,
            sender: get(values, 'sender') || get(values, 'from') || get(values, 'by') || 'Staff',
            message: single,
            raw,
          });
        }
      });
      setMessages(parsed);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Error loading chat');
    } finally {
      setLoading(false);
    }
  }, [csvUrl]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getMessagesForMobile = (mobile: string): ChatMessage[] => {
    const target = normalizeMobile(mobile);
    if (!target) return [];
    return messages.filter(m => normalizeMobile(m.mobile) === target);
  };

  return { messages, loading, error, fetchData, getMessagesForMobile, configured: !!csvUrl };
}
