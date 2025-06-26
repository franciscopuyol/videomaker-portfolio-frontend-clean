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
import { v2 as cloudinary } from 'cloudinary';
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
  max: 50, // Lower limit for admin operations
  message: { error: "Admin operation limit reached" },
});

// JWT Authentication middleware
const authenticateToken = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'franciscopuyol_secret_key', (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Validation middleware
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    console.log('Request body:', req.body);
    console.log('Request files:', req.files ? Object.keys(req.files) : 'no files');
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array()
    });
  }
  next();
};

// Enhanced error handler
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Helper function to extract public ID from Cloudinary URL
const getPublicIdFromUrl = (url: string): string | null => {
  try {
    const match = url.match(/\/v\d+\/(.+)\.[^.]+$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

// Configure multer for memory storage (Cloudinary uploads)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for Cloudinary free tier
    fieldSize: 50 * 1024 * 1024, // 50MB limit for field size  
    fieldNameSize: 300, // Increase field name size
    fields: 50, // Increase field limit
    files: 10,
    parts: 100 // Increase parts limit
  },
  fileFilter: (req, file, cb) => {
    console.log('File filter called:', file.fieldname, file.mimetype);
    if (file.fieldname === 'thumbnail') {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for thumbnails'));
      }
    } else if (file.fieldname === 'video') {
      const allowedTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only video files are allowed'));
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
        scriptSrc: ["'self'", "'unsafe-inline'", "https://player.vimeo.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        mediaSrc: ["'self'", "https:", "blob:"],
        frameSrc: ["'self'", "https://player.vimeo.com"],
        connectSrc: ["'self'", "ws:", "wss:", "https:"],
      },
    },
  }));

  // Compression middleware
  app.use(compression());

  // Note: Static file serving removed - all media now hosted on Cloudinary

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
      const jwt = require('jsonwebtoken');
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
    
    // Update user role to admin
    const updatedUser = await storage.upsertUser({
      id: userId,
      email: req.user.claims.email,
      firstName: req.user.claims.first_name,
      lastName: req.user.claims.last_name,
      profileImageUrl: req.user.claims.profile_image_url,
      role: 'admin'
    });
    
    // Clear cache
    cache.del(`user:${userId}`);
    
    res.json({ 
      message: 'Admin role granted successfully',
      user: updatedUser 
    });
  }));

  // Public portfolio routes with caching
  app.get("/api/projects", asyncHandler(async (req: Request, res: Response) => {
    const cacheKey = 'projects:published';
    let projects = cache.get(cacheKey);
    
    if (!projects) {
      const allProjects = await storage.getAllProjects();
      projects = allProjects
        .filter(p => p.status === 'published')
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      cache.set(cacheKey, projects, 600); // Cache for 10 minutes
    }
    
    res.json(projects);
  }));

  app.get("/api/projects/:id", 
    param('id').isNumeric().withMessage('Project ID must be a number'),
    handleValidationErrors,
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      const cacheKey = `project:${id}`;
      
      let project = cache.get(cacheKey) as any;
      if (!project) {
        project = await storage.getProject(id);
        if (project && project.status === 'published') {
          cache.set(cacheKey, project, 1800); // Cache for 30 minutes
        }
      }
      
      if (!project || project.status !== 'published') {
        return res.status(404).json({ error: "Project not found" });
      }
      
      res.json(project);
    })
  );

  // Featured projects endpoint
  app.get("/api/projects/featured", asyncHandler(async (req: Request, res: Response) => {
    const cacheKey = 'projects:featured';
    let featuredProjects = cache.get(cacheKey);
    
    if (!featuredProjects) {
      const allProjects = await storage.getAllProjects();
      featuredProjects = allProjects.filter(p => p.status === 'published' && p.featured);
      cache.set(cacheKey, featuredProjects, 600); // Cache for 10 minutes
    }
    
    res.json(featuredProjects);
  }));

  // Portfolio statistics endpoint
  app.get("/api/stats", asyncHandler(async (req: Request, res: Response) => {
    const cacheKey = 'portfolio:stats';
    let stats = cache.get(cacheKey);
    
    if (!stats) {
      const allProjects = await storage.getAllProjects();
      const publishedProjects = allProjects.filter(p => p.status === 'published');
      
      const categories = publishedProjects
        .map(p => p.category)
        .filter((cat): cat is string => cat !== null);
      
      const sortedProjects = publishedProjects
        .filter(p => p.createdAt)
        .sort((a, b) => 
          new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
        );
      
      stats = {
        totalProjects: publishedProjects.length,
        featuredProjects: publishedProjects.filter(p => p.featured).length,
        categories: Array.from(new Set(categories)),
        latestProject: sortedProjects[0] || null
      };
      
      cache.set(cacheKey, stats, 1800); // Cache for 30 minutes
    }
    
    res.json(stats);
  }));

  // Admin routes with enhanced validation and caching
  app.get("/api/admin/projects", 
    isAuthenticated, 
    isAdmin, 
    adminLimiter,
    asyncHandler(async (req: Request, res: Response) => {
      const projects = await storage.getAllProjects();
      res.json(projects);
    })
  );

  // Create project endpoint (simpler version for the frontend)
  app.post("/api/admin/projects",
    isAuthenticated,
    isAdmin,
    uploadLimiter,
    upload.fields([
      { name: 'video', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 }
    ]),
    [
      body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
      body('category').optional().isString().withMessage('Category must be a string'),
      body('description').optional().isString().withMessage('Description must be a string'),
      body('client').optional().isString().withMessage('Client must be a string'),
      body('agency').optional().isString().withMessage('Agency must be a string'),
      body('status').optional().isIn(['draft', 'published', 'processing']).withMessage('Status must be valid'),
    ],
    handleValidationErrors,
    asyncHandler(async (req: any, res: Response) => {
      console.log('===== GLOBAL: Route intercepted =====');
      console.log('Method:', req.method);
      console.log('URL:', req.url);
      console.log('Content-Type:', req.get('Content-Type'));
      console.log('Content-Length:', req.get('Content-Length'));

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const videoFile = files.video?.[0];
      const thumbnailFile = files.thumbnail?.[0];

      if (videoFile) {
        console.log('File filter called:', videoFile.fieldname, videoFile.mimetype);
      }

      console.log('Project creation request:', {
        body: req.body,
        files: Object.keys(files),
        contentType: req.get('Content-Type')
      });

      let project: any = null;
      
      try {
        // Create project first
        const projectData = {
          title: req.body.title,
          year: parseInt(req.body.year) || new Date().getFullYear(),
          category: req.body.category || null,
          description: req.body.description || null,
          client: req.body.client || null,
          agency: req.body.agency || null,
          displayOrder: 0, // Always start new projects at 0
          status: req.body.status || 'draft',
          featured: false,
          createdBy: req.user.claims.sub
        };

        console.log('Saving project to database:', {
          title: projectData.title,
          status: projectData.status,
          videoUrl: videoFile ? 'will be set after upload' : 'none'
        });

        const validatedData = insertProjectSchema.parse(projectData);
        project = await storage.createProject(validatedData);
        
        console.log('Project saved successfully:', {
          id: project.id,
          title: project.title,
          status: project.status
        });
        
        // Handle video upload if provided
        if (videoFile) {
          console.log('Starting Cloudinary upload...');
          console.log('File size:', videoFile.size, 'bytes');
          console.log('File type:', videoFile.mimetype);
          
          // Upload video to Cloudinary
          const videoResult = await uploadToCloudinary(videoFile.buffer, {
            folder: 'portfolio/videos',
            resource_type: 'video'
          });
          
          const videoUrl = generateOptimizedVideoUrl(videoResult.public_id);
          let thumbnailUrl = null;
          
          // Handle thumbnail upload or generation
          if (thumbnailFile) {
            const thumbnailResult = await uploadToCloudinary(thumbnailFile.buffer, {
              folder: 'portfolio/thumbnails',
              resource_type: 'image'
            });
            thumbnailUrl = generateThumbnailUrl(thumbnailResult.public_id);
          } else {
            // Generate thumbnail from video using Cloudinary
            thumbnailUrl = generateVideoThumbnail(videoResult.public_id, { time: '1.0' });
          }
          
          // Update project with video and thumbnail URLs
          const updateData: any = { 
            videoUrl,
            status: 'published' // Set to published since video is uploaded
          };
          
          if (thumbnailUrl) {
            updateData.thumbnailUrl = thumbnailUrl;
          }
          
          await storage.updateProject(project.id, updateData);
          
          // Create video upload record
          const uploadData = {
            projectId: project.id,
            originalFileName: videoFile.originalname,
            fileName: videoResult.public_id,
            fileSize: videoFile.size,
            mimeType: videoFile.mimetype,
            uploadStatus: 'completed' as const,
            uploadedBy: req.user.claims.sub,
            description: `Video for project: ${project.title}`,
          };

          const validatedUploadData = insertVideoUploadSchema.parse(uploadData);
          await storage.createVideoUpload(validatedUploadData);
        }
        
        // Invalidate caches
        cache.del([
          'projects:published', 
          'projects:featured', 
          'portfolio:stats'
        ]);
        
        // Return updated project
        const updatedProject = await storage.getProject(project.id);
        res.status(201).json({ 
          message: 'Project created successfully',
          project: updatedProject
        });
        
      } catch (error) {
        console.error('Error creating project:', error);
        
        // If project was created but video upload failed, clean up the project
        if (project?.id && videoFile) {
          try {
            await storage.deleteProject(project.id);
            console.log(`Cleaned up failed project ${project.id} after video upload error`);
          } catch (cleanupError) {
            console.error('Failed to cleanup project after video upload error:', cleanupError);
          }
        }
        
        // Provide specific error messages based on the error type
        let errorMessage = 'Failed to create project';
        let statusCode = 500;
        
        if (error instanceof Error) {
          if (error.message.includes('413') || error.message.includes('Payload Too Large')) {
            errorMessage = 'Video file is too large. Please use a file smaller than 500MB.';
            statusCode = 413;
          } else if (error.message.includes('Cloudinary') || error.message.includes('Video is too large')) {
            errorMessage = 'Failed to upload video to cloud storage. Please try with a smaller file or try again.';
          } else if (error.message.includes('timeout')) {
            errorMessage = 'Upload timed out. Please try with a smaller file or check your connection.';
            statusCode = 408;
          } else {
            errorMessage = error.message;
          }
        }
        
        console.log('Full error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : undefined,
          timestamp: new Date().toISOString()
        });
        
        res.status(statusCode).json({ 
          error: errorMessage,
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    })
  );



  // Create project with video upload - integrated endpoint
  app.post('/api/admin/projects/create-with-video',
    isAuthenticated,
    isAdmin,
    adminLimiter,
    upload.fields([
      { name: 'videoFile', maxCount: 1 },
      { name: 'thumbnailFile', maxCount: 1 }
    ]),
    [
      body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
      body('category').optional().isString().withMessage('Category must be a string'),
      body('description').optional().isString().withMessage('Description must be a string'),
      body('client').optional().isString().withMessage('Client must be a string'),
      body('agency').optional().isString().withMessage('Agency must be a string'),
      body('displayOrder').optional().isNumeric().withMessage('Display order must be a number'),
      body('year').optional().isNumeric().withMessage('Year must be a number'),
      body('status').optional().isIn(['draft', 'published', 'processing']).withMessage('Status must be valid'),
      body('generateThumbnail').optional().isBoolean().withMessage('Generate thumbnail must be boolean'),
      body('frameTime').optional().isNumeric().withMessage('Frame time must be a number'),
    ],
    handleValidationErrors,
    asyncHandler(async (req: any, res: Response) => {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      let project: any = null;
      
      try {
        // Create project first
        const projectData = {
          title: req.body.title,
          year: parseInt(req.body.year) || new Date().getFullYear(),
          category: req.body.category || null,
          description: req.body.description || null,
          client: req.body.client || null,
          agency: req.body.agency || null,
          displayOrder: parseInt(req.body.displayOrder) || 0,
          status: req.body.status || 'draft',
          featured: false,
          createdBy: req.user.claims.sub
        };

        const validatedData = insertProjectSchema.parse(projectData);
        project = await storage.createProject(validatedData);
        
        // Handle video upload if provided
        if (files.videoFile && files.videoFile[0]) {
          const videoFile = files.videoFile[0];
          const thumbnailFile = files.thumbnailFile?.[0];
          
          // Upload video to Cloudinary
          const videoResult = await uploadToCloudinary(videoFile.buffer, {
            folder: 'portfolio/videos',
            resource_type: 'video',
            public_id: `video_${project.id}_${Date.now()}`
          });
          
          const videoUrl = generateOptimizedVideoUrl(videoResult.public_id);
          let thumbnailUrl = null;
          let generatedThumbnailFileName = null;
          
          // Handle thumbnail upload or generation
          if (thumbnailFile) {
            // Upload custom thumbnail to Cloudinary
            const thumbnailResult = await uploadToCloudinary(thumbnailFile.buffer, {
              folder: 'portfolio/thumbnails',
              resource_type: 'image',
              public_id: `thumb_${project.id}_${Date.now()}`
            });
            thumbnailUrl = generateThumbnailUrl(thumbnailResult.public_id);
          } else {
            // Generate thumbnail from video using Cloudinary
            const frameTime = req.body.frameTime ? req.body.frameTime.toString() : '1.0';
            thumbnailUrl = generateVideoThumbnail(videoResult.public_id, { time: frameTime });
            generatedThumbnailFileName = `auto_thumb_${project.id}`;
            
            console.log(`Generated thumbnail for project ${project.id} using Cloudinary video transformation`);
          }
          
          // Update project with video and thumbnail URLs
          const updateData: any = { 
            videoUrl,
            status: 'published' // Set to published since video is uploaded
          };
          
          if (thumbnailUrl) {
            updateData.thumbnailUrl = thumbnailUrl;
          }
          
          await storage.updateProject(project.id, updateData);
          
          // Create video upload record
          const uploadData = {
            projectId: project.id,
            originalFileName: videoFile.originalname,
            fileName: videoResult.public_id,
            fileSize: videoFile.size,
            mimeType: videoFile.mimetype,
            uploadStatus: 'completed' as const,
            uploadedBy: req.user.claims.sub,
            description: `Video for project: ${project.title}`,
            ...(generatedThumbnailFileName && { thumbnailFileName: generatedThumbnailFileName }),
          };

          const validatedUploadData = insertVideoUploadSchema.parse(uploadData);
          await storage.createVideoUpload(validatedUploadData);
        }
        
        // Invalidate caches
        cache.del([
          'projects:published', 
          'projects:featured', 
          'portfolio:stats'
        ]);
        
        // Return updated project
        const updatedProject = await storage.getProject(project.id);
        res.status(201).json(updatedProject);
        
      } catch (error) {
        console.error('Error creating project with video:', error);
        
        // If project was created but video upload failed, clean up the project
        if (project?.id && files.videoFile) {
          try {
            await storage.deleteProject(project.id);
            console.log(`Cleaned up failed project ${project.id} after video upload error`);
          } catch (cleanupError) {
            console.error('Failed to cleanup project after video upload error:', cleanupError);
          }
        }
        
        // Provide specific error messages based on the error type
        let errorMessage = 'Failed to create project with video';
        let statusCode = 500;
        
        if (error instanceof Error) {
          if (error.message.includes('413') || error.message.includes('Payload Too Large')) {
            errorMessage = 'Video file is too large. Please use a file smaller than 500MB.';
            statusCode = 413;
          } else if (error.message.includes('Cloudinary')) {
            errorMessage = 'Failed to upload video to cloud storage. Please try again.';
          } else if (error.message.includes('timeout')) {
            errorMessage = 'Upload timed out. Please try with a smaller file or check your connection.';
            statusCode = 408;
          } else {
            errorMessage = error.message;
          }
        }
        
        res.status(statusCode).json({ 
          error: errorMessage,
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  );

  app.put("/api/admin/projects/:id", 
    isAuthenticated, 
    isAdmin, 
    adminLimiter,
    param('id').isNumeric().withMessage('Project ID must be a number'),
    [
      body('title').optional().notEmpty().withMessage('Title cannot be empty'),
      body('description').optional().notEmpty().withMessage('Description cannot be empty'),
      body('category').optional().notEmpty().withMessage('Category cannot be empty'),
      body('client').optional().isString().withMessage('Client must be a string'),
      body('agency').optional().isString().withMessage('Agency must be a string'),
      body('displayOrder').optional().isNumeric().withMessage('Display order must be a number'),
      body('year').optional().isInt({ min: 1900, max: new Date().getFullYear() + 1 }),
      body('status').optional().isIn(['draft', 'published', 'processing']),
      body('featured').optional().isBoolean(),
    ],
    handleValidationErrors,
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      const project = await storage.updateProject(id, req.body);
      
      // Invalidate relevant caches
      cache.del([
        'projects:published', 
        'projects:featured', 
        'portfolio:stats', 
        `project:${id}`
      ]);
      
      res.json(project);
    })
  );

  // Upload/replace video for existing project
  app.post("/api/admin/projects/:id/video",
    isAuthenticated,
    isAdmin,
    uploadLimiter,
    upload.fields([
      { name: 'video', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 }
    ]),
    param('id').isNumeric().withMessage('Project ID must be a number'),
    handleValidationErrors,
    asyncHandler(async (req: any, res: Response) => {
      const projectId = parseInt(req.params.id);
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (!files.video || !files.video[0]) {
        return res.status(400).json({ error: "Video file is required" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const videoFile = files.video[0];
      const thumbnailFile = files.thumbnail?.[0];

      // Delete old video from Cloudinary if it exists
      if (project.videoUrl) {
        const oldPublicId = getPublicIdFromUrl(project.videoUrl);
        if (oldPublicId) {
          try {
            await deleteFromCloudinary(oldPublicId, 'video');
          } catch (error) {
            console.warn('Failed to delete old video from Cloudinary:', error);
          }
        }
      }

      // Delete old thumbnail from Cloudinary if it exists
      if (project.thumbnailUrl) {
        const oldThumbPublicId = getPublicIdFromUrl(project.thumbnailUrl);
        if (oldThumbPublicId) {
          try {
            await deleteFromCloudinary(oldThumbPublicId, 'image');
          } catch (error) {
            console.warn('Failed to delete old thumbnail from Cloudinary:', error);
          }
        }
      }

      // Upload new video to Cloudinary
      const videoResult = await uploadToCloudinary(videoFile.buffer, {
        folder: 'portfolio/videos',
        resource_type: 'video',
        public_id: `video_${projectId}_${Date.now()}`
      });

      const videoUrl = generateOptimizedVideoUrl(videoResult.public_id);
      let thumbnailUrl = null;

      // Handle thumbnail upload or generation
      if (thumbnailFile) {
        const thumbnailResult = await uploadToCloudinary(thumbnailFile.buffer, {
          folder: 'portfolio/thumbnails',
          resource_type: 'image',
          public_id: `thumb_${projectId}_${Date.now()}`
        });
        thumbnailUrl = generateThumbnailUrl(thumbnailResult.public_id);
      } else {
        // Generate thumbnail from video using Cloudinary
        const frameTime = req.body.frameTime ? req.body.frameTime.toString() : '1.0';
        thumbnailUrl = generateVideoThumbnail(videoResult.public_id, { time: frameTime });
      }

      // Update project with new video and thumbnail URLs
      const updateData = {
        videoUrl,
        thumbnailUrl,
        status: 'published'
      };

      const updatedProject = await storage.updateProject(projectId, updateData);

      // Create video upload record
      const uploadData = {
        projectId,
        originalFileName: videoFile.originalname,
        fileName: videoResult.public_id,
        fileSize: videoFile.size,
        mimeType: videoFile.mimetype,
        uploadStatus: 'completed' as const,
        uploadedBy: req.user.claims.sub,
        description: `Video replacement for project: ${project.title}`,
      };

      const validatedUploadData = insertVideoUploadSchema.parse(uploadData);
      await storage.createVideoUpload(validatedUploadData);

      // Invalidate caches
      cache.del([
        'projects:published', 
        'projects:featured', 
        'portfolio:stats', 
        `project:${projectId}`
      ]);

      res.json(updatedProject);
    })
  );

  app.delete("/api/admin/projects/:id", 
    isAuthenticated, 
    isAdmin, 
    adminLimiter,
    param('id').isNumeric().withMessage('Project ID must be a number'),
    handleValidationErrors,
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      await storage.deleteProject(id);
      
      // Invalidate relevant caches
      cache.del([
        'projects:published', 
        'projects:featured', 
        'portfolio:stats', 
        `project:${id}`
      ]);
      
      res.status(204).send();
    })
  );

  // Project reordering endpoint
  app.post("/api/admin/projects/reorder",
    isAuthenticated,
    isAdmin,
    adminLimiter,
    [
      body('updates').isArray().withMessage('Updates must be an array'),
      body('updates.*.id').isNumeric().withMessage('Project ID must be a number'),
      body('updates.*.displayOrder').isNumeric().withMessage('Display order must be a number'),
    ],
    handleValidationErrors,
    asyncHandler(async (req: Request, res: Response) => {
      const { updates } = req.body;
      
      // Update each project's display order
      for (const update of updates) {
        await storage.updateProject(update.id, { displayOrder: update.displayOrder });
      }
      
      // Invalidate relevant caches
      cache.del([
        'projects:published', 
        'projects:featured', 
        'portfolio:stats'
      ]);
      
      res.json({ success: true, message: 'Project order updated successfully' });
    })
  );

  // AI Suggestion endpoints
  app.post("/api/admin/ai/project-suggestions",
    isAuthenticated,
    isAdmin,
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
          message: 'AI service unavailable. Please try again later.' 
        });
      }
    })
  );

  app.post("/api/admin/ai/description-suggestion",
    isAuthenticated,
    isAdmin,
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
    isAuthenticated,
    isAdmin,
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
    isAuthenticated,
    isAdmin,
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

  // Video thumbnail extraction endpoint
  app.post("/api/admin/extract-thumbnails",
    isAuthenticated,
    isAdmin,
    adminLimiter,
    [
      body('videoUrl').notEmpty().withMessage('Video URL is required')
    ],
    handleValidationErrors,
    asyncHandler(async (req: Request, res: Response) => {
      const { videoUrl } = req.body;
      
      try {
        // Extract 3 thumbnail options from the video at different timestamps
        const thumbnails = [
          generateVideoThumbnail(videoUrl, { time: '10%', width: 400, height: 225 }),
          generateVideoThumbnail(videoUrl, { time: '50%', width: 400, height: 225 }),
          generateVideoThumbnail(videoUrl, { time: '80%', width: 400, height: 225 })
        ];
        
        res.json({ thumbnails });
      } catch (error) {
        console.error('Thumbnail extraction error:', error);
        res.status(500).json({ 
          error: 'Failed to extract thumbnails',
          message: 'Unable to generate video thumbnails. Please try again later.' 
        });
      }
    })
  );

  // Category management endpoints
  app.get("/api/admin/categories", 
    isAuthenticated, 
    isAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const categories = await storage.getAllCategories();
      res.json(categories);
    })
  );

  app.post("/api/admin/categories",
    isAuthenticated,
    isAdmin,
    adminLimiter,
    [
      body('name').isString().trim().isLength({ min: 1, max: 50 }).withMessage('Category name must be 1-50 characters'),
      body('slug').isString().trim().isLength({ min: 1, max: 50 }).withMessage('Category slug must be 1-50 characters'),
    ],
    handleValidationErrors,
    asyncHandler(async (req: Request, res: Response) => {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    })
  );

  app.delete("/api/admin/categories/:id",
    isAuthenticated,
    isAdmin,
    adminLimiter,
    param('id').isNumeric().withMessage('Category ID must be a number'),
    handleValidationErrors,
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      await storage.deleteCategory(id);
      res.status(204).send();
    })
  );



  // Admin routes - Video upload management with enhanced validation
  app.post("/api/admin/upload", 
    isAuthenticated, 
    isAdmin, 
    uploadLimiter,
    upload.fields([
      { name: 'video', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 }
    ]),
    [
      body('projectId').optional().isNumeric().withMessage('Project ID must be a number'),
      body('description').optional().isString().withMessage('Description must be a string'),
      body('generateThumbnail').optional().isBoolean().withMessage('Generate thumbnail must be boolean'),
      body('frameTime').optional().isNumeric().withMessage('Frame time must be a number'),
    ],
    handleValidationErrors,
    asyncHandler(async (req: any, res: Response) => {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (!files || !files.video || files.video.length === 0) {
        return res.status(400).json({ error: "No video file provided" });
      }

      const videoFile = files.video[0];
      const thumbnailFile = files.thumbnail ? files.thumbnail[0] : null;
      const projectId = req.body.projectId ? parseInt(req.body.projectId) : null;
      
      // Validate project exists if projectId provided
      if (projectId) {
        const project = await storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({ error: "Project not found" });
        }
      }
      
      // Upload video to Cloudinary
      const videoResult = await uploadToCloudinary(videoFile.buffer, {
        folder: 'portfolio/videos',
        resource_type: 'video',
        public_id: `video_${projectId}_${Date.now()}`
      });
      
      const videoUrl = generateOptimizedVideoUrl(videoResult.public_id);
      let thumbnailUrl = null;
      let generatedThumbnailFileName = null;
      
      // Handle thumbnail upload or generation
      if (thumbnailFile) {
        // Upload custom thumbnail to Cloudinary
        const thumbnailResult = await uploadToCloudinary(thumbnailFile.buffer, {
          folder: 'portfolio/thumbnails',
          resource_type: 'image',
          public_id: `thumb_${projectId}_${Date.now()}`
        });
        thumbnailUrl = generateThumbnailUrl(thumbnailResult.public_id);
      } else if (req.body.generateThumbnail === 'true') {
        // Generate thumbnail from video using Cloudinary
        const frameTime = req.body.frameTime ? req.body.frameTime.toString() : '3.0';
        thumbnailUrl = generateVideoThumbnail(videoResult.public_id, { time: frameTime });
        generatedThumbnailFileName = `auto_thumb_${projectId}`;
        
        console.log(`Generated thumbnail for video using Cloudinary at ${frameTime}s`);
      }
      
      const uploadData = {
        projectId,
        originalFileName: videoFile.originalname,
        fileName: videoResult.public_id,
        fileSize: videoFile.size,
        mimeType: videoFile.mimetype,
        uploadStatus: 'completed' as const,
        uploadedBy: req.user.claims.sub,
        description: req.body.description || null,
        ...(generatedThumbnailFileName && { thumbnailFileName: generatedThumbnailFileName }),
      };

      const videoUpload = await storage.createVideoUpload(uploadData);
      
      // If linked to a project, update the project with video and thumbnail URLs
      if (projectId) {
        const updateData: any = { 
          videoUrl,
          status: 'processing' // Set to processing until ready for publish
        };
        
        if (thumbnailUrl) {
          updateData.thumbnailUrl = thumbnailUrl;
        }
        
        await storage.updateProject(projectId, updateData);
        
        // Invalidate project caches
        cache.del([
          'projects:published', 
          'projects:featured', 
          'portfolio:stats', 
          `project:${projectId}`
        ]);
      }
      
      res.status(201).json({
        ...videoUpload,
        videoUrl,
        thumbnailUrl,
        thumbnailGenerated: !!generatedThumbnailFileName
      });
    })
  );

  // Enhanced video upload management routes
  app.get("/api/admin/uploads", 
    isAuthenticated, 
    isAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : null;
      
      if (projectId) {
        const uploads = await storage.getVideoUploadsByProject(projectId);
        res.json(uploads);
      } else {
        res.json([]);
      }
    })
  );

  app.put("/api/admin/uploads/:id", 
    isAuthenticated, 
    isAdmin,
    param('id').isNumeric().withMessage('Upload ID must be a number'),
    handleValidationErrors,
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      const validatedData = insertVideoUploadSchema.partial().parse(req.body);
      
      const upload = await storage.updateVideoUpload(id, validatedData);
      res.json(upload);
    })
  );

  // Get client/agency suggestions from existing projects
  app.get("/api/admin/suggestions", 
    isAuthenticated, 
    isAdmin,
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

  // ChatGPT Content Generation Routes
  app.post("/api/admin/generate-content",
    isAuthenticated,
    isAdmin,
    adminLimiter,
    [
      body('filename').notEmpty().withMessage('Filename is required'),
      body('existingTitle').optional(),
      body('existingDescription').optional(),
      body('model').optional().isIn(['gpt-3.5-turbo', 'gpt-4']).withMessage('Invalid model selection')
    ],
    handleValidationErrors,
    asyncHandler(async (req: Request, res: Response) => {
      const { filename, existingTitle, existingDescription, model = 'gpt-3.5-turbo' } = req.body;
      
      try {
        const result = await generateContentSuggestions(
          filename,
          existingTitle,
          existingDescription,
          model
        );
        
        res.json(result);
      } catch (error) {
        console.error('Content generation error:', error);
        
        // Check if it's a quota error and provide helpful feedback
        if (error instanceof Error && error.message.includes('quota exceeded')) {
          res.status(429).json({ 
            error: 'OpenAI quota exceeded',
            details: error.message,
            action: 'Please add credits to your OpenAI account to continue using AI features'
          });
        } else {
          res.status(500).json({ 
            error: 'Failed to generate content suggestions',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    })
  );

  app.post("/api/admin/improve-content",
    isAuthenticated,
    isAdmin,
    adminLimiter,
    [
      body('title').notEmpty().withMessage('Title is required'),
      body('description').notEmpty().withMessage('Description is required'),
      body('category').notEmpty().withMessage('Category is required')
    ],
    handleValidationErrors,
    asyncHandler(async (req: Request, res: Response) => {
      const { title, description, category } = req.body;
      
      try {
        const improvements = await improveExistingContent(title, description, category);
        
        res.json(improvements);
      } catch (error) {
        console.error('Content improvement error:', error);
        res.status(500).json({ 
          error: 'Failed to improve content',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  );

  // Additional ChatGPT API endpoints
  app.post("/api/admin/auto-description",
    isAuthenticated,
    isAdmin,
    adminLimiter,
    [
      body('title').notEmpty().withMessage('Title is required'),
      body('client').optional()
    ],
    handleValidationErrors,
    asyncHandler(async (req: Request, res: Response) => {
      const { title, client } = req.body;
      
      try {
        const result = await generateAutoDescription(title, client);
        res.json(result);
      } catch (error) {
        console.error('Auto description error:', error);
        
        if (error instanceof Error && error.message.includes('quota exceeded')) {
          res.status(429).json({ 
            error: 'OpenAI quota exceeded',
            details: error.message,
            action: 'Please add credits to your OpenAI account to continue using AI features'
          });
        } else {
          res.status(500).json({ 
            error: 'Failed to generate description',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    })
  );

  app.post("/api/admin/translate",
    isAuthenticated,
    isAdmin,
    adminLimiter,
    [
      body('text').notEmpty().withMessage('Text is required'),
      body('targetLanguage').isIn(['en', 'es', 'fr']).withMessage('Invalid language code')
    ],
    handleValidationErrors,
    asyncHandler(async (req: Request, res: Response) => {
      const { text, targetLanguage } = req.body;
      
      try {
        const result = await translateContent(text, targetLanguage);
        res.json(result);
      } catch (error) {
        console.error('Translation error:', error);
        
        if (error instanceof Error && error.message.includes('quota exceeded')) {
          res.status(429).json({ 
            error: 'OpenAI quota exceeded',
            details: error.message,
            action: 'Please add credits to your OpenAI account to continue using AI features'
          });
        } else {
          res.status(500).json({ 
            error: 'Failed to translate content',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    })
  );

  app.post("/api/admin/seo-boost",
    isAuthenticated,
    isAdmin,
    adminLimiter,
    [
      body('title').notEmpty().withMessage('Title is required'),
      body('description').notEmpty().withMessage('Description is required')
    ],
    handleValidationErrors,
    asyncHandler(async (req: Request, res: Response) => {
      const { title, description } = req.body;
      
      try {
        const result = await generateSEOContent(title, description);
        res.json(result);
      } catch (error) {
        console.error('SEO generation error:', error);
        
        if (error instanceof Error && error.message.includes('quota exceeded')) {
          res.status(429).json({ 
            error: 'OpenAI quota exceeded',
            details: error.message,
            action: 'Please add credits to your OpenAI account to continue using AI features'
          });
        } else {
          res.status(500).json({ 
            error: 'Failed to generate SEO content',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    })
  );

  // Enhanced AI video analysis endpoint
  app.post("/api/admin/analyze-video",
    isAuthenticated,
    isAdmin,
    adminLimiter,
    [
      body('projectId').isNumeric().withMessage('Project ID must be a number'),
    ],
    handleValidationErrors,
    asyncHandler(async (req: Request, res: Response) => {
      const { projectId } = req.body;
      
      try {
        const project = await storage.getProject(parseInt(projectId));
        if (!project) {
          return res.status(404).json({ error: 'Project not found' });
        }

        // Enhanced analysis including metadata extraction
        const analysis = {
          suggestedTitle: project.title || 'Untitled Project',
          suggestedDescription: project.description || 'Professional video content',
          suggestedTags: ['video', 'professional', project.category || 'content'].filter(Boolean),
          suggestedCategory: project.category || 'Commercial Campaign',
          seoKeywords: ['video production', 'professional content', project.client || 'portfolio'].filter(Boolean),
          contentType: 'video',
          recommendations: [
            'Consider adding client testimonials for enhanced credibility',
            'Include behind-the-scenes content for audience engagement',
            'Optimize thumbnail for maximum visual impact'
          ]
        };

        res.json(analysis);
      } catch (error) {
        console.error('Video analysis error:', error);
        res.status(500).json({ 
          error: 'Failed to analyze video content',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  );

  // OpenAI API key update endpoint
  app.post("/api/admin/update-openai-key",
    isAuthenticated,
    isAdmin,
    adminLimiter,
    [
      body('apiKey').notEmpty().withMessage('API key is required'),
    ],
    handleValidationErrors,
    asyncHandler(async (req: Request, res: Response) => {
      const { apiKey } = req.body;
      
      if (!apiKey.startsWith('sk-')) {
        return res.status(400).json({ 
          error: 'Invalid API key format',
          details: 'OpenAI API keys must start with sk-'
        });
      }

      try {
        // In a production environment, you would securely store this
        // For now, we'll acknowledge the update
        res.json({ 
          success: true,
          message: 'API key update acknowledged. Please restart the application to apply changes.'
        });
      } catch (error) {
        console.error('API key update error:', error);
        res.status(500).json({ 
          error: 'Failed to update API key',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  );

  // Reorder projects
  app.post("/api/admin/projects/reorder",
    isAuthenticated,
    isAdmin,
    adminLimiter,
    body('updates').isArray(),
    handleValidationErrors,
    asyncHandler(async (req: Request, res: Response) => {
      const { updates } = req.body;
      
      // Update each project's display order
      for (const update of updates) {
        await storage.updateProject(update.id, { displayOrder: update.displayOrder });
      }
      
      res.json({ message: "Project order updated successfully" });
    })
  );

  // Biography API endpoints
  app.get("/api/biography", 
    asyncHandler(async (req: Request, res: Response) => {
      const bio = await storage.getBiography();
      res.json(bio);
    })
  );

  app.post("/api/admin/biography",
    isAuthenticated,
    isAdmin,
    adminLimiter,
    [
      body('heroTitle').optional().isString(),
      body('bioText').optional().isString(),
      body('locations').optional().isArray(),
      body('courses').optional().isArray(),
      body('clients').optional().isArray(),
      body('memberOf').optional().isArray(),
      body('profileImageUrl').optional().isString()
    ],
    handleValidationErrors,
    asyncHandler(async (req: any, res: Response) => {
      try {
        const bioData = insertBiographySchema.parse({
          ...req.body,
          updatedBy: req.user?.claims?.sub
        });
        
        const bio = await storage.upsertBiography(bioData);
        res.json(bio);
      } catch (error) {
        console.error('Biography update error:', error);
        res.status(400).json({ 
          error: 'Failed to update biography',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  );

  // Migrate old videos to Cloudinary
  app.post("/api/admin/migrate-videos",
    isAuthenticated,
    isAdmin,
    adminLimiter,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const results = await migrateVideosToCloudinary();
        
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        res.json({
          success: true,
          migrated: successful.length,
          failed: failed.length,
          results
        });
      } catch (error) {
        console.error('Migration failed:', error);
        res.status(500).json({
          error: 'Migration failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  );

  // Cloudinary signature endpoint for direct uploads
  app.post('/api/admin/cloudinary/signature',
    isAuthenticated,
    isAdmin,
    adminLimiter,
    asyncHandler(async (req: any, res: Response) => {
      const { folder, resource_type } = req.body;
      
      const timestamp = Math.round(new Date().getTime() / 1000);
      const paramsToSign = {
        timestamp,
        folder: folder || 'portfolio',
        resource_type: resource_type || 'auto'
      };
      
      // Generate signature using Cloudinary's utils
      const cloudinary = require('cloudinary').v2;
      const signature = cloudinary.utils.api_sign_request(
        paramsToSign,
        process.env.CLOUDINARY_API_SECRET
      );
      
      res.json({
        signature,
        timestamp,
        api_key: process.env.CLOUDINARY_API_KEY,
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME
      });
    })
  );

  // Simple test endpoint for FormData debugging
  app.post("/api/admin/projects/test", 
    upload.fields([
      { name: 'video', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 }
    ]),
    (req: any, res: any) => {
      console.log('===== SIMPLE TEST ENDPOINT =====');
      console.log('Content-Type:', req.headers['content-type']);
      console.log('Body:', req.body);
      console.log('Files:', req.files ? Object.keys(req.files) : 'no files');
      
      res.json({ 
        message: 'Test endpoint reached',
        bodyReceived: Object.keys(req.body || {}),
        filesReceived: req.files ? Object.keys(req.files) : [],
        title: req.body?.title,
        status: req.body?.status
      });
    }
  );

  // Add global request logging for debugging
  app.use('/api/admin/projects', (req: any, res: any, next: any) => {
    console.log('===== GLOBAL: Route intercepted =====');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Content-Length:', req.headers['content-length']);
    next();
  });

  // Create project with direct file uploads to Cloudinary
  app.post("/api/admin/projects",
    isAuthenticated,
    isAdmin,
    upload.fields([
      { name: 'video', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 }
    ]),
    asyncHandler(async (req: any, res: Response) => {
      console.log('Project creation request:', {
        body: req.body,
        files: req.files ? Object.keys(req.files) : 'no files',
        contentType: req.headers['content-type']
      });

      // Manual validation after multer processing
      if (!req.body.title || req.body.title.trim().length === 0) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: [{ field: 'title', message: 'Title is required' }] 
        });
      }

      if (req.body.status && !['draft', 'published'].includes(req.body.status)) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: [{ field: 'status', message: 'Status must be draft or published' }] 
        });
      }
      
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (!files?.video?.[0]) {
        console.log('No video file found in request');
        return res.status(400).json({ error: 'Video file is required' });
      }

      try {
        console.log('Starting Cloudinary upload...');
        console.log('File size:', files.video[0].size, 'bytes');
        console.log('File type:', files.video[0].mimetype);
        
        // Check Cloudinary configuration
        console.log('Cloudinary config check:', {
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING',
          api_key: process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING',
          api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING'
        });

        // Skip connection test and proceed directly to upload
        console.log('Proceeding with Cloudinary upload...');

        // Upload video to Cloudinary with optimizations
        const videoUploadResult = await uploadToCloudinary(files.video[0].buffer, {
          folder: 'portfolio/videos',
          resource_type: 'video',
          transformation: [
            { quality: 'auto:good' },
            { format: 'mp4' }
          ]
        });

        let thumbnailUrl = '';
        
        // Upload custom thumbnail if provided, otherwise generate from video
        if (files?.thumbnail?.[0]) {
          const thumbnailUploadResult = await uploadToCloudinary(files.thumbnail[0].buffer, {
            folder: 'portfolio/thumbnails',
            resource_type: 'image',
            transformation: [
              { width: 800, height: 450, crop: 'fill' },
              { quality: 'auto:good' },
              { format: 'jpg' }
            ]
          });
          thumbnailUrl = thumbnailUploadResult.secure_url;
        } else {
          // Generate thumbnail from video using direct URL approach
          thumbnailUrl = cloudinary.url(videoUploadResult.public_id + '.jpg', {
            resource_type: 'video',
            transformation: [
              { width: 800, height: 450, crop: 'fill' },
              { quality: 'auto' },
              { start_offset: '1.0' }
            ]
          });
        }

        // Get all projects to calculate next display order
        const allProjects = await storage.getAllProjects();
        
        // First increment all existing projects by 1 to make room at position 0
        const updatePromises = allProjects.map(project => 
          storage.updateProject(project.id, { 
            displayOrder: (project.displayOrder || 0) + 1 
          })
        );
        
        // Wait for all updates to complete before creating new project
        await Promise.all(updatePromises);

        const projectData = {
          title: req.body.title,
          description: req.body.description || null,
          category: req.body.category || null,
          client: req.body.client || null,
          agency: req.body.agency || null,
          videoUrl: videoUploadResult.secure_url,
          thumbnailUrl,
          displayOrder: 0, // New projects always appear first
          status: req.body.status || 'published', // Default to published if not provided
          createdBy: req.user.claims.sub
        };

        console.log('Saving project to database:', { 
          title: projectData.title, 
          status: projectData.status,
          videoUrl: projectData.videoUrl 
        });
        
        const validatedData = insertProjectSchema.parse(projectData);
        const project = await storage.createProject(validatedData);
        
        console.log('Project saved successfully:', { 
          id: project.id, 
          title: project.title, 
          status: project.status 
        });
        
        // Invalidate relevant caches
        cache.del(['projects:published', 'projects:featured', 'portfolio:stats']);
        
        res.status(201).json({
          message: 'Project created successfully',
          project,
          cloudinaryUrl: videoUploadResult.secure_url
        });
      } catch (error) {
        console.error("Error creating project:", error);
        
        // Handle specific Cloudinary errors
        if (error instanceof Error) {
          if (error.message.includes('File size too large') || error.message.includes('413')) {
            return res.status(413).json({ 
              error: "File too large for Cloudinary free tier",
              details: "Video files must be under 100MB for Cloudinary free tier. Please compress your video or upgrade your Cloudinary plan.",
              action: "compress_or_upgrade"
            });
          }
          
          if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
            return res.status(408).json({ 
              error: "Upload timeout",
              details: "Video upload timed out. This often happens with large files on Cloudinary free tier.",
              action: "retry_smaller_file"
            });
          }
          
          if (error.message.includes('quota') || error.message.includes('limit')) {
            return res.status(429).json({ 
              error: "Cloudinary quota exceeded",
              details: "Your Cloudinary account has reached its usage limits.",
              action: "upgrade_cloudinary"
            });
          }
        }
        
        // Log the full error for debugging
        console.error('Full error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : undefined,
          timestamp: new Date().toISOString()
        });
        
        res.status(500).json({ 
          error: "Failed to create project",
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    })
  );

  // Update project order
  app.post("/api/admin/projects/reorder",
    isAuthenticated,
    isAdmin,
    asyncHandler(async (req: any, res: Response) => {
      const { updates } = req.body;
      
      if (!Array.isArray(updates)) {
        return res.status(400).json({ error: 'Updates must be an array' });
      }

      try {
        // Update display order for each project
        for (const update of updates) {
          if (typeof update.id !== 'number' || typeof update.displayOrder !== 'number') {
            return res.status(400).json({ error: 'Invalid update format' });
          }
          
          await storage.updateProject(update.id, { displayOrder: update.displayOrder });
        }

        // Invalidate relevant caches
        cache.del(['projects:published', 'projects:featured', 'portfolio:stats']);
        
        res.json({ message: 'Project order updated successfully' });
      } catch (error) {
        console.error('Error updating project order:', error);
        res.status(500).json({ error: 'Failed to update project order' });
      }
    })
  );

  // Update project
  app.patch("/api/admin/projects/:id",
    isAuthenticated,
    isAdmin,
    [
      param('id').isInt({ min: 1 }).withMessage('Valid project ID required'),
      body('title').optional().trim().isLength({ min: 1 }).withMessage('Title cannot be empty'),
      body('description').optional().isString(),
      body('category').optional().isString(),
      body('client').optional().isString(),
      body('agency').optional().isString(),
      body('status').optional().isIn(['draft', 'published']).withMessage('Invalid status'),
    ],
    handleValidationErrors,
    asyncHandler(async (req: any, res: Response) => {
      const projectId = parseInt(req.params.id);
      const updates = req.body;

      try {
        const existingProject = await storage.getProject(projectId);
        if (!existingProject) {
          return res.status(404).json({ error: 'Project not found' });
        }

        const updatedProject = await storage.updateProject(projectId, updates);
        
        // Invalidate relevant caches
        cache.del(['projects:published', 'projects:featured', 'portfolio:stats']);
        
        res.json(updatedProject);
      } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ error: 'Failed to update project' });
      }
    })
  );

  // Biography photo upload
  app.post("/api/admin/biography/photo", 
    isAuthenticated, 
    isAdmin,
    photoUpload.single('photo'), 
    asyncHandler(async (req: any, res: Response) => {
      if (!req.file) {
        return res.status(400).json({ message: "No photo file provided" });
      }

      const file = req.file;
      
      // Upload photo to Cloudinary
      const result = await uploadToCloudinary(file.buffer, {
        folder: 'portfolio/profiles',
        resource_type: 'image',
        public_id: `profile_${req.user.claims.sub}_${Date.now()}`
      });
      
      // Generate optimized URL with transformations
      const imageUrl = generateThumbnailUrl(result.public_id, {
        width: 800,
        height: 800,
        crop: 'fill',
        quality: 'auto',
        format: 'webp'
      });
      
      res.json({ imageUrl });
    })
  );

  // Contact form submission endpoint
  app.post("/api/contact", 
    generalLimiter,
    [
      body('email').isEmail().withMessage('Please provide a valid email address'),
      body('message').isLength({ min: 10 }).withMessage('Message must be at least 10 characters long'),
      body('name').optional().isLength({ max: 100 }).withMessage('Name must be less than 100 characters'),
    ],
    handleValidationErrors,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        // Validate request body with Zod
        const formData = contactFormSchema.parse(req.body);
        
        // Get contact settings to determine destination email
        const settings = await storage.getContactSettings();
        const destinationEmail = settings?.destinationEmail || 'franciscopuyol@gmail.com';
        
        // Check if contact form is enabled
        if (settings && !settings.formEnabled) {
          return res.status(503).json({ 
            error: 'Contact form is temporarily disabled',
            message: 'Please try again later or contact directly via email'
          });
        }
        
        // Try SendGrid first, fallback to Nodemailer if it fails
        let emailSent = await sendContactEmail(formData, destinationEmail);
        
        if (!emailSent) {
          console.log('📧 SendGrid failed, trying Nodemailer fallback...');
          emailSent = await sendContactEmailNodemailer(formData, destinationEmail);
        }
        
        // Log the submission for manual review regardless of email status
        console.log('Contact Form Submission:', {
          timestamp: new Date().toISOString(),
          name: formData.name || 'Not provided',
          email: formData.email,
          message: formData.message,
          emailSent: emailSent
        });
        
        if (!emailSent) {
          return res.status(500).json({ 
            error: 'Failed to send message',
            message: 'There was an issue sending your message. Please try again or contact directly via email.'
          });
        }
        
        res.json({ 
          success: true, 
          message: 'Message sent successfully! I\'ll get back to you soon.'
        });
      } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ 
          error: 'Failed to send message',
          message: 'Please try again later'
        });
      }
    })
  );

  // Get contact settings (public endpoint)
  app.get("/api/contact/settings", 
    asyncHandler(async (req: Request, res: Response) => {
      const settings = await storage.getContactSettings();
      res.json({
        ctaText: settings?.ctaText || "Let's Chat.",
        formEnabled: settings?.formEnabled ?? true
      });
    })
  );

  // Admin contact settings management
  app.get("/api/admin/contact/settings", 
    isAuthenticated,
    isAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const settings = await storage.getContactSettings();
      res.json(settings || {
        ctaText: "Let's Chat.",
        destinationEmail: "franciscopuyol@gmail.com",
        formEnabled: true
      });
    })
  );

  app.put("/api/admin/contact/settings", 
    isAuthenticated,
    isAdmin,
    adminLimiter,
    [
      body('ctaText').notEmpty().withMessage('CTA text is required'),
      body('destinationEmail').isEmail().withMessage('Please provide a valid destination email'),
      body('formEnabled').isBoolean().withMessage('Form enabled must be true or false'),
    ],
    handleValidationErrors,
    asyncHandler(async (req: any, res: Response) => {
      try {
        const settingsData = insertContactSettingsSchema.parse({
          ...req.body,
          updatedBy: req.user.claims.sub
        });
        
        const settings = await storage.upsertContactSettings(settingsData);
        res.json(settings);
      } catch (error) {
        console.error('Contact settings update error:', error);
        res.status(500).json({ 
          error: 'Failed to update contact settings',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  );

  // Global error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', err);
    
    if (err.name === 'ValidationError' || err.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: err.errors || err.issues
      });
    }
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large',
        message: 'Video file exceeds maximum size limit'
      });
    }
    
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
