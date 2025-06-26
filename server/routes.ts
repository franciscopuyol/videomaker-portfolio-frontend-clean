import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import jwt from "jsonwebtoken";
import { insertProjectSchema, insertVideoUploadSchema, insertBiographySchema, insertCategorySchema, insertContactSettingsSchema, contactFormSchema, contactSubmissions } from "@shared/schema";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import compression from "compression";
import helmet from "helmet";
import NodeCache from "node-cache";
import { body, param, validationResult } from "express-validator";
import fs from "fs";
import path from "path";
import { generateContentSuggestions, improveExistingContent, generateAutoDescription, translateContent, generateSEOContent } from "./openai";
import { generateFallbackContent, generateFallbackDescription, generateFallbackTranslation, generateFallbackSEO } from "./fallbacks";
import { generateProjectSuggestions, generateDescriptionSuggestion, generateRoleSuggestions, generateTagSuggestions } from "./ai-suggestions";
import { uploadToCloudinary, deleteFromCloudinary, generateThumbnailUrl, generateVideoThumbnail, generateOptimizedVideoUrl } from "./cloudinary";
import { migrateVideosToCloudinary } from "./migrate-videos";
import { sendContactEmail } from "./sendgrid";
import { sendContactEmailNodemailer } from "./nodemailer";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Initialize cache with 1 hour TTL
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// Rate limiting configurations
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 uploads per hour
  message: { error: "Upload limit reached, please try again later" },
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Reasonable limit for admin operations
  message: { error: "Admin operation limit reached" },
});

// JWT Authentication middleware
const authenticateToken = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  const secret = process.env.JWT_SECRET || 'franciscopuyol_secret_key';
  jwt.verify(token, secret, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Validation helpers
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: "Validation failed", 
      errors: errors.array() 
    });
  }
  next();
};

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Multer configuration for video uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'video') {
      const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only video files (MP4, MOV, AVI) are allowed'));
      }
    } else if (file.fieldname === 'thumbnail') {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'));
      }
    } else {
      cb(new Error('Unknown file field'));
    }
  }
});

