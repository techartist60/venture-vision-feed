import { useState, useRef } from 'react';
import { Camera, Video, Image, ArrowLeft, Upload as UploadIcon, Sparkles, X, FileText, Youtube } from 'lucide-react';
import ThumbnailSelection from '@/components/ThumbnailSelection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  validateImageFile, 
  validateVideoFile, 
  validateTextInput, 
  sanitizeFileName,
  MAX_IMAGES_COUNT,
  MAX_VIDEO_DURATION 
} from '@/utils/fileValidation';
import { uploadRateLimiter, logSecurityEvent } from '@/utils/security';
import IdemarkToggle from '@/components/idemark/IdemarkToggle';
import IdemarkSuccessDialog from '@/components/idemark/IdemarkSuccessDialog';
import { 
  generateIdemarkId, 
  generateFingerprintHash, 
  IdemarkData 
} from '@/utils/idemark';
import { isValidYouTubeUrl, extractYouTubeVideoId, getYouTubeThumbnail } from '@/utils/youtube';

const categories = [
  'Technology', 'Fashion', 'Agriculture', 'Art & Design', 
  'Health & Wellness', 'Gaming', 'Education', 'Sustainability'
];

export default function Upload() {
  const [mediaType, setMediaType] = useState<'photo' | 'video' | 'text' | 'youtube' | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeError, setYoutubeError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    investmentStatus: 'normal' as 'open' | 'normal',
    fundingAmount: '',
    investmentStage: 'concept' as 'concept' | 'prototype' | 'ready',
    pitchSummary: ''
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [idemarkEnabled, setIdemarkEnabled] = useState(false);
  const [idemarkTitlePublic, setIdemarkTitlePublic] = useState(true);
  const [showIdemarkSuccess, setShowIdemarkSuccess] = useState(false);
  const [idemarkData, setIdemarkData] = useState<IdemarkData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    // Only enforce max length during typing — full validation happens on submit
    const maxLengths: Record<string, number> = { title: 100, description: 1000, category: 50, pitchSummary: 500 };
    const maxLength = maxLengths[field] || 1000;
    
    if (value.length > maxLength) {
      return; // silently prevent exceeding max length
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (mediaType === 'photo') {
      // Validate each image file
      const validImageFiles: File[] = [];
      
      for (const file of files) {
        const validation = validateImageFile(file);
        if (!validation.isValid) {
          toast({
            title: "Invalid file",
            description: validation.error,
            variant: "destructive"
          });
          continue;
        }
        validImageFiles.push(file);
      }
      
      if (validImageFiles.length > MAX_IMAGES_COUNT) {
        toast({
          title: "Too many files",
          description: `You can only upload up to ${MAX_IMAGES_COUNT} photos.`,
          variant: "destructive"
        });
        return;
      }
      
      setSelectedFiles(validImageFiles);
    } else if (mediaType === 'video') {
      const videoFile = files[0];
      if (videoFile) {
        // Validate video file
        const validation = validateVideoFile(videoFile);
        if (!validation.isValid) {
          toast({
            title: "Invalid file",
            description: validation.error,
            variant: "destructive"
          });
          return;
        }
        
        // Check video duration
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          if (video.duration > MAX_VIDEO_DURATION) {
            toast({
              title: "Video too long",
              description: "Video must be 3 minutes or shorter.",
              variant: "destructive"
            });
            return;
          }
          setSelectedFiles([videoFile]);
          URL.revokeObjectURL(video.src); // Clean up memory
        };
        video.src = URL.createObjectURL(videoFile);
      }
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload files.",
        variant: "destructive"
      });
      return [];
    }

    const uploadedUrls: string[] = [];
    
    for (const file of selectedFiles) {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const sanitizedName = sanitizeFileName(file.name.split('.')[0]);
      const fileName = `${user.id}/${Date.now()}_${sanitizedName}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('media')
        .upload(fileName, file);

      if (error) {
        // Log error securely without exposing system details
        if (process.env.NODE_ENV === 'development') {
          console.warn('Upload error for file:', file.name);
        }
        toast({
          title: "Upload failed",
          description: "Failed to upload file. Please try again.",
          variant: "destructive"
        });
        continue;
      }

      const { data } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);
      
      uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
  };

  const handlePublish = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload files.",
        variant: "destructive"
      });
      return;
    }

    // Rate limiting check
    const rateLimitKey = `upload_${user.id}`;
    if (uploadRateLimiter.isRateLimited(rateLimitKey)) {
      const remainingTime = Math.ceil(uploadRateLimiter.getRemainingTime(rateLimitKey) / 1000);
      logSecurityEvent('upload_rate_limit_exceeded', { userId: user.id });
      toast({
        title: "Upload limit reached",
        description: `Please wait ${remainingTime} seconds before uploading again`,
        variant: "destructive"
      });
      return;
    }

    // Validate form data
    const titleValidation = validateTextInput(formData.title, 100);
    
    if (!titleValidation.isValid) {
      toast({
        title: "Invalid title",
        description: titleValidation.error,
        variant: "destructive"
      });
      return;
    }
    
    // For text ideas, description is required as it's the main content
    if (mediaType === 'text') {
      if (!formData.description || formData.description.trim().length === 0) {
        toast({
          title: "Description required",
          description: "Please enter your idea description.",
          variant: "destructive"
        });
        return;
      }
    }

    // Validate YouTube URL
    if (mediaType === 'youtube') {
      if (!youtubeUrl || !isValidYouTubeUrl(youtubeUrl)) {
        toast({
          title: "Invalid YouTube URL",
          description: "Please enter a valid YouTube video link.",
          variant: "destructive"
        });
        return;
      }
    }
    
    // Validate description if provided (optional for non-text uploads)
    if (formData.description && formData.description.trim().length > 0) {
      const descriptionValidation = validateTextInput(formData.description, 1000);
      if (!descriptionValidation.isValid) {
        toast({
          title: "Invalid description", 
          description: descriptionValidation.error,
          variant: "destructive"
        });
        return;
      }
    }
    
    // Validate investment fields if status is 'open'
    if (formData.investmentStatus === 'open') {
      const pitchValidation = validateTextInput(formData.pitchSummary, 500);
      
      if (!formData.fundingAmount || parseFloat(formData.fundingAmount) <= 0) {
        toast({
          title: "Funding amount required",
          description: "Please enter a valid funding amount in KES",
          variant: "destructive"
        });
        return;
      }
      
      if (!pitchValidation.isValid) {
        toast({
          title: "Invalid pitch summary",
          description: pitchValidation.error,
          variant: "destructive"
        });
        return;
      }
    }
    
    // Only require files for photo/video uploads
    if ((mediaType === 'photo' || mediaType === 'video') && !selectedFiles.length) {
      toast({
        title: "No files selected",
        description: "Please select files to upload.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    
    try {
      let uploadedUrls: string[] = [];
      
      // For text-only posts, use a placeholder URL
      if (mediaType === 'text') {
        uploadedUrls = ['text-only'];
      } else if (mediaType === 'youtube') {
        uploadedUrls = [youtubeUrl.trim()];
      } else {
        uploadedUrls = await uploadFiles();
      }
      
      if (uploadedUrls.length > 0) {
        let mediaId: string | null = null;
        
        // Save media metadata to database
        for (const mediaUrl of uploadedUrls) {
          const { data: mediaData, error: dbError } = await supabase
            .from('media_uploads')
            .insert({
              user_id: user.id,
              title: formData.title,
              description: formData.description || null,
              media_type: mediaType === 'photo' ? 'image' : mediaType === 'text' ? 'text' : 'video',
              media_url: mediaUrl,
              thumbnail_url: null,
              mime_type: mediaType === 'text' ? 'text/plain' : (selectedFiles[0]?.type || null),
              file_size: mediaType === 'text' ? null : (selectedFiles[0]?.size || null),
              investment_status: formData.investmentStatus,
              category: formData.category || null,
              ...(formData.investmentStatus === 'open' ? {
                funding_amount: parseFloat(formData.fundingAmount),
                investment_stage: formData.investmentStage,
                pitch_summary: formData.pitchSummary,
              } : {}),
            })
            .select('id')
            .single();

          if (dbError) {
            console.error('Error saving media metadata:', dbError.message, dbError.details, dbError.hint, dbError.code);
            toast({
              title: "Upload failed",
              description: `Metadata save failed: ${dbError.message}`,
              variant: "destructive"
            });
            return;
          }
          
          mediaId = mediaData?.id || null;
        }

        // Create Idemark record if enabled
        if (idemarkEnabled && mediaId) {
          const timestamp = new Date().toISOString();
          const idemarkId = generateIdemarkId();
          const fingerprintHash = generateFingerprintHash({
            title: formData.title,
            description: formData.description,
            category: formData.category,
            timestamp,
            userId: user.id,
          });

          const { error: idemarkError } = await supabase
            .from('idemark_records')
            .insert({
              user_id: user.id,
              media_id: mediaId,
              idemark_id: idemarkId,
              title: formData.title,
              description: formData.description,
              category: formData.category || null,
              fingerprint_hash: fingerprintHash,
              marked_at: timestamp,
              is_title_public: idemarkTitlePublic,
              status: 'active',
            });

          if (idemarkError) {
            console.error('Error creating Idemark:', idemarkError);
            toast({
              title: "Idemark creation failed",
              description: "Your idea was uploaded but Idemark could not be created.",
              variant: "destructive"
            });
          } else {
            // Show success dialog with Idemark details
            setIdemarkData({
              idemarkId,
              fingerprintHash,
              timestamp,
              title: formData.title,
              description: formData.description,
              category: formData.category,
            });
            setShowIdemarkSuccess(true);
          }
        } else {
          toast({
            title: "Success!",
            description: mediaType === 'text' 
              ? "Your idea has been published successfully!" 
              : `Successfully uploaded ${uploadedUrls.length} file(s).`,
          });
        }
        
        // Reset form
        setSelectedFiles([]);
        setFormData({ 
          title: '', 
          description: '', 
          category: '',
          investmentStatus: 'normal',
          fundingAmount: '',
          investmentStage: 'concept',
          pitchSummary: ''
        });
        setIdemarkEnabled(false);
        setIdemarkTitlePublic(true);
        setMediaType(null);
      }
    } catch (error) {
      // Log error securely without exposing system details
      if (process.env.NODE_ENV === 'development') {
        console.warn('Upload process error:', error);
      }
      toast({
        title: "Upload failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
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
                <p className="text-sm text-muted-foreground">Show your innovation</p>
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
            <h2 className="text-2xl font-bold mb-2">What do you want to share?</h2>
            <p className="text-muted-foreground">Choose how to show your idea</p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => setMediaType('text')}
              variant="discovery"
              size="lg"
              className="w-full h-20 flex-col gap-2 text-left justify-center bg-card hover:shadow-card border-2 border-border hover:border-primary transition-all"
            >
              <div className="flex items-center gap-4 w-full">
                <div className="p-3 rounded-full bg-gradient-to-br from-accent to-primary">
                  <FileText className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">Text Idea</div>
                  <div className="text-sm text-muted-foreground">Share your idea in words</div>
                </div>
              </div>
            </Button>

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
                  <div className="font-semibold text-foreground">Photos</div>
                  <div className="text-sm text-muted-foreground">Share pictures of your idea</div>
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
                  <div className="font-semibold text-foreground">Video</div>
                  <div className="text-sm text-muted-foreground">Show your idea in action (3 min max)</div>
                </div>
              </div>
            </Button>

            <Button
              onClick={() => setMediaType('youtube')}
              variant="discovery"
              size="lg"
              className="w-full h-20 flex-col gap-2 text-left justify-center bg-card hover:shadow-card border-2 border-border hover:border-red-500 transition-all"
            >
              <div className="flex items-center gap-4 w-full">
                <div className="p-3 rounded-full bg-gradient-to-br from-red-600 to-red-500">
                  <Youtube className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">Upload (Youtube)</div>
                  <div className="text-sm text-muted-foreground">Share a YouTube video link</div>
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
                <h3 className="font-medium text-foreground mb-1">Tip</h3>
                <p className="text-sm text-muted-foreground">
                  Videos get 3x more views than photos. Try showing your idea in action!
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
                {mediaType === 'photo' ? 'Photo Upload' : mediaType === 'video' ? 'Video Upload' : 'Text Idea'}
              </h1>
              <p className="text-sm text-muted-foreground">Step 2 of 2</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Media Upload Area - Only show for photo/video */}
        {mediaType !== 'text' && (
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept={mediaType === 'photo' ? 'image/*' : 'video/*'}
            multiple={mediaType === 'photo'}
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {selectedFiles.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="relative">
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                      {file.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              
              {mediaType === 'photo' && selectedFiles.length < 10 && (
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  Add More Photos ({selectedFiles.length}/10)
                </Button>
              )}
            </div>
          ) : (
            <div 
              className="w-full aspect-video bg-gradient-discovery border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center p-8 cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
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
                  ? 'Tap to pick up to 10 photos' 
                  : 'Tap to pick a video (3 min max)'
                }
              </p>
              <Button variant="innovation" size="sm">
                Choose {mediaType === 'photo' ? 'Photos' : 'Video'}
              </Button>
            </div>
          )}
        </div>
        )}

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

        {/* Investment Settings */}
        <div className="bg-card rounded-xl p-4 border border-border space-y-4">
          <h3 className="font-semibold text-foreground mb-3">💰 Investment Settings</h3>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Investment Status
            </label>
            <Select 
              value={formData.investmentStatus} 
              onValueChange={(value: 'open' | 'normal') => 
                setFormData(prev => ({ ...prev, investmentStatus: value }))
              }
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">
                  <div className="flex items-center gap-2">
                    <span>⚪</span>
                    <span>Normal Post</span>
                  </div>
                </SelectItem>
                <SelectItem value="open">
                  <div className="flex items-center gap-2">
                    <span>🟢</span>
                    <span>Open for Investment</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {formData.investmentStatus === 'open' 
                ? 'Your idea will be visible to investors via Idestrim API' 
                : 'Your idea will be visible to regular users only'}
            </p>
          </div>

          {formData.investmentStatus === 'open' && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Funding Amount (KES) *
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 500000"
                  value={formData.fundingAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, fundingAmount: e.target.value }))}
                  className="rounded-xl"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Investment Stage *
                </label>
                <Select 
                  value={formData.investmentStage} 
                  onValueChange={(value: 'concept' | 'prototype' | 'ready') => 
                    setFormData(prev => ({ ...prev, investmentStage: value }))
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concept">Concept Stage</SelectItem>
                    <SelectItem value="prototype">Prototype Stage</SelectItem>
                    <SelectItem value="ready">Ready for Market</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Pitch Summary *
                </label>
                <Textarea
                  placeholder="A brief pitch for potential investors (max 500 chars)..."
                  value={formData.pitchSummary}
                  onChange={(e) => handleInputChange('pitchSummary', e.target.value)}
                  className="rounded-xl resize-none h-24"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.pitchSummary.length}/500 characters
                </p>
              </div>

              <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                <p className="text-xs text-foreground">
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20 mb-2">Investment Ready</Badge>
                  <br />
                  Your post will be tagged and shared with registered investors through the Idestrim API.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Idemark Section */}
        <IdemarkToggle
          enabled={idemarkEnabled}
          onToggle={setIdemarkEnabled}
          isTitlePublic={idemarkTitlePublic}
          onTitlePublicToggle={setIdemarkTitlePublic}
        />

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
            disabled={!formData.title || !formData.description || !formData.category || (mediaType !== 'text' && selectedFiles.length === 0) || isUploading}
            onClick={handlePublish}
          >
            <Sparkles className="h-5 w-5 mr-2" />
            {isUploading ? 'Uploading...' : 'Publish Idea'}
          </Button>
          
          <Button variant="ghost" size="lg" className="w-full">
            Save as Draft
          </Button>
        </div>
      </div>

      {/* Idemark Success Dialog */}
      <IdemarkSuccessDialog
        open={showIdemarkSuccess}
        onClose={() => setShowIdemarkSuccess(false)}
        idemarkData={idemarkData}
      />
    </div>
  );
}