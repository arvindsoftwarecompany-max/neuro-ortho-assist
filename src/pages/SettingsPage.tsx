import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Users, Activity, Shield, FileSpreadsheet, Webhook, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
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
      toast({ title: 'Settings saved!', description: 'Configuration update ho gayi.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="space-y-6 pt-12 lg:pt-0 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure your CRM preferences</p>
      </motion.div>

      <div className="space-y-4">
        {[
          { icon: Building2, title: 'Hospital Settings', desc: 'Hospital name, logo, contact details' },
          { icon: Users, title: 'Employee Management', desc: 'Add, edit, and manage staff members' },
          { icon: Activity, title: 'Department Configuration', desc: 'Manage departments and specialties' },
          { icon: Shield, title: 'Data & Backup', desc: 'Export data, manage backups' },
        ].map(item => (
          <div key={item.title} className="glass-card-hover p-5 cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

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
        Save Configuration
      </Button>

      <div className="glass-card p-5 text-center">
        <p className="text-xs text-muted-foreground">MedCRM Pro v1.0</p>
      </div>
    </div>
  );
}
