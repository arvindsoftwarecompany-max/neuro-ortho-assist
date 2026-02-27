import { motion } from 'framer-motion';
import { Activity, Building2, Users, Shield } from 'lucide-react';

export default function SettingsPage() {
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

      <div className="glass-card p-5 text-center">
        <p className="text-xs text-muted-foreground">MedCRM Pro v1.0</p>
        <p className="text-xs text-muted-foreground mt-1">Connect to Lovable Cloud for full backend support</p>
      </div>
    </div>
  );
}
