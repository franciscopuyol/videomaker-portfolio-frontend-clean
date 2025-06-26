import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface VideoUploaderProps {
  onUploadComplete: (videoUrl: string, thumbnailUrl?: string) => void;
  onUploadStart?: () => void;
  maxSizeMB?: number;
}

export default function VideoUploader({ 
  onUploadComplete, 
  onUploadStart, 
  maxSizeMB = 50 
}: VideoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: `Video file must be smaller than ${maxSizeMB}MB. Current size: ${Math.round(file.size / (1024 * 1024))}MB`,
        variant: "destructive",
      });
      event.target.value = '';
      return;
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please select a valid video file (MP4, MOV, AVI, QuickTime, WebM)",
        variant: "destructive",
      });
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const uploadToCloudinary = async (file: File) => {
    try {
      setUploading(true);
      setProgress(0);
      onUploadStart?.();

      // Get upload signature from server
      const signatureResponse = await fetch('/api/admin/cloudinary/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder: 'portfolio/videos',
          resource_type: 'video'
        })
      });

      if (!signatureResponse.ok) {
        throw new Error('Failed to get upload signature');
      }

      const { signature, timestamp, api_key, cloud_name } = await signatureResponse.json();

      // Create form data for direct Cloudinary upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('signature', signature);
      formData.append('timestamp', timestamp);
      formData.append('api_key', api_key);
      formData.append('folder', 'portfolio/videos');
      formData.append('resource_type', 'video');
      formData.append('public_id', `video_${Date.now()}`);

      // Upload directly to Cloudinary with progress tracking
      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${cloud_name}/video/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error('Cloudinary upload failed');
      }

      const result = await uploadResponse.json();
      
      // Generate optimized URLs
      const videoUrl = `https://res.cloudinary.com/${cloud_name}/video/upload/q_auto,f_auto/${result.public_id}.mp4`;
      const thumbnailUrl = `https://res.cloudinary.com/${cloud_name}/video/upload/so_3.0,w_800,h_450,c_fill,q_auto,f_auto/${result.public_id}.jpg`;

      setProgress(100);
      onUploadComplete(videoUrl, thumbnailUrl);
      
      toast({
        title: "Upload Successful",
        description: "Video uploaded successfully to cloud storage",
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload video",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProgress(0);
      setSelectedFile(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-gray-300 mb-2 block">Video File</label>
        <input
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-red-600 file:text-white hover:file:bg-red-700"
          disabled={uploading}
        />
        <p className="text-xs text-gray-500 mt-1">
          Maximum file size: {maxSizeMB}MB. Supported formats: MP4, MOV, AVI, QuickTime, WebM
        </p>
      </div>

      {selectedFile && (
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">Selected: {selectedFile.name}</span>
            <span className="text-xs text-gray-500">
              {Math.round(selectedFile.size / (1024 * 1024))}MB
            </span>
          </div>
          
          {!uploading ? (
            <Button 
              onClick={() => uploadToCloudinary(selectedFile)}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              Upload Video
            </Button>
          ) : (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-center text-gray-400">
                Uploading... {progress}%
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}