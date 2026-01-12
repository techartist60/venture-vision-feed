import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, Search, CheckCircle2, XCircle, AtSign, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';

interface UsernameResult {
  username: string;
  isAvailable: boolean;
  isVerified: boolean;
  suggestions?: string[];
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export default function UsernameChecker() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UsernameResult | null>(null);

  const generateSuggestions = (baseUsername: string): string[] => {
    const suggestions: string[] = [];
    const cleanName = baseUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Add number suffixes
    suggestions.push(`${cleanName}01`);
    suggestions.push(`${cleanName}${Math.floor(Math.random() * 999)}`);
    suggestions.push(`${cleanName}_official`);
    suggestions.push(`the_${cleanName}`);
    suggestions.push(`${cleanName}.io`);
    suggestions.push(`${cleanName}_hq`);
    
    return suggestions.slice(0, 5);
  };

  const checkUsername = async () => {
    if (!username.trim()) return;

    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
    
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, full_name, avatar_url, is_verified')
        .eq('username', cleanUsername)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Username is taken
        setResult({
          username: cleanUsername,
          isAvailable: false,
          isVerified: data.is_verified || false,
          profile: {
            full_name: data.full_name,
            avatar_url: data.avatar_url,
          },
          suggestions: generateSuggestions(cleanUsername),
        });
      } else {
        // Username is available
        setResult({
          username: cleanUsername,
          isAvailable: true,
          isVerified: false,
        });
      }
    } catch (error) {
      console.error('Username check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      checkUsername();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AtSign className="h-5 w-5 text-primary" />
          Username Checker
        </CardTitle>
        <CardDescription>
          Check if a username is available on Idestrim
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                placeholder="Enter username to check"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9"
              />
            </div>
            <Button onClick={checkUsername} disabled={loading || !username.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {result && (
          <div className="space-y-4 animate-in fade-in-50">
            {/* Result Card */}
            <div className={`p-4 rounded-lg border ${
              result.isAvailable 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-amber-500/10 border-amber-500/30'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-lg">@{result.username}</span>
                    {!result.isAvailable && result.isVerified && (
                      <VerifiedBadge size="sm" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Availability:</span>
                    {result.isAvailable ? (
                      <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Available
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-500 border-red-500/30">
                        <XCircle className="h-3 w-3 mr-1" />
                        Taken
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm mt-1">
                    <span className="font-medium">Check badge:</span>
                    {!result.isAvailable && result.isVerified ? (
                      <Badge className="bg-primary/20 text-primary border-primary/30">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        <XCircle className="h-3 w-3 mr-1" />
                        Not shown
                      </Badge>
                    )}
                  </div>

                  {!result.isAvailable && result.profile?.full_name && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Used by: {result.profile.full_name}
                    </p>
                  )}
                </div>

                <div className={`p-2 rounded-full ${
                  result.isAvailable ? 'bg-green-500/20' : 'bg-amber-500/20'
                }`}>
                  {result.isAvailable ? (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  ) : (
                    <XCircle className="h-6 w-6 text-amber-500" />
                  )}
                </div>
              </div>
            </div>

            {/* Suggestions for taken usernames */}
            {!result.isAvailable && result.suggestions && result.suggestions.length > 0 && (
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Available Alternatives</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.suggestions.map((suggestion, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 transition-colors"
                      onClick={() => {
                        setUsername(suggestion);
                        setResult(null);
                      }}
                    >
                      @{suggestion}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {result.isAvailable && (
              <p className="text-sm text-center text-muted-foreground">
                This username is available! You can use it on Idestrim.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
