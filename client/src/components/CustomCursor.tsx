import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';

export default function CustomCursor() {
  const [location] = useLocation();
  const cursorRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const mouseMoveHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);

  useEffect(() => {
    const checkIsMobile = () => {
      return window.innerWidth < 768 || 
             'ontouchstart' in window || 
             navigator.maxTouchPoints > 0 ||
             /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };

    setIsMobile(checkIsMobile());

    const handleResize = () => setIsMobile(checkIsMobile());
    window.addEventListener('resize', handleResize);

    // Clean up any existing mouse move handler
    if (mouseMoveHandlerRef.current) {
      document.removeEventListener('mousemove', mouseMoveHandlerRef.current);
      mouseMoveHandlerRef.current = null;
    }

    // Skip mounting event listeners completely on admin pages or mobile
    if (checkIsMobile() || location.startsWith('/admin') || location.startsWith('/login')) {
      return () => {
        window.removeEventListener('resize', handleResize);
        if (mouseMoveHandlerRef.current) {
          document.removeEventListener('mousemove', mouseMoveHandlerRef.current);
          mouseMoveHandlerRef.current = null;
        }
      };
    }

    const updateCursor = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.left = `${e.clientX}px`;
        cursorRef.current.style.top = `${e.clientY}px`;
      }
    };

    mouseMoveHandlerRef.current = updateCursor;
    document.addEventListener('mousemove', updateCursor);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mouseMoveHandlerRef.current) {
        document.removeEventListener('mousemove', mouseMoveHandlerRef.current);
        mouseMoveHandlerRef.current = null;
      }
    };
  }, [location]);

  // Don't render cursor on mobile or admin/login pages
  if (isMobile || location.startsWith('/admin') || location.startsWith('/login')) {
    return null;
  }

  return (
    <div ref={cursorRef} className="custom-cursor rec-blink">
      REC
    </div>
  );
}
