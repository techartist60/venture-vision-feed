import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, Check, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sanitizeFileName } from '@/utils/fileValidation';

interface ThumbnailSelectionProps {
  videoFile: File;
  userId: string;
  onThumbnailSelected: (thumbnailUrl: string) => void;
  onBack: () => void;
}

export default function ThumbnailSelection({ 
  videoFile, 
  userId, 
  onThumbnailSelected, 
  onBack 
}: ThumbnailSelectionProps) {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [suggestedThumbnails, setSuggestedThumbnails] = useState<string[]>([]);
  const [selectedThumbnail, setSelectedThumbnail] = useState<string>('');
  const [customThumbnail, setCustomThumbnail] = useState<File | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const url = URL.createObjectURL(videoFile);
    setVideoUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [videoFile]);

  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      
      const handleLoadedMetadata = () => {
        setVideoDuration(video.duration);
        generateSuggestedThumbnails(video);
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      
      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }
  }, [videoUrl]);

  const generateSuggestedThumbnails = async (video: HTMLVideoElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 320;
    canvas.height = 180;

    const thumbnails: string[] = [];
    const times = [0.1, 0.3, 0.5, 0.7, 0.9]; // 10%, 30%, 50%, 70%, 90% of video

    for (const timeRatio of times) {
      const time = video.duration * timeRatio;
      
      await new Promise<void>((resolve) => {
        const seekHandler = () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          thumbnails.push(dataUrl);
          video.removeEventListener('seeked', seekHandler);
          resolve();
        };
        
        video.addEventListener('seeked', seekHandler);
        video.currentTime = time;
      });
    }

    setSuggestedThumbnails(thumbnails);
    setSelectedThumbnail(thumbnails[2]); // Default to middle frame
  };

  const captureCurrentFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 320;
    canvas.height = 180;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setSelectedThumbnail(dataUrl);
    setCustomThumbnail(null);
  };

  const handleCustomThumbnailUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File too large",
        description: "Thumbnail must be less than 5MB",
        variant: "destructive"
      });
      return;
    }

    setCustomThumbnail(file);
    const url = URL.createObjectURL(file);
    setSelectedThumbnail(url);
  };

  const uploadThumbnail = async (): Promise<string> => {
    if (customThumbnail) {
      // Upload custom image file
      const fileExt = customThumbnail.name.split('.').pop()?.toLowerCase();
      const sanitizedName = sanitizeFileName(customThumbnail.name.split('.')[0]);
      const fileName = `${userId}/thumbnails/${Date.now()}_${sanitizedName}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('media')
        .upload(fileName, customThumbnail);

      if (error) throw error;

      const { data } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);
      
      return data.publicUrl;
    } else {
      // Convert data URL to blob and upload
      const response = await fetch(selectedThumbnail);
      const blob = await response.blob();
      
      const fileName = `${userId}/thumbnails/${Date.now()}_thumbnail.jpg`;
      
      const { error } = await supabase.storage
        .from('media')
        .upload(fileName, blob);

      if (error) throw error;

      const { data } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);
      
      return data.publicUrl;
    }
  };

  const handleConfirmThumbnail = async () => {
    if (!selectedThumbnail) {
      toast({
        title: "No thumbnail selected",
        description: "Please select a thumbnail",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const thumbnailUrl = await uploadThumbnail();
      onThumbnailSelected(thumbnailUrl);
    } catch (error) {
      console.error('Error uploading thumbnail:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload thumbnail. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleVideoSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(event.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border">
        <div className="px-4 py-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Choose Thumbnail</h1>
              <p className="text-sm text-muted-foreground">Select or create a thumbnail for your video</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 max-w-4xl mx-auto space-y-8">
        {/* Video Player with Scrubber */}
        <div className="bg-card rounded-2xl p-6 shadow-card">
          <h3 className="text-lg font-semibold mb-4">Video Preview</h3>
          <div className="space-y-4">
            <div className="relative aspect-video bg-muted rounded-xl overflow-hidden">
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-cover"
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-12 w-12 rounded-full bg-background/80 hover:bg-background"
                  onClick={() => {
                    if (videoRef.current) {
                      if (videoRef.current.paused) {
                        videoRef.current.play();
                      } else {
                        videoRef.current.pause();
                      }
                    }
                  }}
                >
                  <Play className="h-6 w-6" />
                </Button>
              </div>
            </div>
            
            {/* Video Scrubber */}
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground min-w-[60px]">
                  {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}
                </span>
                <input
                  type="range"
                  min="0"
                  max={videoDuration || 0}
                  step="0.1"
                  value={currentTime}
                  onChange={handleVideoSeek}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-muted-foreground min-w-[60px]">
                  {Math.floor(videoDuration / 60)}:{Math.floor(videoDuration % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <Button
                onClick={captureCurrentFrame}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Capture Current Frame as Thumbnail
              </Button>
            </div>
          </div>
        </div>

        {/* Suggested Thumbnails */}
        <div className="bg-card rounded-2xl p-6 shadow-card">
          <h3 className="text-lg font-semibold mb-4">Suggested Thumbnails</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {suggestedThumbnails.map((thumbnail, index) => (
              <button
                key={index}
                onClick={() => {
                  setSelectedThumbnail(thumbnail);
                  setCustomThumbnail(null);
                }}
                className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                  selectedThumbnail === thumbnail ? 'border-primary' : 'border-border'
                }`}
              >
                <img
                  src={thumbnail}
                  alt={`Thumbnail option ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {selectedThumbnail === thumbnail && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <div className="p-1 rounded-full bg-primary">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Thumbnail Upload */}
        <div className="bg-card rounded-2xl p-6 shadow-card">
          <h3 className="text-lg font-semibold mb-4">Custom Thumbnail</h3>
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCustomThumbnailUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Custom Thumbnail
            </Button>
            {customThumbnail && (
              <div className="relative aspect-video max-w-xs mx-auto rounded-lg overflow-hidden border-2 border-primary">
                <img
                  src={selectedThumbnail}
                  alt="Custom thumbnail"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 p-1 rounded-full bg-primary">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Confirm Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleConfirmThumbnail}
            disabled={!selectedThumbnail || isUploading}
            size="lg"
            className="px-8"
          >
            {isUploading ? 'Uploading...' : 'Confirm Thumbnail'}
          </Button>
        </div>
      </div>

      {/* Hidden canvas for thumbnail generation */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}