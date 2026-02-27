import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, Loader2, Save, FileSpreadsheet, Webhook } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

export default function ConfigPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    hospital_name: '',
    google_sheet_leads_url: '',
    google_sheet_opd_url: '',
    google_sheet_ipd_url: '',
    webhook_lead_url: '',
    webhook_update_url: '',
    webhook_opd_new_url: '',
    webhook_opd_update_url: '',
  });

  useEffect(() => {
    if (profile) {
      setForm({
        hospital_name: profile.hospital_name || '',
        google_sheet_leads_url: profile.google_sheet_leads_url || '',
        google_sheet_opd_url: profile.google_sheet_opd_url || '',
        google_sheet_ipd_url: profile.google_sheet_ipd_url || '',
        webhook_lead_url: profile.webhook_lead_url || '',
        webhook_update_url: profile.webhook_update_url || '',
        webhook_opd_new_url: profile.webhook_opd_new_url || '',
        webhook_opd_update_url: profile.webhook_opd_update_url || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({
        ...form,
        is_configured: true,
      }).eq('user_id', user.id);

      if (error) throw error;
      await refreshProfile();
      toast({ title: 'Configuration saved!', description: 'Aapka data ab load hoga.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="min-h-screen bg-background bg-grid-pattern p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="mx-auto w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center glow-blue mb-4">
            <Activity className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">MedCRM Pro</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Apne hospital ke Google Sheet URLs aur Webhook URLs configure karein
          </p>
        </motion.div>

        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Hospital & Google Sheets
            </CardTitle>
            <CardDescription>Apne hospital ka naam aur Google Sheet ke published CSV links dalein</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Hospital Name</Label>
              <Input value={form.hospital_name} onChange={e => update('hospital_name', e.target.value)} placeholder="e.g. Ortho Neuro Hospital" />
            </div>
            <div className="space-y-2">
              <Label>Leads Google Sheet URL (CSV export link)</Label>
              <Input value={form.google_sheet_leads_url} onChange={e => update('google_sheet_leads_url', e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv" />
            </div>
            <div className="space-y-2">
              <Label>OPD Reminder Google Sheet URL</Label>
              <Input value={form.google_sheet_opd_url} onChange={e => update('google_sheet_opd_url', e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv" />
            </div>
            <div className="space-y-2">
              <Label>IPD Follow-up Google Sheet URL</Label>
              <Input value={form.google_sheet_ipd_url} onChange={e => update('google_sheet_ipd_url', e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Webhook className="h-5 w-5 text-secondary" />
              Webhook URLs (n8n / Automation)
            </CardTitle>
            <CardDescription>Optional: n8n ya kisi bhi automation tool ke webhook URLs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>New Lead Webhook</Label>
              <Input value={form.webhook_lead_url} onChange={e => update('webhook_lead_url', e.target.value)} placeholder="https://n8n.example.com/webhook/lead" />
            </div>
            <div className="space-y-2">
              <Label>Update Lead Webhook</Label>
              <Input value={form.webhook_update_url} onChange={e => update('webhook_update_url', e.target.value)} placeholder="https://n8n.example.com/webhook/update" />
            </div>
            <div className="space-y-2">
              <Label>New OPD Webhook</Label>
              <Input value={form.webhook_opd_new_url} onChange={e => update('webhook_opd_new_url', e.target.value)} placeholder="https://n8n.example.com/webhook/opd-new" />
            </div>
            <div className="space-y-2">
              <Label>Update OPD Webhook</Label>
              <Input value={form.webhook_opd_update_url} onChange={e => update('webhook_opd_update_url', e.target.value)} placeholder="https://n8n.example.com/webhook/opd-update" />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} className="w-full" size="lg" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Configuration & Enter CRM
        </Button>
      </div>
    </div>
  );
}
