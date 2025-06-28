import { useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Video, Image, Loader2, Plus } from "lucide-react";
import { motion } from "framer-motion";
import type { Category } from "@shared/schema";
import AISuggestions from "./AISuggestions";
import ThumbnailSelector from "./ThumbnailSelector";

interface ProjectUploaderProps {
  onSuccess?: () => void;
  categories?: Category[];
}

export default function ProjectUploaderFixed({ onSuccess, categories = [] }: ProjectUploaderProps) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    client: '',
    agency: '',
    role: '',
    tags: ''
  });
  
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [buttonState, setButtonState] = useState<'create' | 'uploading' | 'publish'>('create');
  
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
        console.log('Making fetch request to /api/admin/projects');
        
        // Use the real endpoint now that FormData transmission is confirmed working
        const response = await fetch('/api/admin/projects', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log('Error response:', errorText);
          throw new Error(`${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        
        clearInterval(progressInterval);
        setUploadProgress(100);
        setButtonState('publish');
        
        return result;
      } catch (error) {
        console.error('Upload error:', error);
        clearInterval(progressInterval);
        setUploadProgress(0);
        setButtonState('create');
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
        role: '',
        tags: ''
      });
      setVideoFile(null);
      setThumbnailFile(null);
      setUploadProgress(0);
      setButtonState('create');
      
      toast({
        title: "Success",
        description: "Project published successfully",
      });
      onSuccess?.();
    },
    onError: (error) => {
      setButtonState('create');
      setUploadProgress(0);
      
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = `${import.meta.env.VITE_API_URL}/api/login`;
        }, 500);
        return;
      }
      
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          toast({
            title: "Network Error",
            description: "Connection failed. Please check your internet connection and try again.",
            variant: "destructive",
          });
          return;
        }
        
        if (error.message.includes('413') || error.message.includes('File too large')) {
          toast({
            title: "File Too Large",
            description: "Video exceeds 100MB Cloudinary free tier limit. Please compress your video.",
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
    
    console.log('Form submission started', { videoFile: videoFile?.name, form });
    
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
    
    // Add video file first
    formData.append('video', videoFile, videoFile.name);
    
    // Add thumbnail if provided
    if (thumbnailFile) {
      formData.append('thumbnail', thumbnailFile, thumbnailFile.name);
    }
    
    // Add all form fields explicitly
    formData.append('title', form.title.trim());
    formData.append('status', 'published');
    
    if (form.description && form.description.trim()) {
      formData.append('description', form.description.trim());
    }
    if (form.category) {
      formData.append('category', form.category);
    }
    if (form.client && form.client.trim()) {
      formData.append('client', form.client.trim());
    }
    if (form.agency && form.agency.trim()) {
      formData.append('agency', form.agency.trim());
    }
    if (form.role && form.role.trim()) {
      formData.append('role', form.role.trim());
    }
    if (form.tags && form.tags.trim()) {
      formData.append('tags', form.tags.trim());
    }


    // Debug form data with detailed logging
    console.log('FormData being sent:');
    console.log('- Video file:', videoFile.name, videoFile.size, 'bytes');
    console.log('- Title:', form.title.trim());
    console.log('- Status: published');
    
    for (let [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
      } else {
        console.log(`${key}: "${value}"`);
      }
    }

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
      console.log('Video file selected:', file.name, (file.size / 1024 / 1024).toFixed(1) + 'MB');
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
      console.log('Thumbnail file selected:', file.name);
    }
  };

  const getButtonText = () => {
    switch (buttonState) {
      case 'uploading':
        return 'Uploading...';
      case 'publish':
        return 'Publish';
      default:
        return 'Create Project';
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

          {/* AI Suggestions */}
          <AISuggestions
            title={form.title}
            category={form.category}
            client={form.client}
            description={form.description}
            onDescriptionSelect={(description) => setForm({ ...form, description })}
            onRoleSelect={(roles) => setForm({ ...form, role: roles.join(', ') })}
            onTagSelect={(tags) => setForm({ ...form, tags: tags.join(', ') })}
          />

          {/* Thumbnail Selector */}
          {videoFile && (
            <ThumbnailSelector
              videoUrl={videoFile ? URL.createObjectURL(videoFile) : undefined}
              onThumbnailSelect={(thumbnailUrl) => {
                // Convert data URL to File if needed for upload
                console.log('Thumbnail selected:', thumbnailUrl);
              }}
              currentThumbnail={thumbnailFile ? URL.createObjectURL(thumbnailFile) : undefined}
            />
          )}

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
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.slug}>
                    {category.name}
                  </SelectItem>
                ))}
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

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Project description"
              rows={3}
            />
          </div>

          {/* Role and Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                type="text"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="e.g., Editing, Motion, Color"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                type="text"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="e.g., commercial, animation"
              />
            </div>
          </div>

          {/* Submit Button with Progress */}
          <div className="relative">
            <Button
              type="submit"
              disabled={createProjectMutation.isPending || !videoFile || !form.title.trim() || buttonState === 'uploading'}
              className="w-full relative overflow-hidden"
            >
              {/* Progress Bar Background */}
              {buttonState === 'uploading' && (
                <motion.div
                  className="absolute inset-0 bg-red-600/30"
                  initial={{ width: '0%' }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              )}
              
              {/* Button Content */}
              <div className="relative z-10 flex items-center justify-center">
                {buttonState === 'uploading' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {getButtonText()} ({Math.round(uploadProgress)}%)
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {getButtonText()}
                  </>
                )}
              </div>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
