import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Lightbulb, Eye, EyeOff, AtSign, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { authRateLimiter, validateEmail, validatePassword, logSecurityEvent } from '@/utils/security';
import { supabase } from '@/integrations/supabase/client';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [takenByVerified, setTakenByVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  // Check username availability with debounce
  useEffect(() => {
    const checkUsername = async () => {
      const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
      
      if (!cleanUsername || cleanUsername.length < 3) {
        setUsernameStatus('idle');
        return;
      }

      setUsernameStatus('checking');

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, is_verified')
          .eq('username', cleanUsername)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setUsernameStatus('taken');
          setTakenByVerified(data.is_verified || false);
        } else {
          setUsernameStatus('available');
          setTakenByVerified(false);
        }
      } catch (error) {
        console.error('Username check error:', error);
        setUsernameStatus('idle');
      }
    };

    const debounce = setTimeout(checkUsername, 500);
    return () => clearTimeout(debounce);
  }, [username]);

  const handleEmailAuth = async (isSignUp: boolean) => {
    // Enhanced validation
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    // Username validation for sign up
    if (isSignUp) {
      const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
      if (!cleanUsername || cleanUsername.length < 3) {
        toast({
          title: "Error",
          description: "Username must be at least 3 characters",
          variant: "destructive",
        });
        return;
      }

      if (usernameStatus === 'taken') {
        toast({
          title: "Error",
          description: "This username is already taken",
          variant: "destructive",
        });
        return;
      }

      if (usernameStatus === 'checking') {
        toast({
          title: "Please wait",
          description: "Checking username availability...",
          variant: "destructive",
        });
        return;
      }
    }

    // Rate limiting check
    const rateLimitKey = `auth_${email}`;
    if (authRateLimiter.isRateLimited(rateLimitKey)) {
      const remainingTime = Math.ceil(authRateLimiter.getRemainingTime(rateLimitKey) / 1000 / 60);
      logSecurityEvent('rate_limit_exceeded', { email, action: isSignUp ? 'signup' : 'signin' });
      toast({
        title: "Too many attempts",
        description: `Please wait ${remainingTime} minutes before trying again`,
        variant: "destructive",
      });
      return;
    }

    // Email validation
    if (!validateEmail(email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    // Password validation for sign up
    if (isSignUp) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        toast({
          title: "Error",
          description: passwordValidation.message,
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    
    if (isSignUp) {
      const { error } = await signUp(email, password);
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Update profile with username after signup
      const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
      const { data: { user: newUser } } = await supabase.auth.getUser();
      if (newUser) {
        await supabase
          .from('profiles')
          .update({ username: cleanUsername })
          .eq('user_id', newUser.id);
      }

      toast({
        title: "Success",
        description: "Account created! Check your email to verify.",
      });
    } else {
      const { error } = await signIn(email, password);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Welcome back!",
        });
        navigate(from, { replace: true });
      }
    }
    setLoading(false);
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Lightbulb className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Idestrim
            </span>
          </div>
          <CardTitle>Welcome to Idestrim</CardTitle>
          <CardDescription>
            Join our community and share your ideas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <div className="relative">
                  <Input
                    id="signin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => handleEmailAuth(false)}
                disabled={loading}
                variant="innovation"
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
              
              <div className="text-center">
                <Link to="/forgot-password">
                  <Button variant="link" className="text-sm text-primary hover:underline p-0">
                    Forgot your password?
                  </Button>
                </Link>
              </div>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              {/* Username field with availability check */}
              <div className="space-y-2">
                <Label htmlFor="signup-username">Username</Label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9 pr-10"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {usernameStatus === 'checking' && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {usernameStatus === 'available' && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    {usernameStatus === 'taken' && (
                      <div className="flex items-center gap-1">
                        {takenByVerified && <VerifiedBadge size="sm" />}
                        <XCircle className="h-4 w-4 text-red-500" />
                      </div>
                    )}
                  </div>
                </div>
                {usernameStatus === 'available' && (
                  <p className="text-xs text-green-500">Username is available!</p>
                )}
                {usernameStatus === 'taken' && (
                  <p className="text-xs text-red-500">
                    This username is taken{takenByVerified ? ' (Verified account)' : ''}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => handleEmailAuth(true)}
                disabled={loading || usernameStatus === 'checking' || usernameStatus === 'taken'}
                variant="innovation"
              >
                {loading ? "Creating account..." : "Sign Up"}
              </Button>
            </TabsContent>
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleAuth}
            disabled={loading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {loading ? "Connecting..." : "Continue with Google"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}