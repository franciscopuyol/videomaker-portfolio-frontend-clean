import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, Link } from 'wouter';
import { useAuth } from '@/hooks/useAuth';

interface NavigationProps {
  activeSection: string;
}

export default function Navigation({ activeSection }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();

  const navigateTo = (sectionId: string) => {
    if (sectionId === 'work') {
      setLocation('/');
      setTimeout(() => {
        const element = document.getElementById('work');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else if (sectionId === 'index') {
      setLocation('/index');
    } else if (sectionId === 'bio') {
      setLocation('/bio');
    } else if (sectionId === 'information') {
      setLocation('/information');
    }
    setMobileMenuOpen(false);
  };

  const isHomePage = (location === '/');

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="w-full px-4 sm:px-6 md:px-8 py-3 md:py-4">
          <div className="flex justify-between items-center">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-base sm:text-lg md:text-xl font-bold tracking-wider text-white text-left"
              style={{ fontFamily: 'Oswald, sans-serif' }}
            >
              <div>
                <Link href="/" className="nav-link hover:text-red-500 transition-all duration-200 hover:scale-105 transform relative">
                  Francisco Puyol
                </Link>
                {!isHomePage && (
                  <div className="text-sm text-gray-300 mt-1">
                    <button onClick={() => navigateTo('work')} className="hover:text-red-500 transition-all duration-200">← Back to Work</button>
                  </div>
                )}
              </div>
            </motion.div>

            <div className="hidden md:flex items-center justify-center flex-1 space-x-8 lg:space-x-12">
              <button onClick={() => navigateTo('work')} className={`nav-link text-sm font-medium ${(location === '/' || location.startsWith('/video/')) ? 'text-red-500' : 'text-white hover:text-red-500'}`} style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>Work</button>
              <button onClick={() => navigateTo('index')} className={`nav-link text-sm font-medium ${location === '/index' ? 'text-red-500' : 'text-white hover:text-red-500'}`} style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>Index</button>
            </div>

            <div className="hidden md:flex items-center space-x-8 lg:space-x-12">
              <button onClick={() => navigateTo('bio')} className={`nav-link text-sm font-medium ${location === '/bio' ? 'text-red-500' : 'text-white hover:text-red-500'}`} style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>Bio</button>
              <button onClick={() => navigateTo('information')} className={`nav-link text-sm font-medium ${location === '/information' ? 'text-red-500' : 'text-white hover:text-red-500'}`} style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>Contacts</button>
            </div>

            <div className="md:hidden flex items-center">
              <button className="text-white hover:text-red-500 transition-all duration-200 p-1.5 ml-[-75px] mr-[-75px]" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>
      {mobileMenuOpen && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
          className="fixed inset-0 z-40 bg-black/95 backdrop-blur-sm md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="flex flex-col items-center justify-center h-full space-y-8 px-6">
            {[
              { id: 'work', label: 'Home', active: location === '/' || location.startsWith('/video/') },
              { id: 'index', label: 'Index', active: location === '/index' },
              { id: 'bio', label: 'Bio', active: location === '/bio' },
              { id: 'information', label: 'Contacts', active: location === '/information' }
            ].map((item, index) => (
              <button key={index} onClick={() => navigateTo(item.id)} className="text-white hover:text-red-500 transition-all duration-200 p-1.5 ml-[-75px] mr-[-75px]" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
                {item.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </>
  );
}