import {
  users,
  projects,
  videoUploads,
  biography,
  categories,
  contactSettings,
  contactSubmissions,
  type User,
  type UpsertUser,
  type Project,
  type InsertProject,
  type VideoUpload,
  type InsertVideoUpload,
  type Biography,
  type InsertBiography,
  type Category,
  type InsertCategory,
  type ContactSettings,
  type InsertContactSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Project operations
  getAllProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;
  
  // Video upload operations
  createVideoUpload(upload: InsertVideoUpload): Promise<VideoUpload>;
  getVideoUpload(id: number): Promise<VideoUpload | undefined>;
  updateVideoUpload(id: number, upload: Partial<InsertVideoUpload>): Promise<VideoUpload>;
  getVideoUploadsByProject(projectId: number): Promise<VideoUpload[]>;
  
  // Biography operations
  getBiography(): Promise<Biography | undefined>;
  upsertBiography(bio: InsertBiography): Promise<Biography>;
  
  // Category operations
  getAllCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;
  
  // Contact settings operations
  getContactSettings(): Promise<ContactSettings | undefined>;
  upsertContactSettings(settings: InsertContactSettings): Promise<ContactSettings>;
  
  // Contact submission operations
  createContactSubmission(submission: { name?: string; email: string; message: string; status: string }): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Project operations
  async getAllProjects(): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return project;
  }

  async createProject(projectData: InsertProject): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values(projectData)
      .returning();
    return project;
  }

  async updateProject(id: number, projectData: Partial<InsertProject>): Promise<Project> {
    const [project] = await db
      .update(projects)
      .set({ ...projectData, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: number): Promise<void> {
    // First delete associated video uploads to avoid foreign key constraint violation
    await db.delete(videoUploads).where(eq(videoUploads.projectId, id));
    
    // Then delete the project
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Video upload operations
  async createVideoUpload(uploadData: InsertVideoUpload): Promise<VideoUpload> {
    const [upload] = await db
      .insert(videoUploads)
      .values(uploadData)
      .returning();
    return upload;
  }

  async getVideoUpload(id: number): Promise<VideoUpload | undefined> {
    const [upload] = await db
      .select()
      .from(videoUploads)
      .where(eq(videoUploads.id, id));
    return upload;
  }

  async updateVideoUpload(id: number, uploadData: Partial<InsertVideoUpload>): Promise<VideoUpload> {
    const [upload] = await db
      .update(videoUploads)
      .set({ ...uploadData, updatedAt: new Date() })
      .where(eq(videoUploads.id, id))
      .returning();
    return upload;
  }

  async getVideoUploadsByProject(projectId: number): Promise<VideoUpload[]> {
    return await db
      .select()
      .from(videoUploads)
      .where(eq(videoUploads.projectId, projectId))
      .orderBy(desc(videoUploads.createdAt));
  }

  // Biography operations
  async getBiography(): Promise<Biography | undefined> {
    const [bio] = await db.select().from(biography).limit(1);
    return bio;
  }

  async upsertBiography(bioData: InsertBiography): Promise<Biography> {
    const existing = await this.getBiography();
    
    if (existing) {
      const [updated] = await db
        .update(biography)
        .set({ ...bioData, updatedAt: new Date() })
        .where(eq(biography.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(biography)
        .values(bioData)
        .returning();
      return created;
    }
  }

  // Category operations
  async getAllCategories(): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .orderBy(categories.displayOrder, categories.name);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id));
    return category;
  }

  async createCategory(categoryData: InsertCategory): Promise<Category> {
    const [category] = await db
      .insert(categories)
      .values(categoryData)
      .returning();
    return category;
  }

  async updateCategory(id: number, categoryData: Partial<InsertCategory>): Promise<Category> {
    const [category] = await db
      .update(categories)
      .set({ ...categoryData, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return category;
  }

  async deleteCategory(id: number): Promise<void> {
    await db
      .delete(categories)
      .where(eq(categories.id, id));
  }

  // Contact settings operations
  async getContactSettings(): Promise<ContactSettings | undefined> {
    const [settings] = await db
      .select()
      .from(contactSettings)
      .limit(1);
    return settings;
  }

  async upsertContactSettings(settingsData: InsertContactSettings): Promise<ContactSettings> {
    // First try to get existing settings
    const existing = await this.getContactSettings();
    
    if (existing) {
      // Update existing settings
      const [settings] = await db
        .update(contactSettings)
        .set({ ...settingsData, updatedAt: new Date() })
        .where(eq(contactSettings.id, existing.id))
        .returning();
      return settings;
    } else {
      // Create new settings
      const [settings] = await db
        .insert(contactSettings)
        .values(settingsData)
        .returning();
      return settings;
    }
  }

  // Contact submission operations
  async createContactSubmission(submission: { name?: string; email: string; message: string; status: string }): Promise<void> {
    await db.insert(contactSubmissions).values({
      name: submission.name || null,
      email: submission.email,
      message: submission.message,
      status: submission.status,
      submittedAt: new Date(),
    });
  }
}

// Temporary in-memory storage while database is down
class MemoryStorage implements IStorage {
  private users = new Map<string, User>();
  private projects: Project[] = [
    {
      id: 15,
      title: "Sprite",
      description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
      category: "Commercial",
      client: "Sprite",
      agency: null,
      year: 2024,
      tags: "motion,commercial",
      thumbnailUrl: "https://res.cloudinary.com/dsxafrysa/image/upload/c_fill,w_800,h_450/v1749081716/uploads/sprite_9ddd0c.jpg",
      videoUrl: "https://res.cloudinary.com/dsxafrysa/video/upload/v1749081716/uploads/sprite_video_f4b2a1.mp4",
      featured: true,
      role: null,
      duration: null,
      displayOrder: 0,
      status: "published",
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 16,
      title: "Documentary Short",
      description: "A compelling documentary exploring urban landscapes and human stories within the city environment.",
      category: "Documentary",
      client: "Independent",
      agency: null,
      year: 2023,
      tags: "documentary,urban",
      thumbnailUrl: "https://res.cloudinary.com/dsxafrysa/image/upload/c_fill,w_800,h_450/v1749081716/uploads/doc_thumb.jpg",
      videoUrl: "https://res.cloudinary.com/dsxafrysa/video/upload/v1749081716/uploads/doc_video.mp4",
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
      description: "Dynamic motion graphics piece showcasing modern brand identity and visual storytelling techniques.",
      category: "Motion Graphics",
      client: "Tech Startup",
      agency: null,
      year: 2024,
      tags: "motion graphics,branding",
      thumbnailUrl: "https://res.cloudinary.com/dsxafrysa/image/upload/c_fill,w_800,h_450/v1749081716/uploads/motion_thumb.jpg",
      videoUrl: "https://res.cloudinary.com/dsxafrysa/video/upload/v1749081716/uploads/motion_video.mp4",
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
  private biography: Biography | undefined;
  private categories: Category[] = [
    { id: 1, name: "Commercial", slug: "commercial", displayOrder: 0, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, name: "Documentary", slug: "documentary", displayOrder: 1, createdAt: new Date(), updatedAt: new Date() }
  ];
  private contactSettings: ContactSettings | undefined;

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const user: User = {
      id: userData.id,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(userData.id, user);
    return user;
  }

  async getAllProjects(): Promise<Project[]> {
    return this.projects;
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.find(p => p.id === id);
  }

  async createProject(projectData: InsertProject): Promise<Project> {
    const project: Project = {
      id: this.projects.length + 1,
      ...projectData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.projects.push(project);
    return project;
  }

  async updateProject(id: number, projectData: Partial<InsertProject>): Promise<Project> {
    const index = this.projects.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Project not found');
    
    this.projects[index] = {
      ...this.projects[index],
      ...projectData,
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

  async createVideoUpload(): Promise<VideoUpload> {
    throw new Error('Not implemented in memory storage');
  }

  async getVideoUpload(): Promise<VideoUpload | undefined> {
    return undefined;
  }

  async updateVideoUpload(): Promise<VideoUpload> {
    throw new Error('Not implemented in memory storage');
  }

  async getVideoUploadsByProject(): Promise<VideoUpload[]> {
    return [];
  }

  async getBiography(): Promise<Biography | undefined> {
    return this.biography || {
      id: 1,
      heroTitle: "I tell stories with motion, sound and a cinematic eye.",
      bioText: "Francisco Puyol is a filmmaker and motion designer focused on visual storytelling across digital platforms.",
      locations: ["Brazil 🇧🇷", "Argentina 🇦🇷"],
      courses: ["Color Grading for Storytelling – Domestika"],
      clients: ["Netflix", "Itaú", "Amstel"],
      memberOf: ["Puyol Films"],
      skills: ["Motion Design", "Video Editing"],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async upsertBiography(bioData: InsertBiography): Promise<Biography> {
    this.biography = {
      id: 1,
      ...bioData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return this.biography;
  }

  async getAllCategories(): Promise<Category[]> {
    return this.categories;
  }

  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.find(c => c.id === id);
  }

  async createCategory(categoryData: InsertCategory): Promise<Category> {
    const category: Category = {
      id: this.categories.length + 1,
      ...categoryData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.categories.push(category);
    return category;
  }

  async updateCategory(id: number, categoryData: Partial<InsertCategory>): Promise<Category> {
    const index = this.categories.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Category not found');
    
    this.categories[index] = {
      ...this.categories[index],
      ...categoryData,
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

  async getContactSettings(): Promise<ContactSettings | undefined> {
    return this.contactSettings || {
      id: 1,
      ctaText: "Let's Chat.",
      formEnabled: true,
      email: "franciscojpuyol@gmail.com",
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async upsertContactSettings(settingsData: InsertContactSettings): Promise<ContactSettings> {
    this.contactSettings = {
      id: 1,
      ...settingsData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return this.contactSettings;
  }

  async createContactSubmission(): Promise<void> {
    // Memory storage - submissions not persisted
  }
}

export const storage = new DatabaseStorage();