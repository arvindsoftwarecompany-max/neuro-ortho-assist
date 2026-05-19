import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface Profile {
  hospital_name: string;
  owner_name: string;
  phone: string;
  google_sheet_leads_url: string;
  google_sheet_opd_url: string;
  google_sheet_ipd_url: string;
  google_sheet_chat_url: string;
  webhook_lead_url: string;
  webhook_update_url: string;
  webhook_opd_new_url: string;
  webhook_opd_update_url: string;
  is_configured: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (data) {
      // Admins bypass active/trial checks
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      const isAdmin = !!roleData;

      if (!isAdmin) {
        if (data.is_active === false) {
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
          setProfile(null);
          setLoading(false);
          setTimeout(() => {
            alert('Aapka account abhi activate nahi hua hai. Admin se sampark karein.');
          }, 100);
          return;
        }

        // Trial expiry check
        if (data.trial_start && data.trial_days != null) {
          const start = new Date(data.trial_start).getTime();
          const diffDays = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24));
          if (diffDays >= data.trial_days) {
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
            setProfile(null);
            setLoading(false);
            setTimeout(() => {
              alert('Aapka trial period khatam ho gaya hai. Admin se sampark karein.');
            }, 100);
            return;
          }
        }
      }
      setProfile(data);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
