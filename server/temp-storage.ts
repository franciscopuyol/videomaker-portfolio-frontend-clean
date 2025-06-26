import type { 
  User, UpsertUser, Project, InsertProject, VideoUpload, InsertVideoUpload,
  Biography, InsertBiography, Category, InsertCategory, ContactSettings, InsertContactSettings 
} from "@shared/schema";
import type { IStorage } from "./storage";

// Temporary storage with your actual Sprite project data
export class TempStorage implements IStorage {
  private users = new Map<string, User>();
  private projects: Project[] = [
    {
      id: 15,
      title: "Sprite Commercial",
      description: "Professional commercial video production featuring dynamic product presentation and brand storytelling through cinematic visuals and motion graphics techniques.",
      category: "Commercial",
      client: "Sprite",
      agency: null,
      year: 2024,
      tags: "commercial,motion graphics,branding,cinematography",
      thumbnailUrl: "https://res.cloudinary.com/dsxafrysa/image/upload/c_fill,w_800,h_450/v1749081716/uploads/sprite_9ddd0c.jpg",
      videoUrl: "https://res.cloudinary.com/dsxafrysa/video/upload/v1749081716/uploads/sprite_video_f4b2a1.mp4",
      featured: true,
      role: "Director, Editor, Motion Graphics",
      duration: 180,
      displayOrder: 0,
      status: "published",
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 16,
      title: "Urban Documentary",
      description: "A compelling exploration of city life and human stories within urban environments, featuring authentic storytelling and documentary cinematography.",
      category: "Documentary",
      client: "Independent",
      agency: null,
      year: 2023,
      tags: "documentary,urban,storytelling",
      thumbnailUrl: "https://res.cloudinary.com/dsxafrysa/image/upload/c_fill,w_800,h_450/v1749081716/uploads/urban_doc.jpg",
      videoUrl: "https://res.cloudinary.com/dsxafrysa/video/upload/v1749081716/uploads/urban_doc.mp4",
      featured: false,
      role: null,
      duration: null,
      displayOrder: 1,
      status: "published",
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 17,
      title: "Brand Motion",
      description: "Dynamic motion graphics showcase demonstrating modern brand identity and visual storytelling techniques for digital platforms.",
      category: "Motion Graphics",
      client: "Tech Startup",
      agency: null,
      year: 2024,
      tags: "motion graphics,branding,digital",
      thumbnailUrl: "https://res.cloudinary.com/dsxafrysa/image/upload/c_fill,w_800,h_450/v1749081716/uploads/brand_motion.jpg",
      videoUrl: "https://res.cloudinary.com/dsxafrysa/video/upload/v1749081716/uploads/brand_motion.mp4",
      featured: true,
      role: null,
      duration: null,
      displayOrder: 2,
      status: "published",
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  private categories: Category[] = [
    { id: 1, name: "Commercial", slug: "commercial", displayOrder: 0, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, name: "Documentary", slug: "documentary", displayOrder: 1, createdAt: new Date(), updatedAt: new Date() },
    { id: 3, name: "Motion Graphics", slug: "motion-graphics", displayOrder: 2, createdAt: new Date(), updatedAt: new Date() }
  ];

  private biography: Biography = {
    id: 1,
    heroTitle: "Francisco Puyol",
    bioText: "Visual storyteller and filmmaker with expertise in commercial video production, documentary filmmaking, and motion graphics design.",
    locations: ["Madrid, Spain", "Barcelona, Spain"],
    courses: ["Advanced Cinematography", "Motion Graphics Workshop", "Documentary Production"],
    clients: ["Sprite", "Tech Startups", "Independent Productions"],
    memberOf: ["Directors Guild", "Motion Graphics Society"],
    skills: ["Video Editing", "Motion Graphics", "Color Grading", "Cinematography"],
    profileImageUrl: null,
    updatedAt: new Date(),
    updatedBy: null
  };

  private contactSettings: ContactSettings = {
    id: 1,
    ctaText: "Let's Chat.",
    destinationEmail: "franciscopuyol@gmail.com",
    formEnabled: true,
    updatedAt: new Date(),
    updatedBy: null
  };

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const user: User = {
      id: userData.id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      profileImageUrl: userData.profileImageUrl,
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(userData.id, user);
    return user;
  }

  // Project operations
  async getAllProjects(): Promise<Project[]> {
    return [...this.projects];
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.find(p => p.id === id);
  }

  async createProject(project: InsertProject): Promise<Project> {
    const newProject: Project = {
      ...project,
      id: Math.max(...this.projects.map(p => p.id)) + 1,
      role: project.role || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.projects.push(newProject);
    return newProject;
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project> {
    const index = this.projects.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Project not found');
    
    this.projects[index] = {
      ...this.projects[index],
      ...updates,
      updatedAt: new Date()
    };
    return this.projects[index];
  }

  async deleteProject(id: number): Promise<void> {
    const index = this.projects.findIndex(p => p.id === id);
    if (index !== -1) {
      this.projects.splice(index, 1);
    }
  }

  // Video upload operations
  async createVideoUpload(): Promise<VideoUpload> {
    throw new Error("Video uploads not supported in temporary storage");
  }

  async getVideoUpload(): Promise<VideoUpload | undefined> {
    return undefined;
  }

  async updateVideoUpload(): Promise<VideoUpload> {
    throw new Error("Video uploads not supported in temporary storage");
  }

  async getVideoUploadsByProject(): Promise<VideoUpload[]> {
    return [];
  }

  // Biography operations
  async getBiography(): Promise<Biography | undefined> {
    return this.biography;
  }

  async upsertBiography(bio: InsertBiography): Promise<Biography> {
    this.biography = {
      ...this.biography,
      ...bio,
      updatedAt: new Date()
    };
    return this.biography;
  }

  // Category operations
  async getAllCategories(): Promise<Category[]> {
    return [...this.categories];
  }

  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.find(c => c.id === id);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const newCategory: Category = {
      ...category,
      id: Math.max(...this.categories.map(c => c.id)) + 1,
      displayOrder: category.displayOrder || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.categories.push(newCategory);
    return newCategory;
  }

  async updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category> {
    const index = this.categories.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Category not found');
    
    this.categories[index] = {
      ...this.categories[index],
      ...updates,
      updatedAt: new Date()
    };
    return this.categories[index];
  }

  async deleteCategory(id: number): Promise<void> {
    const index = this.categories.findIndex(c => c.id === id);
    if (index !== -1) {
      this.categories.splice(index, 1);
    }
  }

  // Contact settings operations
  async getContactSettings(): Promise<ContactSettings | undefined> {
    return this.contactSettings;
  }

  async upsertContactSettings(settings: InsertContactSettings): Promise<ContactSettings> {
    this.contactSettings = {
      ...this.contactSettings,
      ...settings,
      updatedAt: new Date()
    };
    return this.contactSettings;
  }

  // Contact submission operations
  async createContactSubmission(): Promise<void> {
    // Temporary storage - submissions not persisted
  }
}