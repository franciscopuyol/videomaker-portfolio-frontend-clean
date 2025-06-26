import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import VideoThumbnail from '../components/VideoThumbnail';
import Navigation from '../components/Navigation';
import CustomCursor from '../components/CustomCursor';
import { type PortfolioProject } from '../lib/portfolio-data';
import type { Project } from '@shared/schema';

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

export default function Index() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Fetch published projects from API
  const { data: dbProjects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    retry: false,
  });

  // Convert database projects to portfolio format
  const portfolioProjects = dbProjects.map(convertToPortfolioProject);
  
  // Get unique categories for filtering
  const allCategories = ['All', ...Array.from(new Set(portfolioProjects.map(p => p.category).filter(Boolean)))];
  
  // Filter projects based on selected category
  const filteredProjects = selectedCategory === 'All' 
    ? portfolioProjects 
    : portfolioProjects.filter(p => p.category === selectedCategory);

  // Video click handler
  const handleVideoClick = (project: PortfolioProject) => {
    setLocation(`/video/${project.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <CustomCursor />
      <Navigation activeSection="index" />
      
      

      {/* Header with Category Filters */}
      <div className="pt-20 md:pt-24 pb-6 md:pb-8 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Smaller, cleaner title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-semibold tracking-tight mb-6 text-center"
            style={{
              fontFamily: '"Helvetica Neue", Arial, sans-serif'
            }}
          >
            Projects
          </motion.h1>

          {/* Refined Category Filter Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-2 mb-6 md:mb-8"
          >
            {allCategories.map((category) => (
              <motion.button
                key={category}
                onClick={() => setSelectedCategory(category)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-full text-sm font-medium tracking-wide transition-all duration-300 min-h-[44px] touch-manipulation ${
                  selectedCategory === category
                    ? 'text-red-500 border border-red-500 bg-transparent'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                {category}
              </motion.button>
            ))}
          </motion.div>

          {/* Filter Status */}
          <div className="text-center">
            <p className="text-white/60 text-sm font-light">
              {selectedCategory === 'All' 
                ? `${portfolioProjects.length} projects`
                : `${filteredProjects.length} projects in ${selectedCategory}`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 pb-20">
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {portfolioProjects.map((project, index) => {
            const isHighlighted = selectedCategory === 'All' || project.category === selectedCategory;
            
            return (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 1, scale: 1 }}
                animate={{ 
                  opacity: isHighlighted ? 1 : 0.3,
                  scale: isHighlighted ? 1 : 0.95,
                  filter: isHighlighted ? 'blur(0px)' : 'blur(2px)'
                }}
                transition={{ 
                  duration: 0.3, 
                  ease: "easeInOut" 
                }}
                className="relative group cursor-pointer hover:scale-105 transition-all duration-300"
                onClick={() => handleVideoClick(project)}
              >
                {/* Project Thumbnail - Fixed 16:9 aspect ratio */}
                <div className="relative aspect-video overflow-hidden rounded-lg bg-gray-900">
                  {project.thumbnailUrl ? (
                    <img
                      src={project.thumbnailUrl}
                      alt={project.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/50 text-sm">
                      No Thumbnail
                    </div>
                  )}
                  
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 5v10l8-5-8-5z"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Project Info - Consistent Typography */}
                <div className="mt-3">
                  <h3 className="text-base font-medium text-white/80 tracking-wide mb-1">{project.title}</h3>
                  <div className="text-sm opacity-60 font-light tracking-wide text-white/70 space-y-0.5">
                    {project.client && <div>{project.client}</div>}
                    <div className="flex items-center gap-2 text-xs">
                      {project.category && <span>{project.category}</span>}
                      {project.category && project.year && <span>•</span>}
                      {project.year && <span>{project.year}</span>}
                    </div>
                  </div>
                </div>

                {/* Category Tag - Always visible for context */}
                {project.category && (
                  <span className="absolute top-3 left-3 px-2 py-1 border border-red-500 rounded-full text-xs text-red-500 opacity-80 backdrop-blur-sm tracking-wide uppercase">
                    {project.category}
                  </span>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* Empty State */}
        {filteredProjects.length === 0 && selectedCategory !== 'All' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <p className="text-white/60 text-xl mb-4">No projects found in {selectedCategory}</p>
            <button
              onClick={() => setSelectedCategory('All')}
              className="px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-white/90 transition-colors"
            >
              View All Projects
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}