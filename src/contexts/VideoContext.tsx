import React, { createContext, useContext, useRef, useState } from 'react';

interface VideoContextType {
  currentlyPlaying: string | null;
  setCurrentlyPlaying: (id: string | null) => void;
  videoRefs: React.MutableRefObject<{ [key: string]: HTMLVideoElement | null }>;
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export function VideoProvider({ children }: { children: React.ReactNode }) {
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  const handleSetCurrentlyPlaying = (id: string | null) => {
    // Pause all other videos
    Object.entries(videoRefs.current).forEach(([videoId, videoElement]) => {
      if (videoElement && videoId !== id) {
        videoElement.pause();
      }
    });
    setCurrentlyPlaying(id);
  };

  return (
    <VideoContext.Provider value={{
      currentlyPlaying,
      setCurrentlyPlaying: handleSetCurrentlyPlaying,
      videoRefs
    }}>
      {children}
    </VideoContext.Provider>
  );
}

export function useVideo() {
  const context = useContext(VideoContext);
  if (context === undefined) {
    throw new Error('useVideo must be used within a VideoProvider');
  }
  return context;
}