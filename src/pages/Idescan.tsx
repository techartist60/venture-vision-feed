import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Scan, Sparkles, Image as ImageIcon, Globe, ArrowRight, Loader2 } from 'lucide-react';
import SignupPrompt from '@/components/SignupPrompt';

export default function Idescan() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [signupPrompt, setSignupPrompt] = useState(false);
  const [indexingData, setIndexingData] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);
  
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Page load animation trigger
  useEffect(() => {
    const timer = setTimeout(() => setPageLoaded(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Auto-index data sources on component mount
  useEffect(() => {
    const indexDataSources = async () => {
      try {
        setIndexingData(true);
        
        console.log('Force re-indexing innovation sources from external APIs...');
        
        const { data: countData } = await supabase
          .from('innovation_records')
          .select('*', { count: 'exact', head: true });
        
        console.log(`Current records in DB: ${countData || 0}`);
        
        const { error: indexError } = await supabase.functions.invoke('index-external-sources', {
          body: { sourceType: 'all' }
        });
        
        if (indexError) {
          console.error('Error indexing:', indexError);
        } else {
          console.log('Fresh data indexed successfully');
        }
      } catch (error) {
        console.error('Error checking/indexing data:', error);
      } finally {
        setIndexingData(false);
      }
    };

    indexDataSources();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image must be less than 10MB",
          variant: "destructive",
        });
        return;
      }
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setSignupPrompt(true);
      return;
    }

    if (!description.trim()) {
      toast({
        title: "Missing information",
        description: "Please describe your idea",
        variant: "destructive",
      });
      return;
    }

    if (description.trim().length < 50) {
      toast({
        title: "Need more details",
        description: "Please write at least 50 characters so we can find better matches",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      let imageUrl = null;

      // Upload image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('idescan-uploads')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('idescan-uploads')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      // Create scan record
      const { data: scan, error: scanError } = await supabase
        .from('idescan_scans')
        .insert({
          user_id: user.id,
          title: description.substring(0, 100) + (description.length > 100 ? '...' : ''),
          description: description,
          image_url: imageUrl,
          status: 'pending',
        })
        .select()
        .single();

      if (scanError) throw scanError;

      toast({
        title: "Searching!",
        description: "We're looking for similar ideas...",
      });

      // Trigger processing in background with auth headers
      const { data: { session } } = await supabase.auth.getSession();
      
      supabase.functions.invoke('process-idescan', {
        body: { scanId: scan.id },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      }).then(({ error }) => {
        if (error) {
          console.error('Processing error:', error);
          toast({
            title: "Note",
            description: "Search started but may take a bit longer",
            variant: "destructive",
          });
        }
      });

      // Navigate to scan results
      navigate(`/idescan/results/${scan.id}`);
    } catch (error) {
      console.error('Error creating scan:', error);
      toast({
        title: "Error",
        description: "Couldn't start the search. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-discovery pb-20 transition-all duration-500 ${pageLoaded ? 'opacity-100' : 'opacity-0'}`}>
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-10">
        <div className="px-4 py-4 max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-idescan">
                <Scan className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold">Idescan</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/idescan/history')}
              className="rounded-full"
            >
              History
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* WebScan Banner - Prominent at top */}
        <div className={`mb-6 transition-all duration-500 delay-100 ${pageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <Card 
            className="bg-gradient-to-r from-[hsl(265,65%,55%)/10] via-transparent to-[hsl(25,95%,60%)/10] border-[hsl(265,65%,55%)/20] cursor-pointer hover:shadow-lg transition-all duration-300 group"
            onClick={() => navigate('/idescan/webscan')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-idescan-warm">
                    <Globe className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm flex items-center gap-2">
                      WebScan
                      <span className="px-2 py-0.5 text-[10px] bg-[hsl(265,65%,55%)/20] text-[hsl(265,65%,55%)] rounded-full">New</span>
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Scan any website URL for competitors
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hero Section - Minimal */}
        <div className={`text-center mb-8 transition-all duration-700 delay-200 ${pageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <h2 className="text-2xl md:text-3xl font-bold mb-2">What's your idea?</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            We'll search patents, startups & innovations to find similar concepts
          </p>
        </div>

        {/* Main Input Area - Large & Central */}
        <div className={`transition-all duration-700 delay-200 ${pageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <Card className="shadow-idescan border-0 bg-card/80 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Description - Primary Focus */}
                <div className="space-y-3">
                  <Label htmlFor="description" className="text-base font-medium">
                    Describe your idea
                  </Label>
                  <div className="input-focus-glow rounded-xl transition-all duration-300">
                    <Textarea
                      id="description"
                      placeholder="Tell us what problem it solves, how it works, and who it's for..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={8}
                      className="resize-none border-2 border-muted/50 focus:border-[hsl(175,70%,45%)] rounded-xl text-base transition-colors duration-300"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Minimum 50 characters for best results
                  </p>
                </div>

                {/* Image Upload - Compact */}
                <div className="space-y-2">
                  <Label htmlFor="image" className="text-sm text-muted-foreground">
                    Add an image (optional)
                  </Label>
                  <div className="border-2 border-dashed border-muted/50 rounded-xl p-4 text-center hover:border-[hsl(175,70%,45%)/50] transition-all duration-300 input-focus-glow">
                    {imagePreview ? (
                      <div className="space-y-3">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="max-h-40 mx-auto rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview('');
                          }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label htmlFor="image" className="cursor-pointer block py-2">
                        <div className="flex items-center justify-center gap-3">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Click to add an image
                          </span>
                        </div>
                        <Input
                          id="image"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageChange}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Submit Button with Progress Animation */}
                <div className="pt-2">
                  {loading && (
                    <div className="h-1 rounded-full overflow-hidden mb-4 bg-muted">
                      <div className="h-full scan-progress-bar rounded-full" />
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading || indexingData}
                    className="idescan-button w-full relative group rounded-2xl px-8 py-4 bg-gradient-idescan text-white font-medium
                      transform transition-all duration-300 ease-out
                      hover:scale-[1.02] active:scale-[0.98]
                      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[hsl(175,70%,45%)]
                      disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100
                      overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {indexingData ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Preparing...
                        </>
                      ) : loading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Scanning...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5" />
                          Find Similar Ideas
                        </>
                      )}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                      translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out" />
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Info Cards - Minimal */}
        <div className={`grid grid-cols-3 gap-3 mt-8 transition-all duration-700 delay-400 ${pageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="text-center p-4 rounded-xl bg-muted/30">
            <p className="text-xs font-medium">Patents</p>
            <p className="text-[10px] text-muted-foreground mt-1">Global databases</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-muted/30">
            <p className="text-xs font-medium">Startups</p>
            <p className="text-[10px] text-muted-foreground mt-1">Worldwide</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-muted/30">
            <p className="text-xs font-medium">Community</p>
            <p className="text-[10px] text-muted-foreground mt-1">User ideas</p>
          </div>
        </div>
      </div>

      <SignupPrompt
        open={signupPrompt}
        onOpenChange={setSignupPrompt}
        action="use Idescan"
      />
    </div>
  );
}