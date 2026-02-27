import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Shield, Users, LogOut, Loader2, ToggleLeft, ToggleRight, Clock, Search,
  Building2, Mail, Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

interface UserProfile {
  id: string;
  user_id: string;
  hospital_name: string;
  owner_name: string;
  phone: string;
  is_active: boolean;
  is_configured: boolean;
  trial_days: number;
  trial_start: string;
  created_at: string;
  email?: string;
}

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndLoad();
  }, [user]);

  const checkAdminAndLoad = async () => {
    if (!user) return;
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      navigate('/');
      return;
    }
    loadUsers();
  };

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setUsers((data as any[]) || []);
    }
    setLoading(false);
  };

  const toggleActive = async (profile: UserProfile) => {
    setUpdatingId(profile.id);
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !profile.is_active } as any)
      .eq('id', profile.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({
        title: profile.is_active ? 'User Deactivated' : 'User Activated',
        description: `${profile.hospital_name || 'User'} ka account ${profile.is_active ? 'deactivate' : 'activate'} ho gaya.`
      });
      loadUsers();
    }
    setUpdatingId(null);
  };

  const updateTrialDays = async (profile: UserProfile, days: number) => {
    setUpdatingId(profile.id);
    const { error } = await supabase
      .from('profiles')
      .update({ trial_days: days } as any)
      .eq('id', profile.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Trial Updated', description: `${days} din ka trial set ho gaya.` });
      loadUsers();
    }
    setUpdatingId(null);
  };

  const getTrialStatus = (profile: UserProfile) => {
    if (!profile.trial_start) return { expired: false, remaining: profile.trial_days };
    const start = new Date(profile.trial_start);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const remaining = profile.trial_days - diffDays;
    return { expired: remaining <= 0, remaining: Math.max(0, remaining) };
  };

  const filteredUsers = users.filter(u =>
    (u.hospital_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.owner_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.user_id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = async () => {
    await signOut();
    navigate('/admin');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-grid-pattern">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/20">
              <Shield className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">Manage all registered hospitals</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: users.length, icon: Users },
            { label: 'Active', value: users.filter(u => u.is_active).length, icon: ToggleRight },
            { label: 'Deactivated', value: users.filter(u => !u.is_active).length, icon: ToggleLeft },
            { label: 'Trial Expired', value: users.filter(u => getTrialStatus(u).expired).length, icon: Clock },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="glass-card border-border/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hospital ya owner name se search karein..."
            className="pl-10"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Users List */}
        <div className="space-y-4">
          {filteredUsers.map((profile, i) => {
            const trial = getTrialStatus(profile);
            return (
              <motion.div key={profile.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className={`glass-card border-border/50 ${!profile.is_active ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* User Info */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold text-foreground">
                            {profile.hospital_name || 'No Hospital Name'}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            profile.is_active 
                              ? 'bg-primary/20 text-primary' 
                              : 'bg-destructive/20 text-destructive'
                          }`}>
                            {profile.is_active ? 'Active' : 'Deactivated'}
                          </span>
                          {trial.expired && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground">
                              Trial Expired
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {profile.owner_name || 'N/A'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {profile.user_id}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Joined: {format(new Date(profile.created_at), 'dd MMM yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Trial: {trial.remaining} din baaki
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            max={365}
                            className="w-20 h-8 text-sm"
                            value={profile.trial_days}
                            onChange={e => {
                              const val = parseInt(e.target.value) || 0;
                              setUsers(prev => prev.map(u => u.id === profile.id ? { ...u, trial_days: val } : u));
                            }}
                            onBlur={e => {
                              const val = parseInt(e.target.value) || 0;
                              updateTrialDays(profile, val);
                            }}
                          />
                          <span className="text-xs text-muted-foreground">days</span>
                        </div>
                        <Button
                          size="sm"
                          variant={profile.is_active ? 'destructive' : 'default'}
                          onClick={() => toggleActive(profile)}
                          disabled={updatingId === profile.id}
                        >
                          {updatingId === profile.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : profile.is_active ? (
                            <><ToggleLeft className="h-3 w-3" /> Deactivate</>
                          ) : (
                            <><ToggleRight className="h-3 w-3" /> Activate</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
          {filteredUsers.length === 0 && (
            <Card className="glass-card border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                Koi user nahi mila.
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
