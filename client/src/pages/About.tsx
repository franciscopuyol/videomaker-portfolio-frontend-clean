import { motion } from "framer-motion";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import CustomCursor from "@/components/CustomCursor";
import Navigation from "@/components/Navigation";
import type { Biography } from "@shared/schema";

export default function About() {
  const [location] = useLocation();
  const { data: biography } = useQuery<Biography>({
    queryKey: ["/api/biography"],
  });

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  // Default content if no biography data exists
  const defaultHeroTitle = "I tell stories with motion, sound and a cinematic eye.";
  const defaultBio = "Francisco Puyol is a filmmaker and motion designer focused on visual storytelling across digital platforms. With a strong cinematic sensibility and detail-oriented approach, he brings depth and rhythm to every frame.";
  const defaultLocations = ["Brazil 🇧🇷", "Argentina 🇦🇷", "Uruguay 🇺🇾", "USA 🇺🇸"];
  const defaultCourses = [
    "Color Grading for Storytelling – Domestika",
    "Cinematic Composition – FutureLearn", 
    "Creative Editing Techniques – Masterclass"
  ];
  const defaultClients = ["Netflix", "Itaú", "Amstel", "Sanofi", "Sesc"];
  const defaultMemberOf = ["Puyol Films"];
  const defaultSkills = ["Motion Design", "Color Grading", "Video Editing", "Cinematography", "Storytelling"];

  const heroTitle = biography?.heroTitle || defaultHeroTitle;
  const bioText = biography?.bioText || defaultBio;
  const locations = biography?.locations || defaultLocations;
  const courses = biography?.courses || defaultCourses;
  const clients = biography?.clients || defaultClients;
  const memberOf = biography?.memberOf || defaultMemberOf;
  const skills = biography?.skills || defaultSkills;

  return (
    <div className="min-h-screen bg-black text-white relative overflow-x-hidden">
      <CustomCursor />
      <Navigation activeSection="about" />
      
      <div className="relative z-10 pt-32 pb-16 px-6">
        <div className="w-full">
          {/* Full Width Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 min-h-screen">
            
            {/* Left Two Thirds - Content */}
            <div className="lg:col-span-2 flex flex-col justify-between">
              
              <div>
                {/* Top Tagline */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  className="mb-8 relative z-30"
                >
                  <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black leading-tight text-white" style={{ fontFamily: '"Satoshi Black", "General Sans Black", "Inter Black", system-ui, sans-serif', fontWeight: 900, letterSpacing: '-0.015em', lineHeight: 1.1 }}>
                    {heroTitle}
                  </h1>
                </motion.div>

                {/* Biography Paragraph */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="mb-16"
                >
                  <p className="text-lg lg:text-xl leading-tight text-white font-bold max-w-3xl" style={{ fontFamily: '"Inter Bold", "Satoshi SemiBold", "General Sans SemiBold", system-ui, sans-serif', fontWeight: 700, lineHeight: 1.4 }}>
                    {bioText}
                  </p>
                </motion.div>

                {/* Grouped Sections Below Bio */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8"
                >
                  {/* Locations */}
                  <div>
                    <h3 className="text-sm font-bold mb-4 text-red-500 uppercase tracking-wider" style={{ fontFamily: '"Inter Bold", "Satoshi Bold", system-ui, sans-serif', fontWeight: 700 }}>
                      LOCATIONS
                    </h3>
                    <div className="space-y-2">
                      {locations.map((location, index) => (
                        <div key={index} className="text-gray-300 text-sm font-semibold" style={{ fontFamily: '"Inter SemiBold", "Satoshi Medium", system-ui, sans-serif', fontWeight: 600 }}>
                          {location}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Selected Clients */}
                  <div>
                    <h3 className="text-sm font-bold mb-4 text-red-500 uppercase tracking-wider" style={{ fontFamily: '"Inter Bold", "Satoshi Bold", system-ui, sans-serif', fontWeight: 700 }}>
                      SELECTED CLIENTS
                    </h3>
                    <div className="space-y-2">
                      {clients.map((client, index) => (
                        <div key={index} className="text-gray-300 text-sm font-semibold" style={{ fontFamily: '"Inter SemiBold", "Satoshi Medium", system-ui, sans-serif', fontWeight: 600 }}>
                          {client}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Courses & Workshops */}
                  <div>
                    <h3 className="text-sm font-bold mb-4 text-red-500 uppercase tracking-wider" style={{ fontFamily: '"Inter Bold", "Satoshi Bold", system-ui, sans-serif', fontWeight: 700 }}>
                      COURSES & WORKSHOPS
                    </h3>
                    <div className="space-y-2">
                      {courses.slice(0, 3).map((course, index) => (
                        <div key={index} className="text-gray-300 text-sm leading-tight font-semibold" style={{ fontFamily: '"Inter SemiBold", "Satoshi Medium", system-ui, sans-serif', fontWeight: 600, lineHeight: 1.3 }}>
                          {course}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Member Of */}
                  <div>
                    <h3 className="text-sm font-bold mb-4 text-red-500 uppercase tracking-wider" style={{ fontFamily: '"Inter Bold", "Satoshi Bold", system-ui, sans-serif', fontWeight: 700 }}>
                      MEMBER OF
                    </h3>
                    <div className="space-y-2">
                      {memberOf.map((member, index) => (
                        <div key={index} className="text-gray-300 text-sm font-semibold" style={{ fontFamily: '"Inter SemiBold", "Satoshi Medium", system-ui, sans-serif', fontWeight: 600 }}>
                          {member}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Skills */}
                  <div>
                    <h3 className="text-sm font-bold mb-4 text-red-500 uppercase tracking-wider" style={{ fontFamily: '"Inter Bold", "Satoshi Bold", system-ui, sans-serif', fontWeight: 700 }}>
                      SKILLS
                    </h3>
                    <div className="space-y-2">
                      {skills.map((skill, index) => (
                        <div key={index} className="text-gray-300 text-sm font-semibold" style={{ fontFamily: '"Inter SemiBold", "Satoshi Medium", system-ui, sans-serif', fontWeight: 600 }}>
                          {skill}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Name Spanning Full Screen Width */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="mt-12 mb-8 relative z-20 -mx-4 sm:-mx-6 lg:-mx-16 xl:-mx-24"
                >
                  <h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-9xl xl:text-[10rem] 2xl:text-[12rem] font-black text-white whitespace-nowrap px-4 sm:px-6 lg:px-16 xl:px-24 leading-none" style={{ fontFamily: '"Satoshi Black", "General Sans Black", "Inter Black", system-ui, sans-serif', fontWeight: 900, letterSpacing: '-0.02em' }}>
                    Francisco Puyol
                  </h2>
                </motion.div>
              </div>
            </div>

            {/* Right Side - Full Screen Portrait Image */}
            {biography?.profileImageUrl && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="lg:fixed lg:right-0 lg:top-0 lg:h-screen lg:w-1/2 flex items-center justify-end"
              >
                <img 
                  src={biography.profileImageUrl} 
                  alt="Francisco Puyol" 
                  className="w-full h-full max-w-md lg:max-w-none object-cover rounded-2xl lg:rounded-none shadow-2xl lg:shadow-none"
                  style={{ aspectRatio: '2/3' }}
                  onError={(e) => {
                    console.error('Image failed to load:', biography.profileImageUrl);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}