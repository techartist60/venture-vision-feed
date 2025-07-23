import { useState } from 'react';
import { Camera, Video, Image, ArrowLeft, Upload as UploadIcon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const categories = [
  'Technology', 'Fashion', 'Agriculture', 'Art & Design', 
  'Health & Wellness', 'Gaming', 'Education', 'Sustainability'
];

export default function Upload() {
  const [mediaType, setMediaType] = useState<'photo' | 'video' | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!mediaType) {
    return (
      <div className="min-h-screen">
        {/* Header */}
        <header className="bg-background/95 backdrop-blur-md border-b border-border">
          <div className="px-4 py-4 max-w-md mx-auto">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-gradient-innovation">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Share Your Idea</h1>
                <p className="text-sm text-muted-foreground">Turn inspiration into innovation</p>
              </div>
            </div>
          </div>
        </header>

        {/* Media Type Selection */}
        <div className="px-4 py-8 max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <UploadIcon className="h-10 w-10 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">What would you like to share?</h2>
            <p className="text-muted-foreground">Choose how you want to showcase your innovative idea</p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => setMediaType('photo')}
              variant="discovery"
              size="lg"
              className="w-full h-20 flex-col gap-2 text-left justify-center bg-card hover:shadow-card border-2 border-border hover:border-primary transition-all"
            >
              <div className="flex items-center gap-4 w-full">
                <div className="p-3 rounded-full bg-gradient-primary">
                  <Image className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">Photo Carousel</div>
                  <div className="text-sm text-muted-foreground">Share images of your idea</div>
                </div>
              </div>
            </Button>

            <Button
              onClick={() => setMediaType('video')}
              variant="discovery"
              size="lg"
              className="w-full h-20 flex-col gap-2 text-left justify-center bg-card hover:shadow-card border-2 border-border hover:border-primary transition-all"
            >
              <div className="flex items-center gap-4 w-full">
                <div className="p-3 rounded-full bg-gradient-innovation">
                  <Video className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">Video Demo</div>
                  <div className="text-sm text-muted-foreground">Show your idea in action (max 3 min)</div>
                </div>
              </div>
            </Button>
          </div>

          <div className="mt-8 p-4 bg-gradient-discovery rounded-xl border border-border">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-accent/20">
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-1">Pro Tip</h3>
                <p className="text-sm text-muted-foreground">
                  Videos tend to get 3x more engagement than photos. Consider showing your idea in action!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border">
        <div className="px-4 py-4 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMediaType(null)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">
                {mediaType === 'photo' ? 'Photo Upload' : 'Video Upload'}
              </h1>
              <p className="text-sm text-muted-foreground">Step 2 of 2</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Media Upload Area */}
        <div className="relative">
          <div className="w-full aspect-video bg-gradient-discovery border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center p-8">
            <div className="p-4 rounded-full bg-gradient-primary mb-4">
              {mediaType === 'photo' ? (
                <Camera className="h-8 w-8 text-primary-foreground" />
              ) : (
                <Video className="h-8 w-8 text-primary-foreground" />
              )}
            </div>
            <h3 className="font-semibold text-foreground mb-2">
              {mediaType === 'photo' ? 'Add Photos' : 'Add Video'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {mediaType === 'photo' 
                ? 'Tap to select up to 10 photos' 
                : 'Tap to select a video (max 3 minutes)'
              }
            </p>
            <Button variant="innovation" size="sm">
              Choose {mediaType === 'photo' ? 'Photos' : 'Video'}
            </Button>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Title *
            </label>
            <Input
              placeholder="Give your idea a catchy title..."
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Description *
            </label>
            <Textarea
              placeholder="Describe your innovation, how it works, and what problem it solves..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="rounded-xl resize-none h-32"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Category *
            </label>
            <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category.toLowerCase()}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Publishing Options */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="font-semibold text-foreground mb-3">Publishing Options</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Allow comments</span>
              <input type="checkbox" defaultChecked className="rounded" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Allow downloads</span>
              <input type="checkbox" className="rounded" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Featured submission</span>
              <Badge variant="outline" className="text-xs">Pro</Badge>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="space-y-3">
          <Button 
            variant="innovation" 
            size="lg" 
            className="w-full"
            disabled={!formData.title || !formData.description || !formData.category}
          >
            <Sparkles className="h-5 w-5 mr-2" />
            Publish Idea
          </Button>
          
          <Button variant="ghost" size="lg" className="w-full">
            Save as Draft
          </Button>
        </div>
      </div>
    </div>
  );
}