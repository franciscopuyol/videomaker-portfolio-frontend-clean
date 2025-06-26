export interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl?: string;
  vimeoId?: string;
  category: string;
  year: number;
  featured: boolean;
  client?: string;
  agency?: string;
}

// Static portfolio data removed - all projects now come from API
export const portfolioProjects: PortfolioProject[] = [];

export const featuredProjects = portfolioProjects.filter(project => project.featured);

// No placeholder content - all videos come from actual uploaded projects