// Separate multer configuration for photo uploads
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for photos
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        mediaSrc: ["'self'", "https:", "blob:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        connectSrc: ["'self'", "https:", "wss:"],
        frameSrc: ["'self'", "https:"],
      },
    },
  }));

  app.use(compression());

  // Trust proxy for rate limiting
  app.set('trust proxy', 1);

  // General rate limiting
  app.use(generalLimiter);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    });
  });

  // Auth routes
  app.post('/api/login', asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    
    // Simple hardcoded admin credentials
    if (email === 'admin@franciscopuyol.com' && password === 'videomaker2025') {
      const token = jwt.sign(
        { 
          id: 'admin',
          email: 'admin@franciscopuyol.com',
          role: 'admin',
          firstName: 'Francisco',
          lastName: 'Puyol'
        },
        process.env.JWT_SECRET || 'franciscopuyol_secret_key',
        { expiresIn: '7d' }
      );
      
      res.json({ token, user: { 
        id: 'admin',
        email: 'admin@franciscopuyol.com',
        role: 'admin',
        firstName: 'Francisco',
        lastName: 'Puyol'
      }});
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  }));

  app.get('/api/auth/user', authenticateToken, asyncHandler(async (req: any, res: Response) => {
    res.json(req.user);
  }));

  // Public routes
  app.get("/api/projects", asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const category = req.query.category as string;
    const featured = req.query.featured === 'true';
    const search = req.query.search as string;

    const projects = await storage.getAllProjects();

    res.json(projects);
  }));

  app.get("/api/projects/featured", asyncHandler(async (req: Request, res: Response) => {
    const projects = await storage.getAllProjects();
    res.json(projects.filter((p: any) => p.featured));
  }));

  app.get("/api/stats", asyncHandler(async (req: Request, res: Response) => {
    const stats = { totalProjects: 0, totalViews: 0 }; // Simple implementation
    res.json(stats);
  }));

  app.get("/api/projects/:id", 
    [param('id').isInt().withMessage('Invalid project ID')],
    handleValidationErrors,
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    })
  );

  // Protected admin routes
  app.post("/api/projects", 
    authenticateToken,
    adminLimiter,
    upload.fields([
      { name: 'video', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 }
    ]),
    asyncHandler(async (req: any, res: Response) => {
      try {
        const data = JSON.parse(req.body.data || '{}');
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        
        const validatedData = insertProjectSchema.parse(data);
        
        let videoUrl = null;
        let thumbnailUrl = null;
        
        // Upload video to Cloudinary
        if (files.video && files.video[0]) {
          const videoFile = files.video[0];
          const videoResult = await uploadToCloudinary(videoFile.buffer, {
            folder: 'projects/videos',
            resource_type: 'video',
            public_id: `project_${Date.now()}_video`
          });
          videoUrl = videoResult.secure_url;
        }
        
        // Upload thumbnail to Cloudinary
        if (files.thumbnail && files.thumbnail[0]) {
          const thumbnailFile = files.thumbnail[0];
          const thumbnailResult = await uploadToCloudinary(thumbnailFile.buffer, {
            folder: 'projects/thumbnails',
            resource_type: 'image',
            public_id: `project_${Date.now()}_thumbnail`
          });
          thumbnailUrl = thumbnailResult.secure_url;
        }
        
        const projectData = {
          ...validatedData,
          videoUrl,
          thumbnailUrl,
          createdBy: req.user.id
        };
        
        const project = await storage.createProject(projectData);
        res.json(project);
      } catch (error: any) {
        console.error('Error creating project:', error);
        res.status(400).json({ 
          message: error.message || 'Failed to create project' 
        });
      }
    })
  );

  app.put("/api/projects/:id", 
    authenticateToken,
    adminLimiter,
    upload.fields([
      { name: 'video', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 }
    ]),
    asyncHandler(async (req: any, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        const data = JSON.parse(req.body.data || '{}');
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        
        const validatedData = insertProjectSchema.partial().parse(data);
        
        let videoUrl = validatedData.videoUrl;
        let thumbnailUrl = validatedData.thumbnailUrl;
        
        // Upload new video if provided
        if (files.video && files.video[0]) {
          const videoFile = files.video[0];
          const videoResult = await uploadToCloudinary(videoFile.buffer, {
            folder: 'projects/videos',
            resource_type: 'video',
            public_id: `project_${id}_video_${Date.now()}`
          });
          videoUrl = videoResult.secure_url;
        }
        
        // Upload new thumbnail if provided
        if (files.thumbnail && files.thumbnail[0]) {
          const thumbnailFile = files.thumbnail[0];
          const thumbnailResult = await uploadToCloudinary(thumbnailFile.buffer, {
            folder: 'projects/thumbnails',
            resource_type: 'image',
            public_id: `project_${id}_thumbnail_${Date.now()}`
          });
          thumbnailUrl = thumbnailResult.secure_url;
        }
        
        const projectData = {
          ...validatedData,
          videoUrl,
          thumbnailUrl,
          updatedBy: req.user.id
        };
        
        const project = await storage.updateProject(id, projectData);
        
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }
        
        res.json(project);
      } catch (error: any) {
        console.error('Error updating project:', error);
        res.status(400).json({ 
          message: error.message || 'Failed to update project' 
        });
      }
    })
  );

  app.delete("/api/projects/:id", 
    authenticateToken,
    adminLimiter,
    asyncHandler(async (req: any, res: Response) => {
      const id = parseInt(req.params.id);
      
      // Check if project exists before deleting
      const existingProject = await storage.getProject(id);
      if (!existingProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      await storage.deleteProject(id);
      res.json({ message: "Project deleted successfully" });
    })
  );

  // Admin project routes (same data as public routes but with admin authentication)
  app.get("/api/admin/projects", 
    authenticateToken,
    asyncHandler(async (req: Request, res: Response) => {
      const projects = await storage.getAllProjects();
      res.json(projects);
    })
  );

  app.post("/api/admin/projects/reorder",
    authenticateToken,
    adminLimiter,
    asyncHandler(async (req: any, res: Response) => {
      const { updates } = req.body;
      
      if (!Array.isArray(updates)) {
        return res.status(400).json({ error: 'Updates must be an array' });
      }

      try {
        for (const update of updates) {
          if (typeof update.id !== 'number' || typeof update.displayOrder !== 'number') {
            return res.status(400).json({ error: 'Invalid update format' });
          }
          
          await storage.updateProject(update.id, { displayOrder: update.displayOrder });
        }
        
        res.json({ message: 'Project order updated successfully' });
      } catch (error) {
        console.error('Error updating project order:', error);
        res.status(500).json({ error: 'Failed to update project order' });
      }
    })
  );

  // Admin categories routes
  app.get("/api/admin/categories", 
    authenticateToken,
    asyncHandler(async (req: Request, res: Response) => {
      const categories = await storage.getAllCategories();
      res.json(categories);
    })
  );

  // Admin suggestions route
  app.get("/api/admin/suggestions", 
    authenticateToken,
    asyncHandler(async (req: Request, res: Response) => {
      const projects = await storage.getAllProjects();
      
      const clients = [...new Set(projects
        .map(p => p.client)
        .filter((c): c is string => Boolean(c))
        .filter((c: string) => c.trim() !== '')
      )].sort();
      
      const agencies = [...new Set(projects
        .map(p => p.agency)
        .filter((a): a is string => Boolean(a))
        .filter((a: string) => a.trim() !== '')
      )].sort();
      
      res.json({ clients, agencies });
    })
  );

  // Public categories routes
  app.get("/api/categories", asyncHandler(async (req: Request, res: Response) => {
    const categories = await storage.getAllCategories();
    res.json(categories);
  }));

  app.post("/api/categories", 
    authenticateToken,
    adminLimiter,
    asyncHandler(async (req: any, res: Response) => {
      try {
        const validatedData = insertCategorySchema.parse(req.body);
        const category = await storage.createCategory(validatedData);
        res.json(category);
      } catch (error: any) {
        res.status(400).json({ 
          message: error.message || 'Failed to create category' 
        });
      }
    })
  );

  // Biography routes
  app.get("/api/biography", asyncHandler(async (req: Request, res: Response) => {
    const biography = await storage.getBiography();
    res.json(biography);
  }));

  app.put("/api/biography", 
    authenticateToken,
    adminLimiter,
    photoUpload.single('profileImage'),
    asyncHandler(async (req: any, res: Response) => {
      try {
        const data = req.file ? JSON.parse(req.body.data || '{}') : req.body;
        const validatedData = insertBiographySchema.partial().parse(data);
        
        let profileImageUrl = validatedData.profileImageUrl;
        
        // Upload new profile image if provided
        if (req.file) {
          const imageResult = await uploadToCloudinary(req.file.buffer, {
            folder: 'biography',
            resource_type: 'image',
            public_id: `profile_image_${Date.now()}`
          });
          profileImageUrl = imageResult.secure_url;
        }
        
        const biographyData = {
          ...validatedData,
          profileImageUrl,
          updatedBy: req.user.id
        };
        
        const biography = await storage.upsertBiography(biographyData);
        res.json(biography);
      } catch (error: any) {
        console.error('Error updating biography:', error);
        res.status(400).json({ 
          message: error.message || 'Failed to update biography' 
        });
      }
    })
  );

  // Admin contact settings routes
  app.get("/api/admin/contact/settings", 
    authenticateToken,
    asyncHandler(async (req: Request, res: Response) => {
      const settings = await storage.getContactSettings();
      res.json(settings);
    })
  );

  // Public contact settings routes
  app.get("/api/contact-settings", asyncHandler(async (req: Request, res: Response) => {
    const settings = await storage.getContactSettings();
    res.json(settings);
  }));

  app.put("/api/contact-settings", 
    authenticateToken,
    adminLimiter,
    asyncHandler(async (req: any, res: Response) => {
      try {
        const validatedData = insertContactSettingsSchema.partial().parse(req.body);
        const settings = await storage.upsertContactSettings({
          ...validatedData,
          updatedBy: req.user.id
        });
        res.json(settings);
      } catch (error: any) {
        res.status(400).json({ 
          message: error.message || 'Failed to update contact settings' 
        });
      }
    })
  );

  // Contact form submission
  app.post("/api/contact", asyncHandler(async (req: Request, res: Response) => {
    try {
      const validatedData = contactFormSchema.parse(req.body);
      
      // Get contact settings
      const settings = await storage.getContactSettings();
      
      if (!settings || !settings.formEnabled) {
        return res.status(400).json({ message: "Contact form is currently disabled" });
      }
      
      // Store submission
      const submission = await storage.createContactSubmission({
        ...validatedData,
        status: "pending"
      });
      
      // Send email
      try {
        await sendContactEmail(validatedData, settings.destinationEmail);
      } catch (emailError) {
        console.warn('Failed to send contact email:', emailError);
        // Continue anyway - submission was stored
      }
      
      res.json({ 
        message: "Thank you for your message. We'll get back to you soon!" 
      });
    } catch (error: any) {
      console.error('Contact form error:', error);
      res.status(400).json({ 
        message: error.message || 'Failed to submit contact form' 
      });
    }
  }));

  // Error handling middleware
  // AI Status endpoint
  app.get("/api/admin/ai/status", authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    try {
      // Test OpenAI API connection
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok && !data.error) {
        res.json({
          status: 'active',
          available: true,
          models: data.data?.length || 0,
          message: 'AI Assistant is operational'
        });
      } else {
        res.json({
          status: 'error',
          available: false,
          error: data.error?.message || 'API key invalid',
          message: 'AI Assistant unavailable'
        });
      }
    } catch (error) {
      res.json({
        status: 'error',
        available: false,
        error: 'Network error',
        message: 'Unable to connect to OpenAI'
      });
    }
  }));

  // AI Suggestion endpoints
  app.post("/api/admin/ai/project-suggestions",
    authenticateToken,
    adminLimiter,
    [
      body('title').notEmpty().withMessage('Title is required'),
      body('category').optional().isString(),
      body('client').optional().isString(),
      body('year').optional().isNumeric()
    ],
    handleValidationErrors,
    asyncHandler(async (req: Request, res: Response) => {
      const { title, category, client, year } = req.body;
      
      try {
        const suggestions = await generateProjectSuggestions(title, category, client, year);
        res.json(suggestions);
      } catch (error) {
        console.error('AI project suggestions error:', error);
        res.status(500).json({ 
          error: 'Failed to generate AI suggestions',
          message: error instanceof Error ? error.message : 'AI service unavailable. Please try again later.' 
        });
      }
    })
  );

  app.post("/api/admin/ai/description-suggestion",
    authenticateToken,
    adminLimiter,
    [
      body('title').notEmpty().withMessage('Title is required'),
      body('category').optional().isString(),
      body('client').optional().isString()
    ],
    handleValidationErrors,
    asyncHandler(async (req: Request, res: Response) => {
      const { title, category, client } = req.body;
      
      try {
        const description = await generateDescriptionSuggestion(title, category, client);
        res.json({ description });
      } catch (error) {
        console.error('AI description suggestion error:', error);
        res.status(500).json({ 
          error: 'Failed to generate description suggestion',
          message: 'AI service unavailable. Please try again later.' 
        });
      }
    })
  );

  app.post("/api/admin/ai/role-suggestions",
    authenticateToken,
    adminLimiter,
    [
      body('title').notEmpty().withMessage('Title is required'),
      body('description').optional().isString(),
      body('category').optional().isString()
    ],
    handleValidationErrors,
    asyncHandler(async (req: Request, res: Response) => {
      const { title, description, category } = req.body;
      
      try {
        const roles = await generateRoleSuggestions(title, description, category);
        res.json({ roles });
      } catch (error) {
        console.error('AI role suggestions error:', error);
        res.status(500).json({ 
          error: 'Failed to generate role suggestions',
          message: 'AI service unavailable. Please try again later.' 
        });
      }
    })
  );

  app.post("/api/admin/ai/tag-suggestions",
    authenticateToken,
    adminLimiter,
    [
      body('title').notEmpty().withMessage('Title is required'),
      body('description').optional().isString(),
      body('category').optional().isString()
    ],
    handleValidationErrors,
    asyncHandler(async (req: Request, res: Response) => {
      const { title, description, category } = req.body;
      
      try {
        const tags = await generateTagSuggestions(title, description, category);
        res.json({ tags });
      } catch (error) {
        console.error('AI tag suggestions error:', error);
        res.status(500).json({ 
          error: 'Failed to generate tag suggestions',
          message: 'AI service unavailable. Please try again later.' 
        });
      }
    })
  );

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        message: 'File too large. Maximum size allowed is 500MB for videos and 10MB for images.' 
      });
    }
    
    if (err.message.includes('Only')) {
      return res.status(400).json({ message: err.message });
    }
    
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}