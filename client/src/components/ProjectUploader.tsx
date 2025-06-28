import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Upload, Video, Image, Loader2, Play, Pause, Camera } from "lucide-react";
import { motion } from "framer-motion";

interface ProjectUploaderProps {
  onSuccess?: () => void;
}

export default function ProjectUploader({ onSuccess }: ProjectUploaderProps) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    client: '',
    agency: '',
    displayOrder: 0
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [thumbnailOption, setThumbnailOption] = useState<'auto' | 'upload' | 'frame'>('auto');
  const [selectedFrameTime, setSelectedFrameTime] = useState<number>(1);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [buttonState, setButtonState] = useState<'create' | 'uploading' | 'publish'>('create');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createProjectMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setButtonState('uploading');
      setUploadProgress(0);
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 200);
      
      try {
        const result = await apiRequest('/api/admin/projects', {
          method: 'POST',
          body: formData,
        });
        
        clearInterval(progressInterval);
        setUploadProgress(100);
        setButtonState('publish');
        
        return result;
      } catch (error) {
        clearInterval(progressInterval);
        setUploadProgress(0);
        setButtonState('create');
        console.error('Upload error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
      // Reset form
      setForm({
        title: '',
        description: '',
        category: '',
        client: '',
        agency: '',
        displayOrder: 0
      });
      setVideoFile(null);
      setThumbnailFile(null);
      setVideoPreviewUrl(null);
      setThumbnailOption('auto');
      setSelectedFrameTime(1);
      setVideoDuration(0);
      setUploadProgress(0);
      setButtonState('create');
      
      toast({
        title: "Success",
        description: "Project published successfully",
      });
      onSuccess?.();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = {${import.meta.env.VITE_API_URL}/api/login};
        }, 500);
        return;
      }
      
      console.error("Project creation error:", error);
      
      // Handle network errors
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        toast({
          title: "Network Error",
          description: "Connection failed. Please check your internet connection and try again.",
          variant: "destructive",
        });
        return;
      }
      
      // Handle specific Cloudinary errors
      if (error instanceof Error) {
        if (error.message.includes('413') || error.message.includes('File too large')) {
          toast({
            title: "File Too Large",
            description: "Video exceeds 100MB Cloudinary free tier limit. Please compress your video or upgrade your Cloudinary plan.",
            variant: "destructive",
          });
          return;
        }
        
        if (error.message.includes('408') || error.message.includes('timeout')) {
          toast({
            title: "Upload Timeout",
            description: "Upload timed out. Try with a smaller file or check your connection.",
            variant: "destructive",
          });
          return;
        }
        
        if (error.message.includes('429') || error.message.includes('quota')) {
          toast({
            title: "Cloudinary Quota Exceeded",
            description: "Your Cloudinary account has reached its limits. Please upgrade your plan.",
            variant: "destructive",
          });
          return;
        }
        
        if (error.message.includes('400') && error.message.includes('Validation failed')) {
          toast({
            title: "Validation Error",
            description: "Please check all required fields and try again.",
            variant: "destructive",
          });
          return;
        }
      }
      
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submission started', { videoFile, form });
    
    if (!videoFile) {
      toast({
        title: "Error",
        description: "Please select a video file",
        variant: "destructive",
      });
      return;
    }

    if (!form.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('video', videoFile);
    
    // Handle thumbnail based on selected option
    if (thumbnailOption === 'upload' && thumbnailFile) {
      formData.append('thumbnail', thumbnailFile);
    } else if (thumbnailOption === 'frame') {
      try {
        const frameBlob = await captureFrameAsBlob();
        formData.append('thumbnail', frameBlob, 'frame-thumbnail.jpg');
      } catch (error) {
        console.error('Failed to capture frame:', error);
        toast({
          title: "Frame Capture Failed",
          description: "Using auto-generated thumbnail instead",
          variant: "destructive",
        });
      }
    }
    
    // Append form fields
    Object.entries(form).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        formData.append(key, value.toString());
      }
    });
    
    // Add required status field
    formData.append('status', 'published');

    console.log('FormData created:', {
      videoFile: videoFile.name,
      thumbnailFile: thumbnailFile?.name,
      formFields: Object.fromEntries(formData.entries())
    });

    createProjectMutation.mutate(formData);
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (100MB limit for Cloudinary free tier)
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Video file must be under 100MB (Cloudinary free tier limit)",
          variant: "destructive",
        });
        return;
      }
      setVideoFile(file);
      
      // Create preview URL for video
      const url = URL.createObjectURL(file);
      setVideoPreviewUrl(url);
      
      // Clean up previous URL
      return () => {
        if (videoPreviewUrl) {
          URL.revokeObjectURL(videoPreviewUrl);
        }
      };
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
      setSelectedFrameTime(Math.min(1, videoRef.current.duration / 2));
    }
  };

  const handleFrameTimeChange = (value: number[]) => {
    const time = value[0];
    setSelectedFrameTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const captureFrameAsBlob = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!videoRef.current || !canvasRef.current) {
        reject(new Error('Video or canvas not available'));
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to capture frame'));
        }
      }, 'image/jpeg', 0.9);
    });
  };

  const toggleVideoPlayback = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (10MB limit for images)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Thumbnail file must be under 10MB",
          variant: "destructive",
        });
        return;
      }
      setThumbnailFile(file);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload New Project
        </CardTitle>
        <CardDescription>
          Upload video files directly to Cloudinary with automatic thumbnail generation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Enter project title"
              required
            />
          </div>

          {/* Video Upload */}
          <div className="space-y-2">
            <Label htmlFor="video">Video File *</Label>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Input
                  id="video"
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  required
                />
              </div>
              {videoFile && (
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <Video className="h-4 w-4" />
                  {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)}MB)
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Max size: 100MB (Cloudinary free tier). Supported formats: MP4, MOV, AVI
            </p>
          </div>

          {/* Thumbnail Upload (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="thumbnail">Custom Thumbnail (Optional)</Label>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Input
                  id="thumbnail"
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                />
              </div>
              {thumbnailFile && (
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <Image className="h-4 w-4" />
                  {thumbnailFile.name} ({(thumbnailFile.size / 1024 / 1024).toFixed(1)}MB)
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              If not provided, a thumbnail will be generated from the video
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Enter project description"
              rows={3}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="narrative">Narrative</SelectItem>
                <SelectItem value="documentary">Documentary</SelectItem>
                <SelectItem value="music-video">Music Video</SelectItem>
                <SelectItem value="corporate">Corporate</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Client and Agency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Input
                id="client"
                type="text"
                value={form.client}
                onChange={(e) => setForm({ ...form, client: e.target.value })}
                placeholder="Client name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agency">Agency</Label>
              <Input
                id="agency"
                type="text"
                value={form.agency}
                onChange={(e) => setForm({ ...form, agency: e.target.value })}
                placeholder="Agency name"
              />
            </div>
          </div>

          {/* Display Order */}
          <div className="space-y-2">
            <Label htmlFor="displayOrder">Display Order</Label>
            <Input
              id="displayOrder"
              type="number"
              value={form.displayOrder}
              onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })}
              placeholder="0"
              min="0"
            />
            <p className="text-sm text-muted-foreground">
              Lower numbers appear first in the portfolio
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={createProjectMutation.isPending || !videoFile || !form.title.trim()}
            className="w-full"
          >
            {createProjectMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Create Project
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
