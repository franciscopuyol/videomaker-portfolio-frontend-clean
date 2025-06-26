import { useEffect, useRef, useState } from 'react';

interface VimeoPlayerProps {
  vimeoId: string;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  background?: boolean;
  className?: string;
  lazy?: boolean;
}

export default function VimeoPlayer({ 
  vimeoId, 
  autoplay = false, 
  muted = true, 
  loop = true, 
  background = false,
  className = "",
  lazy = true
}: VimeoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Ensure we have a valid Vimeo ID
  const validVimeoId = vimeoId || "76979871"; // Default fallback

  // Detect mobile for optimized quality
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const vimeoParams = new URLSearchParams({
    autoplay: (autoplay && !isMobile) ? '1' : '0',
    muted: muted ? '1' : '0',
    loop: loop ? '1' : '0',
    background: background ? '1' : '0',
    controls: background ? '0' : '1',
    title: '0',
    byline: '0',
    portrait: '0',
    transparent: '0',
    quality: isMobile ? '360p' : 'auto',
    speed: '1'
  });

  const embedUrl = `https://player.vimeo.com/video/${validVimeoId}?${vimeoParams.toString()}`;

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [lazy]);

  const handleError = () => {
    setHasError(true);
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  if (hasError) {
    return (
      <div className={`w-full h-full bg-gray-900 flex items-center justify-center ${className}`}>
        <div className="text-white text-center">
          <div className="text-lg mb-2">Video Loading...</div>
          <div className="text-sm text-gray-400">Vimeo ID: {validVimeoId}</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`w-full h-full relative ${className}`}>
      {!isInView && lazy ? (
        <div className="w-full h-full bg-gray-900 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-2"></div>
            <div className="text-sm">Preparing video...</div>
          </div>
        </div>
      ) : (
        <>
          {!isLoaded && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-10">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-2"></div>
                <div className="text-sm">Loading video...</div>
              </div>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={embedUrl}
            className="w-full h-full"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            onError={handleError}
            onLoad={handleLoad}
            title={`Vimeo video ${validVimeoId}`}
            loading="lazy"
          />
        </>
      )}
    </div>
  );
}