import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';

interface SimpleProjectCreatorProps {
  onSuccess?: () => void;
}

export default function SimpleProjectCreator({ onSuccess }: SimpleProjectCreatorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState({
    title: '',
    client: '',
    agency: '',
    category: '',
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
    displayOrder: 0
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      // Filter out empty thumbnail URL to avoid validation errors
      const payload = {
        ...data,
        thumbnailUrl: data.thumbnailUrl.trim() || undefined
      };
      
      return apiRequest('/api/admin/projects/create-with-urls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/projects'] });
      setForm({
        title: '',
        client: '',
        agency: '',
        category: '',
        description: '',
        videoUrl: '',
        thumbnailUrl: '',
        displayOrder: 0
      });
      toast({
        title: "Success",
        description: "Project created successfully",
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
          window.location.href = `${import.meta.env.VITE_API_URL}/api/login`;
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a title for the project",
        variant: "destructive",
      });
      return;
    }

    if (!form.videoUrl.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a video URL",
        variant: "destructive",
      });
      return;
    }

    createProjectMutation.mutate(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-gray-300 mb-2 block">Title *</label>
          <Input
            placeholder="Enter project title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="bg-gray-800 border-gray-600 text-white"
            required
          />
        </div>
        <div>
          <label className="text-sm text-gray-300 mb-2 block">Client</label>
          <Input
            placeholder="Enter client name"
            value={form.client}
            onChange={(e) => setForm({ ...form, client: e.target.value })}
            className="bg-gray-800 border-gray-600 text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-gray-300 mb-2 block">Agency</label>
          <Input
            placeholder="Enter agency name"
            value={form.agency}
            onChange={(e) => setForm({ ...form, agency: e.target.value })}
            className="bg-gray-800 border-gray-600 text-white"
          />
        </div>
        <div>
          <label className="text-sm text-gray-300 mb-2 block">Display Order</label>
          <Input
            type="number"
            placeholder="0"
            value={form.displayOrder}
            onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })}
            className="bg-gray-800 border-gray-600 text-white"
            min="0"
          />
        </div>
      </div>

      <div>
        <label className="text-sm text-gray-300 mb-2 block">Category</label>
        <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
          <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            <SelectItem value="commercial">Commercial</SelectItem>
            <SelectItem value="music-video">Music Video</SelectItem>
            <SelectItem value="documentary">Documentary</SelectItem>
            <SelectItem value="short-film">Short Film</SelectItem>
            <SelectItem value="branded-content">Branded Content</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm text-gray-300 mb-2 block">Description</label>
        <Textarea
          placeholder="Enter project description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="bg-gray-800 border-gray-600 text-white min-h-[120px]"
        />
      </div>

      <div className="space-y-4 border-t border-gray-700 pt-6">
        <h3 className="text-lg font-semibold text-white">Media URLs</h3>
        <p className="text-sm text-gray-400">
          Upload your video to any cloud service (Vimeo, YouTube, Cloudinary, etc.) and paste the URLs here.
        </p>
        
        <div>
          <label className="text-sm text-gray-300 mb-2 block">Video URL *</label>
          <Input
            placeholder="https://example.com/video.mp4"
            value={form.videoUrl}
            onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
            className="bg-gray-800 border-gray-600 text-white"
            type="url"
            required
          />
        </div>

        <div>
          <label className="text-sm text-gray-300 mb-2 block">Thumbnail URL (Optional)</label>
          <Input
            placeholder="https://example.com/thumbnail.jpg"
            value={form.thumbnailUrl}
            onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
            className="bg-gray-800 border-gray-600 text-white"
            type="url"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button
          type="submit"
          disabled={createProjectMutation.isPending}
          className="bg-red-600 hover:bg-red-700"
        >
          {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
        </Button>
      </div>
    </form>
  );
}
