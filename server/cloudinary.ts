import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Parse Cloudinary credentials properly
let cloudName = process.env.CLOUDINARY_CLOUD_NAME;
let apiKey = process.env.CLOUDINARY_API_KEY;
let apiSecret = process.env.CLOUDINARY_API_SECRET;

// If CLOUDINARY_CLOUD_NAME contains a URL, extract just the cloud name
if (cloudName && cloudName.includes('cloudinary://')) {
  console.log('Detected CLOUDINARY_URL in cloud_name, parsing...');
  // Extract cloud name from URL: cloudinary://api_key:api_secret@cloud_name
  const match = cloudName.match(/@([^/]+)/);
  if (match) {
    cloudName = match[1];
    console.log('Extracted cloud name:', cloudName);
  }
}

console.log('Final credentials check:', {
  cloud_name: cloudName || 'NOT_SET',
  api_key: apiKey ? 'SET' : 'NOT_SET',
  api_secret: apiSecret ? 'SET' : 'NOT_SET'
});

// Configure Cloudinary with cleaned credentials
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

// Verify configuration was applied correctly
const config = cloudinary.config();
console.log('Cloudinary configuration verified:', {
  cloud_name: config.cloud_name || 'NOT_SET',
  api_key: config.api_key ? 'SET' : 'NOT_SET',
  api_secret: config.api_secret ? 'SET' : 'NOT_SET'
});

export interface CloudinaryUploadOptions {
  folder?: string;
  transformation?: any;
  resource_type?: 'image' | 'video' | 'raw' | 'auto';
  public_id?: string;
}

export interface CloudinaryUploadResult {
  public_id: string;
  url: string;
  secure_url: string;
  width?: number;
  height?: number;
  format: string;
  resource_type: string;
  bytes: number;
}

/**
 * Upload a file buffer to Cloudinary
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    // For large videos (>40MB), use async processing
    const isLargeVideo = buffer.length > 40 * 1024 * 1024; // 40MB threshold
    
    const uploadOptions: any = {
      resource_type: options.resource_type || 'auto',
      folder: options.folder || 'portfolio',
      transformation: options.transformation,
      public_id: options.public_id,
      use_filename: false,
      unique_filename: true,
    };

    // For large videos, use async processing without eager transformations
    if (isLargeVideo) {
      uploadOptions.eager_async = true;
    } else {
      // For smaller files, add eager transformations
      uploadOptions.eager = [
        { width: 1920, height: 1080, crop: 'limit', quality: 'auto', format: 'mp4' },
        { width: 640, height: 360, crop: 'limit', quality: 'auto', format: 'jpg' }
      ];
      uploadOptions.eager_async = true;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error details:', {
            message: error.message,
            http_code: error.http_code,
            error: error
          });
          reject(error);
        } else if (result) {
          console.log('Cloudinary upload successful:', {
            public_id: result.public_id,
            secure_url: result.secure_url,
            bytes: result.bytes
          });
          resolve(result as CloudinaryUploadResult);
        } else {
          reject(new Error('Upload failed - no result returned'));
        }
      }
    );

    // Create a readable stream from buffer and pipe to Cloudinary
    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
}

/**
 * Delete a file from Cloudinary
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
}

/**
 * Generate optimized thumbnail URL with Cloudinary transformations
 */
export function generateThumbnailUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string | number;
    format?: string;
  } = {}
): string {
  const {
    width = 800,
    height = 450,
    crop = 'fill',
    quality = 'auto',
    format = 'webp'
  } = options;

  return cloudinary.url(publicId, {
    width,
    height,
    crop,
    quality,
    format,
    fetch_format: 'auto',
    dpr: 'auto',
  });
}

/**
 * Generate video thumbnail from video URL
 */
export function generateVideoThumbnail(
  videoPublicId: string,
  options: {
    width?: number;
    height?: number;
    time?: string;
  } = {}
): string {
  const {
    width = 800,
    height = 450,
    time = '1.0'
  } = options;

  return cloudinary.url(videoPublicId, {
    resource_type: 'video',
    width,
    height,
    crop: 'fill',
    quality: 'auto',
    format: 'jpg',
    start_offset: time,
    fetch_format: 'auto',
  });
}

/**
 * Get optimized video URL with adaptive streaming
 */
export function generateOptimizedVideoUrl(
  publicId: string,
  options: {
    quality?: string;
    format?: string;
  } = {}
): string {
  const {
    quality = 'auto',
    format = 'mp4'
  } = options;

  return cloudinary.url(publicId, {
    resource_type: 'video',
    quality,
    format,
    fetch_format: 'auto',
  });
}

export default cloudinary;