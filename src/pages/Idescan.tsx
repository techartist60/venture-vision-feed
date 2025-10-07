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
import { Scan, Upload, Sparkles, Image as ImageIcon } from 'lucide-react';
import SignupPrompt from '@/components/SignupPrompt';

export default function Idescan() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [signupPrompt, setSignupPrompt] = useState(false);
  const [indexingData, setIndexingData] = useState(false);
  
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Auto-index data sources on component mount
  useEffect(() => {
    const indexDataSources = async () => {
      try {
        setIndexingData(true);
        
        console.log('Force re-indexing innovation sources from external APIs...');
        
        // Clear old data and fetch fresh
        const { data: countData } = await supabase
          .from('innovation_records')
          .select('*', { count: 'exact', head: true });
        
        console.log(`Current records in DB: ${countData || 0}`);
        
        // Always trigger fresh indexing to get latest data
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
    <div className="min-h-screen bg-gradient-discovery pb-20">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-10">
        <div className="px-4 py-4 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scan className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Idescan</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/idescan/history')}
            >
              Scan History
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary mb-4">
            <Sparkles className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-bold mb-3">Find Similar Ideas</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            See if your idea already exists. We'll search patents, startups, and innovation databases to find similar ideas.
          </p>
        </div>

        {/* Scan Form */}
        <Card className="shadow-glow">
          <CardHeader>
            <CardTitle>Search for Your Idea</CardTitle>
            <CardDescription>
              Tell us about your idea and we'll find similar ones from around the world
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Describe Your Idea *</Label>
                <Textarea
                  id="description"
                  placeholder="What's your idea? Tell us what problem it solves, how it works, and who it's for. The more you tell us, the better we can help."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={10}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Need at least 50 characters. Be specific to get the best results.
                </p>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="image">Add a Picture (Optional)</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  {imagePreview ? (
                    <div className="space-y-4">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-64 mx-auto rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview('');
                        }}
                      >
                        Remove Image
                      </Button>
                    </div>
                  ) : (
                    <label htmlFor="image" className="cursor-pointer">
                      <div className="flex flex-col items-center gap-2">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          Click to add a picture
                        </p>
                        <p className="text-xs text-muted-foreground">
                          JPG or PNG, max 10MB
                        </p>
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

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading || indexingData}
              >
                {indexingData ? (
                  <>
                    <Upload className="mr-2 h-5 w-5 animate-spin" />
                    Preparing Databases...
                  </>
                ) : loading ? (
                  <>
                    <Upload className="mr-2 h-5 w-5 animate-spin" />
                    Processing Scan...
                  </>
                ) : (
                  <>
                    <Scan className="mr-2 h-5 w-5" />
                    Search for Similar Ideas
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Patents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                We search global patent databases
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Startups</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                We check startup databases worldwide
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Community Ideas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                We compare with ideas from our community
              </p>
            </CardContent>
          </Card>
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