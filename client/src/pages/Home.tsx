import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Volume2, VolumeX } from 'lucide-react';
import CustomCursor from '../components/CustomCursor';
import Navigation from '../components/Navigation';
import VideoThumbnail from '../components/VideoThumbnail';
import { type PortfolioProject } from '../lib/portfolio-data';
import type { Project, User } from '@shared/schema';

// Helper function to convert database Project to PortfolioProject format
const convertToPortfolioProject = (project: Project): PortfolioProject => ({
  id: project.id.toString(),
  title: project.title,
  description: project.description || '',
  thumbnailUrl: project.thumbnailUrl || '',
  videoUrl: project.videoUrl || '',
  category: project.category || '',
  year: project.year || new Date().getFullYear(),
  featured: project.featured || false,
  client: project.client || '',
  agency: project.agency || ''
});

export default function Home() {
  const [location, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState('home');
  const [activeProject, setActiveProject] = useState<PortfolioProject | null>(null);
  const [activeProjectIndex, setActiveProjectIndex] = useState<number>(-1);
  const [backgroundVideoSrc, setBackgroundVideoSrc] = useState('');
  const [userInteracted, setUserInteracted] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [useStaticBackground, setUseStaticBackground] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const projectRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoScrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Fetch published projects from API
  const { data: dbProjects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    retry: false,
  });

  // Fetch user info to check if admin
  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  // Convert database projects to portfolio format
  const portfolioProjects = dbProjects.map(convertToPortfolioProject);
  const featuredProjects = portfolioProjects.filter(p => p.featured);

  // Detect mobile device and setup video capabilities
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      setIsMobile(isMobileDevice);
      // Start with video enabled, fallback to static only if autoplay fails
      setUseStaticBackground(false);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const observerOptions = {
      threshold: 0.5,
      rootMargin: '-50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    const sections = document.querySelectorAll('section[id]');
    sections.forEach((section) => observer.observe(section));

    return () => {
      sections.forEach((section) => observer.unobserve(section));
    };
  }, []);

  // Initialize first project on page load
  useEffect(() => {
    if (activeProjectIndex === -1 && portfolioProjects.length > 0) {
      setActiveProjectIndex(0);
      setActiveProject(portfolioProjects[0]);
      // Set initial background video from first project
      if (portfolioProjects[0].videoUrl) {
        setBackgroundVideoSrc(portfolioProjects[0].videoUrl);
      }
    }
  }, [portfolioProjects]);

  // Auto-scroll functionality - let videos play fully before advancing
  useEffect(() => {
    if (!userInteracted && activeProjectIndex >= 0) {
      // Clear existing timeout
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
      }
      
      // Let the full video play before advancing (60 seconds default, or actual video duration)
      const advanceDelay = 60000; // 60 seconds for full video experience
      
      autoScrollTimeoutRef.current = setTimeout(() => {
        if (!userInteracted) {
          const currentIndex = activeProjectIndex;
          const nextIndex = currentIndex + 1 >= portfolioProjects.slice(0, 12).length ? 0 : currentIndex + 1;
          
          console.log(`Auto-advancing from project ${currentIndex} to ${nextIndex} after full video`);
          
          // Auto-scroll to next project
          if (projectRefs.current[nextIndex]) {
            projectRefs.current[nextIndex]?.scrollIntoView({ 
              behavior: 'smooth',
              block: 'center'
            });
          }
        }
      }, advanceDelay);
    }

    return () => {
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
      }
    };
  }, [activeProjectIndex, userInteracted]);

  // Handle mute/unmute for background video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      setUserInteracted(true);
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
      }
      clearTimeout(scrollTimeout);
      
      scrollTimeout = setTimeout(() => {
        const windowHeight = window.innerHeight;
        const scrollY = window.scrollY;
        const documentHeight = document.documentElement.scrollHeight;
        let closestIndex = -1;
        let closestDistance = Infinity;
        
        // Find the element closest to screen center
        projectRefs.current.forEach((ref, index) => {
          if (ref) {
            const rect = ref.getBoundingClientRect();
            const elementCenter = rect.top + rect.height / 2;
            const screenCenter = windowHeight / 2;
            const distance = Math.abs(elementCenter - screenCenter);
            
            // Increased detection area and special handling for last item
            const detectionThreshold = index === portfolioProjects.length - 1 ? 300 : 250;
            
            if (distance < closestDistance && distance < detectionThreshold) {
              closestDistance = distance;
              closestIndex = index;
            }
          }
        });
        
        // Special case: if we're near the bottom and no box is selected, select the last one
        if (closestIndex === -1 && scrollY > documentHeight - windowHeight - 200) {
          closestIndex = portfolioProjects.length - 1;
        }
        
        // Only update if we have a clear winner and it's different
        if (closestIndex !== -1 && closestIndex !== activeProjectIndex) {
          setActiveProjectIndex(closestIndex);
          const project = portfolioProjects[closestIndex];
          setActiveProject(project);
          
          // Direct video switch - no loading state
          const newVideo = project.videoUrl;
          if (newVideo && newVideo !== backgroundVideoSrc) {
            setBackgroundVideoSrc(newVideo);
            // Reset static background flag to attempt video playback
            if (useStaticBackground) {
              setUseStaticBackground(false);
            }
          }
        }
      }, 100); // Debounce scroll events
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [activeProjectIndex, backgroundVideoSrc]);

  const handleVideoHover = (project: PortfolioProject) => {
    setActiveProject(project);
    
    if (project.videoUrl && project.videoUrl !== backgroundVideoSrc) {
      setBackgroundVideoSrc(project.videoUrl);
    }
  };

  const handleVideoLeave = () => {
    // Return to the currently active project from scroll
    if (activeProjectIndex >= 0 && portfolioProjects[activeProjectIndex]) {
      const currentProject = portfolioProjects[activeProjectIndex];
      setActiveProject(currentProject);
      
      if (currentProject.videoUrl && currentProject.videoUrl !== backgroundVideoSrc) {
        setBackgroundVideoSrc(currentProject.videoUrl);
      }
    }
  };

  const handleVideoClick = (project: PortfolioProject) => {
    // Navigate to video detail page
    setLocation(`/video/${project.id}`);
  };

  // Show loading state while fetching projects
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-x-hidden">
      <CustomCursor />
      <Navigation activeSection={activeSection} />
      {/* Sound Toggle Button - Volume Icons */}
      <motion.button
        onClick={() => setIsMuted(!isMuted)}
        className="fixed bottom-4 right-4 z-30 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 mt-[19px] mb-[19px]"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {isMuted ? (
          <VolumeX size={20} className="text-white/60" />
        ) : (
          <Volume2 size={20} className="text-red-500" />
        )}
      </motion.button>
      {/* Background Video - Quick direct transitions */}
      {backgroundVideoSrc ? (
        <video
          key={backgroundVideoSrc}
          ref={videoRef}
          className="fixed inset-0 w-full h-full object-cover z-0"
          autoPlay
          muted={true}
          loop
          playsInline
          webkit-playsinline="true"
          x5-playsinline="true"
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
          preload={isMobile ? "metadata" : "auto"}
          src={backgroundVideoSrc}
          style={{ opacity: 0.6 }}
          onCanPlay={() => {
            if (videoRef.current) {
              videoRef.current.play().catch(() => {
                // Fallback for mobile autoplay restrictions
                setUseStaticBackground(true);
              });
            }
          }}
          onLoadedData={() => {
            if (videoRef.current) {
              videoRef.current.currentTime = 0;
            }
          }}
          onError={(e) => {
            console.log('Video error:', e);
            setUseStaticBackground(true);
          }}
        />
      ) : null}
      {/* Static background fallback */}
      {(useStaticBackground || !backgroundVideoSrc) && activeProject?.thumbnailUrl && (
        <div
          className="fixed inset-0 w-full h-full bg-cover bg-center z-0 transition-opacity duration-300"
          style={{
            backgroundImage: `url(${activeProject.thumbnailUrl})`,
            opacity: 0.4
          }}
        />
      )}
      {/* Main Content */}
      <div className="relative z-20">
        {/* Hero Section - Empty */}
        <section id="home" className="h-16 flex items-center justify-center px-4 md:px-8">
        </section>

        {/* Work Section - Clean Hero Scroll */}
        <section id="work" className="pt-20 sm:pt-32 md:pt-64 pb-32 sm:pb-48 md:pb-96 px-4 md:px-8">
          <div className="max-w-sm mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-8 sm:space-y-12 md:space-y-20"
            >
              {portfolioProjects.slice(0, 12).map((project, index) => (
                <div
                  key={project.id}
                  ref={(el) => (projectRefs.current[index] = el)}
                  className={`transition-all duration-300 ${
                    activeProjectIndex !== -1 && activeProjectIndex !== index ? 'opacity-40' : 'opacity-100'
                  } ${
                    activeProjectIndex === index ? 'transform scale-105' : ''
                  }`}
                  style={{
                    scrollSnapAlign: isMobile ? 'center' : 'none'
                  }}
                >
                  <VideoThumbnail
                    project={project}
                    index={index}
                    onHover={isMobile ? () => {} : handleVideoHover}
                    onLeave={isMobile ? () => {} : handleVideoLeave}
                    onClick={handleVideoClick}
                    isActive={activeProjectIndex === index}
                  />
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Social Media Icons on Right Side */}
        <div className="fixed right-6 top-1/2 transform -translate-y-1/2 z-40">
          <div className="flex flex-col space-y-4">
            <a 
              href="https://instagram.com/franciscopuyol" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-6 h-6 flex items-center justify-center text-white/50 hover:text-red-500 transition-colors duration-300"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a 
              href="https://www.linkedin.com/in/francisco-puyol-ba380442/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-6 h-6 flex items-center justify-center text-white/50 hover:text-red-500 transition-colors duration-300"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
            <a 
              href="https://vimeo.com/franciscopuyol" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-6 h-6 flex items-center justify-center text-white/50 hover:text-red-500 transition-colors duration-300"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.522 3.01 7.522c-.179 0-.806.378-1.881 1.132L0 7.197a315.065 315.065 0 003.501-3.128C5.08 2.701 6.266 1.984 7.055 1.91c1.867-.18 3.016 1.1 3.447 3.838.465 2.953.789 4.789.971 5.507.539 2.45 1.131 3.674 1.776 3.674.502 0 1.256-.796 2.265-2.385 1.004-1.589 1.54-2.797 1.612-3.628.144-1.371-.395-2.061-1.614-2.061-.574 0-1.167.121-1.777.391 1.186-3.868 3.434-5.757 6.762-5.637 2.473.06 3.628 1.664 3.493 4.797l-.013.01z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Footer */}
        <footer className="py-12 px-4 md:px-8 border-t border-white/10">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-gray-400 text-sm">
              © 2024 Francisco Puyol. Crafting visual stories that matter.
            </p>
            

          </div>
        </footer>
      </div>
    </div>
  );
}
