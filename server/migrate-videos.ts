import fs from 'fs';
import path from 'path';
import { uploadToCloudinary, generateOptimizedVideoUrl, generateVideoThumbnail } from './cloudinary';
import { storage } from './storage';

interface MigrationResult {
  success: boolean;
  projectId: number;
  oldPath: string;
  newUrl?: string;
  error?: string;
}

/**
 * Migrate videos from local uploads folder to Cloudinary
 */
export async function migrateVideosToCloudinary(): Promise<MigrationResult[]> {
  const results: MigrationResult[] = [];
  const uploadsDir = path.join(process.cwd(), 'uploads', 'videos');
  
  // Check if uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    console.log('No uploads/videos directory found. Migration not needed.');
    return results;
  }

  // Get all projects with local video URLs
  const projects = await storage.getAllProjects();
  const projectsWithLocalVideos = projects.filter(p => 
    p.videoUrl && p.videoUrl.startsWith('/uploads/videos/')
  );

  console.log(`Found ${projectsWithLocalVideos.length} projects with local videos to migrate`);

  for (const project of projectsWithLocalVideos) {
    try {
      // Extract filename from URL
      const filename = project.videoUrl!.replace('/uploads/videos/', '');
      const localFilePath = path.join(uploadsDir, filename);

      if (!fs.existsSync(localFilePath)) {
        console.warn(`File not found: ${localFilePath}`);
        results.push({
          success: false,
          projectId: project.id,
          oldPath: localFilePath,
          error: 'File not found'
        });
        continue;
      }

      console.log(`Migrating video for project ${project.id}: ${filename}`);

      // Read file buffer
      const fileBuffer = fs.readFileSync(localFilePath);
      
      // Upload to Cloudinary
      const uploadResult = await uploadToCloudinary(fileBuffer, {
        folder: 'portfolio/videos',
        resource_type: 'video',
        public_id: `migrated_video_${project.id}_${Date.now()}`
      });

      const newVideoUrl = generateOptimizedVideoUrl(uploadResult.public_id);
      
      // Generate new thumbnail if needed
      let newThumbnailUrl = project.thumbnailUrl;
      if (!newThumbnailUrl || newThumbnailUrl.startsWith('/uploads/thumbnails/')) {
        newThumbnailUrl = generateVideoThumbnail(uploadResult.public_id, { time: '1.0' });
      }

      // Update project in database
      await storage.updateProject(project.id, {
        videoUrl: newVideoUrl,
        thumbnailUrl: newThumbnailUrl
      });

      results.push({
        success: true,
        projectId: project.id,
        oldPath: localFilePath,
        newUrl: newVideoUrl
      });

      console.log(`✓ Successfully migrated project ${project.id}`);

    } catch (error) {
      console.error(`✗ Failed to migrate project ${project.id}:`, error);
      results.push({
        success: false,
        projectId: project.id,
        oldPath: project.videoUrl ?? '',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return results;
}

/**
 * CLI script to run migration
 */
export async function runMigration() {
  console.log('Starting video migration to Cloudinary...');
  
  try {
    const results = await migrateVideosToCloudinary();
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log('\n=== Migration Results ===');
    console.log(`✓ Successfully migrated: ${successful.length} videos`);
    console.log(`✗ Failed migrations: ${failed.length} videos`);
    
    if (failed.length > 0) {
      console.log('\nFailed migrations:');
      failed.forEach(result => {
        console.log(`- Project ${result.projectId}: ${result.error}`);
      });
    }
    
    console.log('\nMigration completed!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}