
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Pill, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const AuthOTP = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { verifyAccount } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    // Get email from navigation state if available
    const state = location.state as { email?: string };
    if (state?.email) {
      setEmail(state.email);
    }
  }, [location]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  const { resendCode } = useAuth();

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    const { error, message } = await resendCode(email);
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      toast({ title: "OTP Resent", description: message || "Check your email for the new code." });
      setResendCooldown(60);
    }
    setIsResending(false);
  };

  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const { error, user } = await verifyAccount(email, code);

    if (error) {
      setError(error);
      toast({
        title: "Verification failed",
        description: error,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success!",
        description: user ? "Your account is verified and you are signed in." : "Account verified! You can now log in."
      });
      
      if (user) {
        // Redirect to role-specific dashboard
        const role = (user.role || '').toString().toLowerCase();
        const target = role === 'provider' ? '/provider' : role === 'doctor' ? '/doctor' : role === 'admin' ? '/admin' : '/dashboard';
        navigate(target);
      } else {
        navigate('/auth');
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/auth" className="inline-flex items-center text-primary hover:text-primary/80 mb-6 transition-all font-bold text-sm uppercase tracking-widest">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to Login
          </Link>
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
              <Pill className="h-7 w-7 text-primary-foreground" />
            </div>
            <span className="text-2xl font-black text-foreground tracking-tighter">ChronicCare</span>
          </div>
          <h1 className="text-3xl font-black text-foreground mb-2 tracking-tight">Security Check</h1>
          <p className="text-muted-foreground font-medium">Verify your email to activate your account</p>
        </div>

        <Card className="bg-white border-border shadow-2xl rounded-3xl overflow-hidden ring-1 ring-black/[0.03]">
          <CardHeader className="bg-slate-50/50 border-b border-border/50 pb-8 pt-8">
            <CardTitle className="text-foreground text-center font-black uppercase text-xs tracking-[0.2em] opacity-60">Identity Verification</CardTitle>
            <CardDescription className="text-center text-slate-600 font-bold mt-2">
              We've dispatched a secure 6-digit code to <span className="text-primary">{email || 'your inbox'}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Verified Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@site.com"
                  required
                  className="bg-slate-50 border-border text-foreground h-12 rounded-xl focus:ring-primary/40 focus:border-primary font-bold px-4 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Access Code</Label>
                <Input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                  required
                  className="bg-slate-100 border-border text-foreground text-center text-3xl font-black h-20 rounded-2xl focus:ring-primary/40 focus:border-primary tracking-[0.5em] transition-all shadow-inner"
                  maxLength={6}
                />
              </div>
              {error && <div className="text-red-600 font-bold text-xs bg-red-50 p-3 rounded-xl border border-red-100 flex items-center">{error}</div>}
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary-hover text-white font-black uppercase tracking-widest h-14 rounded-2xl shadow-xl shadow-primary/25 transition-all active:scale-95 mt-4"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Authorize Account'}
              </Button>
              <div className="text-center mt-6">
                <p className="text-sm font-medium text-slate-500">
                  Didn't get the secure code?{' '}
                  <button 
                    type="button" 
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || isResending}
                    className={`font-black uppercase text-[10px] tracking-widest transition-all ${resendCooldown > 0 || isResending ? 'text-slate-300 cursor-not-allowed' : 'text-primary hover:text-primary-hover hover:underline'}`}
                  >
                    {isResending ? 'Sending...' : resendCooldown > 0 ? `Retry in ${resendCooldown}s` : 'Request New Code'}
                  </button>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthOTP;
