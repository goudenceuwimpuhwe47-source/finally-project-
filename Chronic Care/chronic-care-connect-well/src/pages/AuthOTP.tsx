
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

  useEffect(() => {
    // Get email from navigation state if available
    const state = location.state as { email?: string };
    if (state?.email) {
      setEmail(state.email);
    }
  }, [location]);

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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/auth" className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Link>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Pill className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">ChronicCare</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Verify Your Account</h1>
          <p className="text-gray-400">Enter the verification code sent to your email</p>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-center">Enter OTP</CardTitle>
            <CardDescription className="text-center text-gray-400">
              We've sent a 6-digit code to {email || 'your email'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code" className="text-gray-300">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  required
                  className="bg-gray-700 border-gray-600 text-white text-center text-2xl tracking-widest"
                  maxLength={6}
                />
              </div>
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 h-11"
                disabled={isLoading}
              >
                {isLoading ? 'Verifying...' : 'Verify & Continue'}
              </Button>
              <div className="text-center mt-4">
                <p className="text-sm text-gray-400">
                  Didn't receive the code?{' '}
                  <button type="button" className="text-blue-400 hover:text-blue-300 font-medium">
                    Resend Code
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
