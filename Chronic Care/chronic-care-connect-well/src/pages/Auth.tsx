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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Pill className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">ChronicCare</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome</h1>
          <p className="text-gray-400">Sign in to your account or create a new one</p>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-center">Get Started</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'signin' | 'signup')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-700">
                <TabsTrigger value="signin" className="text-white data-[state=active]:bg-blue-600">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="text-white data-[state=active]:bg-blue-600">
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4 mt-6">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <Label htmlFor="signin-username" className="text-gray-300">Username or Email</Label>
                    <Input
                      id="signin-username"
                      name="username"
                      type="text"
                      required
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Username or email address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="signin-password" className="text-gray-300">Password</Label>
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      required
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Enter your password"
                    />
                  </div>
                  {signinError && <div className="text-red-400 text-sm mb-2">{signinError}</div>}
                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-6">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="signup-firstName" className="text-gray-300">First Name</Label>
                      <Input id="signup-firstName" name="firstName" type="text" required className="bg-gray-700 border-gray-600 text-white" placeholder="First name" />
                    </div>
                    <div>
                      <Label htmlFor="signup-lastName" className="text-gray-300">Last Name</Label>
                      <Input id="signup-lastName" name="lastName" type="text" required className="bg-gray-700 border-gray-600 text-white" placeholder="Last name" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="signup-idCard" className="text-gray-300">ID Card</Label>
                      <Input id="signup-idCard" name="idCard" type="text" required className="bg-gray-700 border-gray-600 text-white" placeholder="National ID (16 digits)" />
                    </div>
                    <div>
                      <Label htmlFor="signup-phone" className="text-gray-300">Phone</Label>
                      <Input id="signup-phone" name="phone" type="text" required className="bg-gray-700 border-gray-600 text-white" placeholder="Phone number" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="signup-username" className="text-gray-300">Username</Label>
                      <Input id="signup-username" name="username" type="text" required className="bg-gray-700 border-gray-600 text-white" placeholder="Choose username" />
                    </div>
                    <div>
                      <Label htmlFor="signup-email" className="text-gray-300">Email</Label>
                      <Input id="signup-email" name="email" type="email" required className="bg-gray-700 border-gray-600 text-white" placeholder="Email address" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="signup-password" className="text-gray-300">Password</Label>
                      <Input id="signup-password" name="password" type="password" required className="bg-gray-700 border-gray-600 text-white" placeholder="Create password" />
                    </div>
                    <div>
                      <Label htmlFor="signup-confirmPassword" className="text-gray-300">Confirm Password</Label>
                      <Input id="signup-confirmPassword" name="confirmPassword" type="password" required className="bg-gray-700 border-gray-600 text-white" placeholder="Confirm password" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="signup-role" className="text-gray-300">Role</Label>
                    <select id="signup-role" name="role" required className="bg-gray-700 border-gray-600 text-white w-full rounded-md p-2">
                      <option value="Patient">Patient</option>
                      <option value="Provider">Provider (Pharmacy)</option>
                      <option value="Doctor">Doctor</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="signup-dobDay" className="text-gray-300">Day</Label>
                      <select id="signup-dobDay" name="dobDay" required className="bg-gray-700 border-gray-600 text-white w-full rounded-md p-2">
                        {[...Array(31)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="signup-dobMonth" className="text-gray-300">Month</Label>
                      <select id="signup-dobMonth" name="dobMonth" required className="bg-gray-700 border-gray-600 text-white w-full rounded-md p-2">
                        {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="signup-dobYear" className="text-gray-300">Year</Label>
                      <select id="signup-dobYear" name="dobYear" required className="bg-gray-700 border-gray-600 text-white w-full rounded-md p-2">
                        {[...Array(100)].map((_, i) => <option key={i} value={2025-i}>{2025-i}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-300">Gender</Label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center text-gray-300">
                        <input type="radio" name="gender" value="Female" required className="mr-2" /> Female
                      </label>
                      <label className="flex items-center text-gray-300">
                        <input type="radio" name="gender" value="Male" required className="mr-2" /> Male
                      </label>
                    </div>
                  </div>
                  {/* Notification method and Mobile phone number fields removed as requested */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="signup-province" className="text-gray-300">Province</Label>
                      <Input id="signup-province" name="province" type="text" required className="bg-gray-700 border-gray-600 text-white" placeholder="Select Province" />
                    </div>
                    <div>
                      <Label htmlFor="signup-district" className="text-gray-300">District</Label>
                      <Input id="signup-district" name="district" type="text" required className="bg-gray-700 border-gray-600 text-white" placeholder="Select District" />
                    </div>
                    <div>
                      <Label htmlFor="signup-sector" className="text-gray-300">Sector</Label>
                      <Input id="signup-sector" name="sector" type="text" required className="bg-gray-700 border-gray-600 text-white" placeholder="Select Sector" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="signup-cell" className="text-gray-300">Cell</Label>
                      <Input id="signup-cell" name="cell" type="text" required className="bg-gray-700 border-gray-600 text-white" placeholder="Cell" />
                    </div>
                    <div>
                      <Label htmlFor="signup-village" className="text-gray-300">Village</Label>
                      <Input id="signup-village" name="village" type="text" required className="bg-gray-700 border-gray-600 text-white" placeholder="Village" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="signup-profilePhoto" className="text-gray-300">Profile Photo</Label>
                    <Input id="signup-profilePhoto" name="profilePhoto" type="file" className="bg-gray-700 border-gray-600 text-white" />
                  </div>
                  {signupError && <div className="text-red-400 text-sm mb-2">{signupError}</div>}
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                    {isLoading ? 'Creating account...' : 'Create Account'}
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
