import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Admin users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("user"), // 'admin' or 'user'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Categories table for project categorization
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Portfolio projects table with enhanced video management
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"), // Can be uploaded or auto-generated
  videoUrl: text("video_url"), // Direct file path to uploaded video
  category: text("category"),
  year: integer("year"),
  featured: boolean("featured").default(false),
  client: text("client"),
  agency: text("agency"),
  role: text("role"), // Project role (e.g., "Editing, Motion, Color")
  tags: text("tags"), // Comma-separated tags
  duration: integer("duration"), // Video duration in seconds
  displayOrder: integer("display_order").default(0), // Manual sorting order
  status: varchar("status").notNull().default("draft"), // 'draft', 'published', 'processing'
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Video uploads table for direct video hosting
export const videoUploads = pgTable("video_uploads", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  originalFileName: text("original_file_name").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  duration: integer("duration"), // Video duration in seconds
  uploadStatus: varchar("upload_status").notNull().default("uploading"), // 'uploading', 'processing', 'completed', 'failed'
  processingProgress: integer("processing_progress").default(0),
  errorMessage: text("error_message"),
  thumbnailFileName: text("thumbnail_file_name"), // Generated or uploaded thumbnail
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  description: text("description"), // Optional description for the video
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Biography content table for admin-editable about page
export const biography = pgTable("biography", {
  id: serial("id").primaryKey(),
  heroTitle: text("hero_title"), // Hero title text
  bioText: text("bio_text"), // Short biography paragraph
  locations: text("locations").array(), // Array of locations
  courses: text("courses").array(), // Array of courses & workshops
  clients: text("clients").array(), // Array of clients
  memberOf: text("member_of").array(), // Array of memberships
  skills: text("skills").array(), // Array of skills
  profileImageUrl: text("profile_image_url"), // Profile photo URL
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

// Contact settings table for admin-editable contact configuration
export const contactSettings = pgTable("contact_settings", {
  id: serial("id").primaryKey(),
  ctaText: text("cta_text").notNull().default("Let's Chat."),
  destinationEmail: text("destination_email").notNull().default("franciscopuyol@gmail.com"),
  formEnabled: boolean("form_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

// Contact submissions table to store all form submissions
export const contactSubmissions = pgTable("contact_submissions", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull(),
  message: text("message").notNull(),
  status: varchar("status").notNull().default("pending"), // 'pending', 'sent', 'failed'
  submittedAt: timestamp("submitted_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

// Relations
export const projectsRelations = relations(projects, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [projects.createdBy],
    references: [users.id],
  }),
  uploads: many(videoUploads),
}));

export const videoUploadsRelations = relations(videoUploads, ({ one }) => ({
  project: one(projects, {
    fields: [videoUploads.projectId],
    references: [projects.id],
  }),
  uploadedBy: one(users, {
    fields: [videoUploads.uploadedBy],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  uploads: many(videoUploads),
}));

export const biographyRelations = relations(biography, ({ one }) => ({
  updatedBy: one(users, {
    fields: [biography.updatedBy],
    references: [users.id],
  }),
}));

export const contactSettingsRelations = relations(contactSettings, ({ one }) => ({
  updatedBy: one(users, {
    fields: [contactSettings.updatedBy],
    references: [users.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  projects: many(projects),
}));

// Schema validations
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  role: true,
});

export const upsertUserSchema = createInsertSchema(users);

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  duration: z.number().optional(),
});

export const insertVideoUploadSchema = createInsertSchema(videoUploads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  duration: z.number().optional(),
  thumbnailFileName: z.string().optional(),
});

export const insertBiographySchema = createInsertSchema(biography).omit({
  id: true,
  updatedAt: true,
}).extend({
  locations: z.array(z.string()).optional(),
  courses: z.array(z.string()).optional(),
  clients: z.array(z.string()).optional(),
  memberOf: z.array(z.string()).optional(),
  contacts: z.record(z.string()).optional(),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContactSettingsSchema = createInsertSchema(contactSettings).omit({
  id: true,
  updatedAt: true,
});

export const contactFormSchema = z.object({
  name: z.string().optional(),
  email: z.string().email("Please enter a valid email address"),
  message: z.string().min(10, "Message must be at least 10 characters long"),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type VideoUpload = typeof videoUploads.$inferSelect;
export type InsertVideoUpload = z.infer<typeof insertVideoUploadSchema>;
export type Biography = typeof biography.$inferSelect;
export type InsertBiography = z.infer<typeof insertBiographySchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type ContactSettings = typeof contactSettings.$inferSelect;
export type InsertContactSettings = z.infer<typeof insertContactSettingsSchema>;
export type ContactForm = z.infer<typeof contactFormSchema>;
