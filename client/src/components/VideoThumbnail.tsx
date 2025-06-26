import { motion } from 'framer-motion';
import type { PortfolioProject } from '../lib/portfolio-data';

interface VideoThumbnailProps {
  project: PortfolioProject;
  index: number;
  onHover: (project: PortfolioProject) => void;
  onLeave: () => void;
  onClick: (project: PortfolioProject) => void;
  isActive: boolean;
}

export default function VideoThumbnail({ 
  project, 
  index, 
  onHover, 
  onLeave, 
  onClick, 
  isActive 
}: VideoThumbnailProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      onClick={() => onClick(project)}
      className={`video-thumbnail-new aspect-[16/10] rounded-lg overflow-hidden relative border-2 transition-all duration-300 w-full max-w-xs mx-auto cursor-pointer touch-manipulation ${
        isActive ? 'border-white/50' : 'border-transparent'
      }`}
      style={{ minHeight: 'clamp(180px, 25vh, 220px)' }}
    >
      {/* Thumbnail/Video Layer - optimized transitions */}
      <div className={`w-full h-full transition-opacity duration-200 ease-out ${isActive ? 'opacity-0' : 'opacity-100'}`}>
        {project.thumbnailUrl ? (
          <img
            src={project.thumbnailUrl}
            alt={project.title}
            className="w-full h-full object-cover"
            onMouseEnter={() => onHover(project)}
            onMouseLeave={onLeave}
          />
        ) : project.videoUrl ? (
          <video
            src={project.videoUrl}
            className="w-full h-full object-cover"
            muted
            playsInline
            webkit-playsinline="true"
            x5-playsinline="true"
            disableRemotePlayback
            preload="metadata"
            onLoadedMetadata={(e) => {
              const video = e.target as HTMLVideoElement;
              video.currentTime = 0;
            }}
            onMouseEnter={() => onHover(project)}
            onMouseLeave={onLeave}
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-sm mb-1">{project.category}</div>
              <div className="text-lg font-medium text-white">{project.title}</div>
              {project.client && <div className="text-sm">{project.client}</div>}
            </div>
          </div>
        )}
      </div>
      
      {/* Overlay - optimized for smooth transitions */}
      <div 
        className={`absolute inset-0 transition-all duration-200 ease-out ${
          isActive ? 'bg-transparent opacity-0' : 'bg-black/80 opacity-100'
        }`}
        onMouseEnter={() => onHover(project)}
        onMouseLeave={onLeave}
      />
      
      {/* Project title overlay - two line format */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center px-4">
          <h3 className="text-lg font-medium leading-tight" style={{ fontFamily: 'Work Sans, sans-serif', color: '#FF0000' }}>
            {project.title}
          </h3>
          {(project.client || project.agency) && (
            <p className="text-sm mt-1" style={{ fontFamily: 'Work Sans, sans-serif', color: '#FF0000' }}>
              {project.client || project.agency}
            </p>
          )}
        </div>
      </div>
      
      {/* DaVinci Resolve Style Progress Bar - Vertical Line Moving Horizontally */}
      {isActive && (
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-lg"
            style={{
              animation: 'playhead 8s linear infinite',
              boxShadow: '0 0 6px rgba(239, 68, 68, 0.8), 0 0 12px rgba(239, 68, 68, 0.4)'
            }}
          />
        </div>
      )}
    </motion.div>
  );
}
