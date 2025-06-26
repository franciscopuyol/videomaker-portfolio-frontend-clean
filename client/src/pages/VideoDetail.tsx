import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Play } from 'lucide-react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import CustomCursor from '../components/CustomCursor';
import Navigation from '../components/Navigation';
import VimeoPlayer from '../components/VimeoPlayer';
import { type PortfolioProject } from '../lib/portfolio-data';
import type { Project } from '@shared/schema';

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

export default function VideoDetail() {
  const [location, setLocation] = useLocation();
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const projectId = location.split('/video/')[1];
  const { data: dbProjects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    retry: false,
  });
  const portfolioProjects = dbProjects.map(convertToPortfolioProject);
  const project = portfolioProjects.find(p => p.id === projectId);

  // Scroll to top when component mounts and when project changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (project) {
      window.scrollTo(0, 0);
    }
  }, [project]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white relative overflow-x-hidden">
        <CustomCursor />
        
        {/* Show navigation immediately while loading */}
        <div className="fixed top-4 left-4 z-40">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setLocation('/')}
            className="text-white/80 hover:text-red-500 text-sm font-light tracking-wide transition-all duration-300 hover:scale-105 min-h-[44px] touch-manipulation flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Work</span>
          </motion.button>
        </div>

        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
            <div className="text-lg text-gray-300">Loading project...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-black text-white relative overflow-x-hidden">
        <CustomCursor />
        <Navigation activeSection="video" />
        
        <div className="absolute top-16 sm:top-20 md:top-4 left-4 z-50">
          <motion.button
            onClick={() => setLocation('/')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors duration-200 bg-black/50 backdrop-blur-sm px-3 py-2 rounded-lg"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Work</span>
          </motion.button>
        </div>
        
        <div className="flex items-center justify-center h-screen">
          <div className="text-xl">Project not found</div>
        </div>
      </div>
    );
  }

  const relatedProjects = portfolioProjects.filter(p => p.id !== project.id).slice(0, 6);

  return (
    <div className="min-h-screen bg-black text-white relative overflow-x-hidden">
      <CustomCursor />
      <Navigation activeSection="video" />
      {/* 1. Hero Section */}
      <div className="bg-black pt-8 md:pt-12 pb-1 sm:pb-2 md:pb-4 video-detail-hero mt-[37px] mb-[37px]">
        <div className="w-full mx-auto px-4 md:px-6 text-center">
          {/* Project Title */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            viewport={{ once: true }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl xl:text-7xl font-black uppercase tracking-tight leading-none text-white mb-1 md:mb-4 text-center hero-title site-title"
            style={{ fontFamily: '"Satoshi Black", "General Sans Black", "Inter Black", system-ui, sans-serif', fontWeight: 900, letterSpacing: '-0.015em', lineHeight: 1.1 }}
          >
            {project.title}
          </motion.h1>

          {/* Project Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
            viewport={{ once: true }}
            className="text-gray-300 text-lg md:text-xl font-light tracking-wide mb-3 md:mb-0"
            style={{ fontFamily: '"Helvetica Neue", Arial, sans-serif' }}
          >
            {[
              project.client || 'Puyol Films',
              project.category || 'Documentary',
              `${project.year || new Date().getFullYear()} — 02'59"`
            ].join(' • ')}
          </motion.p>
        </div>
      </div>
      {/* 2. Watch Full Video Section */}
      <div className="bg-black pt-1 sm:pt-2 md:pt-4 pb-4 sm:pb-6 md:pb-12 watch-video-section section-spacing video-detail-content">
        <div className="max-w-5xl mx-auto px-4 md:px-6 mt-[32px] mb-[32px]">
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            viewport={{ once: true }}
            className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-4 md:mb-8 text-center"
            style={{ fontFamily: 'Oswald, sans-serif', color: '#FF0000' }}
          >
            Watch Full Video
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
            viewport={{ once: true }}
            className="relative aspect-video bg-black rounded-lg overflow-hidden group mx-auto max-h-[60vh] sm:max-h-none"
          >
            {project.videoUrl ? (
              <>
                <video
                  controls
                  className="w-full h-full"
                  src={project.videoUrl}
                  preload="none"
                  playsInline
                  webkit-playsinline="true"
                  x5-playsinline="true"
                  disableRemotePlayback
                  poster={project.thumbnailUrl}
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                />
                {/* Custom Circular Play Button Overlay - Mobile Optimized */}
                {!isVideoPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        const video = e.currentTarget.parentElement?.parentElement?.querySelector('video');
                        if (video) {
                          video.play();
                          setIsVideoPlaying(true);
                        }
                      }}
                      className="w-12 h-12 bg-red-600/80 hover:bg-red-700/90 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg touch-manipulation"
                    >
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <div className="text-gray-400">No video available</div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
      {/* 3. Project Details Section */}
      <div className="bg-black py-6 md:py-12 section-spacing video-detail-content">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-3 gap-6 sm:gap-8 md:gap-12 project-info-grid">
            {/* Left Column - About This Project */}
            <div className="lg:col-span-2 text-center lg:text-left">
              <motion.h2
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                viewport={{ once: true }}
                className="text-2xl md:text-3xl font-bold mb-6"
                style={{ fontFamily: 'Oswald, sans-serif', color: '#FF0000' }}
              >
                About This Project
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
                viewport={{ once: true }}
                className="text-lg text-gray-300 leading-relaxed"
                style={{ fontFamily: 'Work Sans, sans-serif' }}
              >
                {project.description}
              </motion.p>
            </div>
            
            {/* Right Column - Project Info */}
            <div className="text-center lg:text-right">
              <motion.h3
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
                viewport={{ once: true }}
                className="text-2xl font-bold mb-6"
                style={{ fontFamily: 'Oswald, sans-serif', color: '#FF0000' }}
              >
                Project Info
              </motion.h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-6" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                {/* Column 1 */}
                <div className="space-y-4">
                  {project.client && (
                    <motion.div
                      initial={{ opacity: 0, y: 40 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.3 }}
                      viewport={{ once: true }}
                      className="text-center lg:text-right"
                    >
                      <div className="text-gray-400 text-sm uppercase tracking-wide">Client</div>
                      <div className="text-white text-lg">{project.client}</div>
                    </motion.div>
                  )}
                  {project.agency && (
                    <motion.div
                      initial={{ opacity: 0, y: 40 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.4 }}
                      viewport={{ once: true }}
                      className="text-center lg:text-right"
                    >
                      <div className="text-gray-400 text-sm uppercase tracking-wide">Agency</div>
                      <div className="text-white text-lg">{project.agency}</div>
                    </motion.div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.5 }}
                    viewport={{ once: true }}
                    className="text-center lg:text-right"
                  >
                    <div className="text-gray-400 text-sm uppercase tracking-wide">Category</div>
                    <div className="text-white text-lg">{project.category}</div>
                  </motion.div>
                </div>
                
                {/* Column 2 */}
                <div className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.6 }}
                    viewport={{ once: true }}
                    className="text-center lg:text-right"
                  >
                    <div className="text-gray-400 text-sm uppercase tracking-wide">Year</div>
                    <div className="text-white text-lg">{project.year}</div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.7 }}
                    viewport={{ once: true }}
                    className="text-center lg:text-right"
                  >
                    <div className="text-gray-400 text-sm uppercase tracking-wide">Duration</div>
                    <div className="text-white text-lg">02'59"</div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* 4. More Works Section */}
      <div className="bg-black py-6 md:py-16 section-spacing">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            viewport={{ once: true }}
            className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-6 sm:mb-8 md:mb-12 text-center"
            style={{ fontFamily: 'Oswald, sans-serif', color: '#FF0000' }}
          >
            More Works
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {relatedProjects.map((relatedProject, index) => (
              <motion.div
                key={relatedProject.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.6, 
                  ease: [0.25, 0.46, 0.45, 0.94], 
                  delay: index * 0.1 
                }}
                viewport={{ once: true }}
                onClick={() => setLocation(`/video/${relatedProject.id}`)}
                className="group cursor-pointer touch-manipulation"
              >
                <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden mb-4">
                  <img
                    src={relatedProject.thumbnailUrl}
                    alt={relatedProject.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <span className="text-red-500 text-lg font-medium view-project-button" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                      View Project
                    </span>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-red-400 transition-colors text-white" style={{ fontFamily: 'Oswald, sans-serif' }}>
                  {relatedProject.title}
                </h3>
                <p className="text-gray-400 text-sm" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                  {relatedProject.category} • {relatedProject.year}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}