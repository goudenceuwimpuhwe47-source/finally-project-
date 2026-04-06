import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { Pill, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_URL } from '@/lib/utils';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user, signUp, signIn, loading } = useAuth();
  const [signinError, setSigninError] = useState('');
  const [signupError, setSignupError] = useState('');
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const navigate = useNavigate();

  // Redirect if already logged in
  const location = useLocation();

  useEffect(() => {
    // Wait until auth restore is finished. Only navigate when we have a user
    // and the app is still on the auth page (prevents rapid cross-navigation).
    if (loading) return;
    if (!user) return;

    const role = (user.role || '').toString().toLowerCase();
    const target = role === 'provider' ? '/provider' : role === 'doctor' ? '/doctor' : role === 'admin' ? '/admin' : '/dashboard';

    // Only navigate if we're still on an auth-related route to avoid loops.
    const currentPath = String(location.pathname || '');
    if (currentPath === '/auth' || currentPath === '/' || currentPath === '') {
      if (currentPath !== String(target)) navigate(target);
    }
  }, [user, loading, navigate, location.pathname]);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setSignupError('');
    const formData = new FormData(e.currentTarget);
    const data = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      idCard: formData.get('idCard') as string,
      phone: formData.get('phone') as string,
      username: formData.get('username') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirmPassword') as string,
      role: formData.get('role') as string,
      dateOfBirth: {
        day: formData.get('dobDay') as string,
        month: formData.get('dobMonth') as string,
        year: formData.get('dobYear') as string,
      },
      gender: formData.get('gender') as string,
      notificationMethod: formData.get('notificationMethod') ? 'sms' : '',
      mobilePhone: formData.get('mobilePhone') as string,
      province: formData.get('province') as string,
      district: formData.get('district') as string,
      sector: formData.get('sector') as string,
      cell: formData.get('cell') as string,
      village: formData.get('village') as string,
      profilePhoto: formData.get('profilePhoto') as File,
    };
    if (data.password !== data.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords don't match",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }
  const { error, email } = await signUp(data);
  if (error) {
      const errorMsg = typeof error === 'string' ? error : (error.message || 'Registration failed');
      setSignupError(errorMsg);
      toast({
        title: "Sign up failed",
        description: errorMsg,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success!",
        description: "Account created successfully. Please check your email for the verification code."
      });
      // Redirect to OTP verification page
      navigate('/auth/otp', { state: { email: email || data.email } });
    }
    setIsLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setSigninError('');
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const { error, user, notVerified, requiresOtp, email } = await signIn(username, password);
    if (requiresOtp) {
      toast({
        title: "OTP Required",
        description: "A verification code has been sent to your email.",
      });
      navigate('/auth/otp', { state: { email: email || '' } });
    } else if (notVerified) {
      // Account exists but email not yet verified — show the verification form
      toast({
        title: "Email not verified",
        description: "Please verify your email. Enter the code sent to your inbox.",
        variant: "destructive"
      });
      navigate('/auth/otp', { state: { email: email || '' } });
    } else if (error) {
      const errorMsg = typeof error === 'string' ? error : (error.message || 'Sign in failed');
      setSigninError(errorMsg);
      toast({
        title: "Sign in failed",
        description: errorMsg,
        variant: "destructive"
      });
    } else if (user) {
      toast({
        title: "Welcome back!",
        description: "Successfully signed in."
      });
  // Redirect to role-specific dashboard (case-insensitive)
  const role = (user.role || '').toString().toLowerCase();
  if (role === 'patient') navigate('/dashboard');
  else if (role === 'provider') navigate('/provider');
  else if (role === 'doctor') navigate('/doctor');
  else if (role === 'admin') navigate('/admin');
  else navigate('/dashboard');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center text-primary hover:text-primary/80 mb-6 transition-all font-bold text-sm uppercase tracking-widest">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return Home
          </Link>
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
              <Pill className="h-7 w-7 text-primary-foreground" />
            </div>
            <span className="text-2xl font-black text-foreground tracking-tighter">ChronicCare</span>
          </div>
          <h1 className="text-3xl font-black text-foreground mb-2 tracking-tight">Security Portal</h1>
          <p className="text-muted-foreground font-medium">Access your personalized health dashboard</p>
        </div>

        <Card className="bg-white border-border shadow-2xl rounded-3xl overflow-hidden ring-1 ring-black/[0.03]">
          <CardHeader className="bg-slate-50/50 border-b border-border/50 pb-6 pt-8">
            <CardTitle className="text-foreground text-center font-black uppercase text-xs tracking-[0.2em] opacity-60">Authentication Gateway</CardTitle>
          </CardHeader>
          <CardContent className="p-6 sm:p-8">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'signin' | 'signup')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1.5 rounded-2xl mb-8">
                <TabsTrigger value="signin" className="rounded-xl font-black text-xs uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg shadow-primary/20 transition-all">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="rounded-xl font-black text-xs uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg shadow-primary/20 transition-all">
                  Register
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4 mt-6">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-username" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Username or Email</Label>
                    <Input
                      id="signin-username"
                      name="username"
                      type="text"
                      required
                      className="bg-slate-50 border-border text-foreground h-12 rounded-xl focus:ring-primary/40 focus:border-primary font-bold px-4 transition-all"
                      placeholder="Your unique identifier"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Secret Password</Label>
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      required
                      className="bg-slate-50 border-border text-foreground h-12 rounded-xl focus:ring-primary/40 focus:border-primary font-bold px-4 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                  {signinError && <div className="text-red-600 font-bold text-xs bg-red-50 p-3 rounded-xl border border-red-100 flex items-center mb-4">{signinError}</div>}
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary-hover text-white font-black uppercase tracking-widest h-14 rounded-2xl shadow-xl shadow-primary/25 transition-all active:scale-95 mt-4"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Authenticating...' : 'Submit Credentials'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-6">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-firstName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">First Name</Label>
                      <Input id="signup-firstName" name="firstName" type="text" required className="bg-slate-50 border-border text-foreground h-11 rounded-xl focus:ring-primary font-bold" placeholder="First name" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-lastName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Last Name</Label>
                      <Input id="signup-lastName" name="lastName" type="text" required className="bg-slate-50 border-border text-foreground h-11 rounded-xl focus:ring-primary font-bold" placeholder="Last name" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-idCard" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">ID Card</Label>
                      <Input id="signup-idCard" name="idCard" type="text" required className="bg-slate-50 border-border text-foreground h-11 rounded-xl focus:ring-primary font-bold" placeholder="16 Digits" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-phone" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone</Label>
                      <Input id="signup-phone" name="phone" type="text" required className="bg-slate-50 border-border text-foreground h-11 rounded-xl focus:ring-primary font-bold" placeholder="WhatsApp/Call" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-username" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">User ID</Label>
                      <Input id="signup-username" name="username" type="text" required className="bg-slate-50 border-border text-foreground h-11 rounded-xl focus:ring-primary font-bold" placeholder="Unique ID" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email</Label>
                      <Input id="signup-email" name="email" type="email" required className="bg-slate-50 border-border text-foreground h-11 rounded-xl focus:ring-primary font-bold" placeholder="name@site.com" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Password</Label>
                      <Input id="signup-password" name="password" type="password" required className="bg-slate-50 border-border text-foreground h-11 rounded-xl focus:ring-primary font-bold" placeholder="••••••••" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-confirmPassword" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Verify</Label>
                      <Input id="signup-confirmPassword" name="confirmPassword" type="password" required className="bg-slate-50 border-border text-foreground h-11 rounded-xl focus:ring-primary font-bold" placeholder="••••••••" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-role" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Account Type</Label>
                    <select id="signup-role" name="role" required className="bg-slate-50 border border-border text-foreground text-sm font-bold w-full rounded-xl h-11 px-4 focus:ring-2 focus:ring-primary transition-all">
                      <option value="Patient">Standard Patient</option>
                      <option value="Provider">Pharmacy Provider</option>
                      <option value="Doctor">Medical Consultant</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-dobDay" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Day</Label>
                      <select id="signup-dobDay" name="dobDay" required className="bg-slate-50 border border-border text-foreground text-sm font-bold w-full rounded-xl h-11 px-4 focus:ring-2 focus:ring-primary transition-all">
                        {[...Array(31)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-dobMonth" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Month</Label>
                      <select id="signup-dobMonth" name="dobMonth" required className="bg-slate-50 border border-border text-foreground text-sm font-bold w-full rounded-xl h-11 px-4 focus:ring-2 focus:ring-primary transition-all">
                        {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-dobYear" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Year</Label>
                      <select id="signup-dobYear" name="dobYear" required className="bg-slate-50 border border-border text-foreground text-sm font-bold w-full rounded-xl h-11 px-4 focus:ring-2 focus:ring-primary transition-all">
                        {[...Array(100)].map((_, i) => <option key={i} value={2025-i}>{2025-i}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Biological Gender</Label>
                    <div className="flex gap-6 mt-1 ml-1">
                      <label className="flex items-center text-sm font-bold text-foreground cursor-pointer group">
                        <input type="radio" name="gender" value="Female" required className="mr-3 h-4 w-4 text-primary border-border focus:ring-primary bg-slate-50" /> 
                        <span className="group-hover:text-primary transition-colors">Female</span>
                      </label>
                      <label className="flex items-center text-sm font-bold text-foreground cursor-pointer group">
                        <input type="radio" name="gender" value="Male" required className="mr-3 h-4 w-4 text-primary border-border focus:ring-primary bg-slate-50" /> 
                        <span className="group-hover:text-primary transition-colors">Male</span>
                      </label>
                    </div>
                  </div>
                  {/* Notification method and Mobile phone number fields removed as requested */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-province" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Province</Label>
                      <Input id="signup-province" name="province" type="text" required className="bg-slate-50 border-border text-foreground h-11 rounded-xl focus:ring-primary font-bold px-3 text-xs" placeholder="Province" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-district" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">District</Label>
                      <Input id="signup-district" name="district" type="text" required className="bg-slate-50 border-border text-foreground h-11 rounded-xl focus:ring-primary font-bold px-3 text-xs" placeholder="District" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-sector" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Sector</Label>
                      <Input id="signup-sector" name="sector" type="text" required className="bg-slate-50 border-border text-foreground h-11 rounded-xl focus:ring-primary font-bold px-3 text-xs" placeholder="Sector" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-cell" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Cell</Label>
                      <Input id="signup-cell" name="cell" type="text" required className="bg-slate-50 border-border text-foreground h-11 rounded-xl focus:ring-primary font-bold" placeholder="Cell" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-village" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Village</Label>
                      <Input id="signup-village" name="village" type="text" required className="bg-slate-50 border-border text-foreground h-11 rounded-xl focus:ring-primary font-bold" placeholder="Village" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-profilePhoto" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Identification Photo</Label>
                    <Input id="signup-profilePhoto" name="profilePhoto" type="file" className="bg-slate-50 border-border text-foreground h-11 rounded-xl focus:ring-primary font-bold text-xs" />
                  </div>
                  {signupError && <div className="text-red-600 font-bold text-xs bg-red-50 p-3 rounded-xl border border-red-100 flex items-center mb-4">{signupError}</div>}
                  <Button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white font-black uppercase tracking-widest h-14 rounded-2xl shadow-xl shadow-primary/25 transition-all active:scale-95 mt-6" disabled={isLoading}>
                    {isLoading ? 'Processing...' : 'Create Secure Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
