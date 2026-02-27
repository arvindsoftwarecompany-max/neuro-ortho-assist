import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        toast({ title: 'Login successful!' });
      } else {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').update({
            hospital_name: hospitalName,
            owner_name: ownerName,
          }).eq('user_id', user.id);
        }

        toast({ title: 'Registration successful!', description: 'Aap ab login kar sakte hain.' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background bg-grid-pattern p-4">
      <Card className="w-full max-w-md glass-card border-border/50">
        <CardHeader className="text-center space-y-3 pb-4">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center glow-blue">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl sm:text-2xl gradient-text">MedCRM Pro</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {isLogin ? 'Apne account mein login karein' : 'Apne hospital ka naya account banayein'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="hospitalName" className="text-xs">Hospital Name</Label>
                  <Input
                    id="hospitalName"
                    placeholder="e.g. Ortho Neuro Hospital"
                    value={hospitalName}
                    onChange={e => setHospitalName(e.target.value)}
                    required={!isLogin}
                    autoComplete="organization"
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ownerName" className="text-xs">Owner / Admin Name</Label>
                  <Input
                    id="ownerName"
                    placeholder="e.g. Dr. Sharma"
                    value={ownerName}
                    onChange={e => setOwnerName(e.target.value)}
                    required={!isLogin}
                    autoComplete="name"
                    className="h-10 text-sm"
                  />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isLogin ? "current-password" : "new-password"}
                className="h-11 text-base"
              />
            </div>
            <Button type="submit" className="w-full h-11 text-sm font-semibold mt-2" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLogin ? 'Login' : 'Register'}
            </Button>
          </form>
          <div className="mt-4 text-center text-xs sm:text-sm text-muted-foreground">
            {isLogin ? 'Account nahi hai?' : 'Pehle se account hai?'}{' '}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline font-medium"
            >
              {isLogin ? 'Register karein' : 'Login karein'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
