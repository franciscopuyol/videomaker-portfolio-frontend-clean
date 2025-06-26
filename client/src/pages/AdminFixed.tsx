import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, CheckCircle, Play, Pause, GripVertical, Save } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { apiRequest } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';
import type { Project } from '@shared/schema';
import ContentGenerator from '@/components/ContentGenerator';
import AIQuotaManager from '@/components/AIQuotaManager';
import BiographyEditor from '@/components/BiographyEditorFixed';
import ProjectUploaderFixed from '@/components/ProjectUploaderFixed';
import SortableProjectCard from '@/components/SortableProjectCard';

interface CreateProjectForm {
  title: string;
  client: string;
  agency: string;
  category: string;
  description: string;
  displayOrder: number;
  videoFile?: File;
  thumbnailFile?: File;
  thumbnailOption: 'auto' | 'upload' | 'frame';
  frameTime?: number;
}

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // State
  const [activeTab, setActiveTab] = useState<'projects' | 'biography' | 'ai-status'>('projects');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  
  // Drag and drop state
  const [projectOrder, setProjectOrder] = useState<Project[]>([]);
  
  // Edit form state
  const [editForm, setEditForm] = useState<CreateProjectForm>({
    title: '',
    client: '',
    agency: '',
    category: '',
    description: '',
    displayOrder: 0,
    thumbnailOption: 'auto'
  });
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch projects
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['/api/admin/projects'],
    retry: false,
  });

  // Update project order when projects change
  useEffect(() => {
    if (projects.length > 0) {
      const sortedProjects = [...projects].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      setProjectOrder(sortedProjects);
    }
  }, [projects]);

  // Handle drag end for reordering
  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = projectOrder.findIndex(project => project.id === active.id);
    const newIndex = projectOrder.findIndex(project => project.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(projectOrder, oldIndex, newIndex);
      setProjectOrder(newOrder);

      // Create updates array with new display orders
      const updates = newOrder.map((project, index) => ({
        id: project.id,
        displayOrder: index
      }));

      // Send to backend
      reorderProjectsMutation.mutate(updates);
    }
  };

  // Open edit dialog with project data
  const openEditDialog = (project: Project) => {
    setSelectedProject(project);
    setEditForm({
      title: project.title,
      client: project.client || '',
      agency: project.agency || '',
      category: project.category || '',
      description: project.description || '',
      displayOrder: project.displayOrder || 0,
      thumbnailOption: 'auto'
    });
    setIsEditDialogOpen(true);
  };

  // Fetch suggestions for autocomplete
  const { data: suggestions } = useQuery({
    queryKey: ['/api/admin/suggestions'],
    retry: false,
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/projects/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/projects'] });
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to delete project",
        variant: "destructive",
      });
    },
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<Project> }) => {
      return apiRequest(`/api/admin/projects/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.updates)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setIsEditDialogOpen(false);
      toast({
        title: "Project updated successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Failed to update project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle edit form submission
  const handleEditSubmit = () => {
    if (!selectedProject) return;
    
    updateProjectMutation.mutate({
      id: selectedProject.id,
      updates: {
        title: editForm.title,
        client: editForm.client || null,
        agency: editForm.agency || null,
        category: editForm.category || null,
        description: editForm.description || null,
      }
    });
  };

  // Migration mutation (unused - removed from UI)
  const migrationMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/admin/migrate-videos', {
        method: 'POST',
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/projects'] });
      toast({
        title: "Migration Complete",
        description: `Successfully migrated ${data.migrated} videos. ${data.failed} failed.`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Migration Failed",
        description: error.message || "Failed to migrate videos",
        variant: "destructive",
      });
    },
  });

  // Reorder projects mutation
  const reorderProjectsMutation = useMutation({
    mutationFn: async (updates: { id: number; displayOrder: number }[]) => {
      return apiRequest('/api/admin/projects/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Project order updated successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Failed to update project order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
            Admin Panel
          </h1>

          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('projects')}
                className={`px-6 py-2 rounded-md transition-colors ${
                  activeTab === 'projects'
                    ? 'bg-red-500 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Project Management
              </button>
              <button
                onClick={() => setActiveTab('biography')}
                className={`px-6 py-2 rounded-md transition-colors ${
                  activeTab === 'biography'
                    ? 'bg-red-500 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                About Section
              </button>
              <button
                onClick={() => setActiveTab('ai-status')}
                className={`px-6 py-2 rounded-md transition-colors ${
                  activeTab === 'ai-status'
                    ? 'bg-red-500 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                AI Assistant
              </button>
            </div>
          </div>

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Project Management</h2>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      Create Project
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-900 border-gray-700 max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-white">Create New Project</DialogTitle>
                    </DialogHeader>
                    
                    <ProjectUploaderFixed onSuccess={() => setIsCreateDialogOpen(false)} />
                  </DialogContent>
                </Dialog>
              </div>

              {/* Projects List with Drag & Drop */}
              <div className="space-y-3">
                {projects.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400 mb-4">No projects found</p>
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="gap-2">
                          <Plus className="w-4 h-4" />
                          Create Your First Project
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </div>
                ) : (
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext 
                      items={projectOrder.map(p => p.id)} 
                      strategy={verticalListSortingStrategy}
                    >
                      <div className={`grid gap-3 ${projects.length > 4 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                        {projectOrder.map((project) => (
                          <SortableProjectCard
                            key={project.id}
                            project={project}
                            onEdit={openEditDialog}
                            onDelete={(id) => deleteProjectMutation.mutate(id)}
                            isDeleting={deleteProjectMutation.isPending}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              {/* Edit Project Dialog */}
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-white">Edit Project</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                      <Input
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="bg-gray-800 border-gray-600 text-white"
                        placeholder="Project title"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Client</label>
                        <Input
                          value={editForm.client}
                          onChange={(e) => setEditForm({ ...editForm, client: e.target.value })}
                          className="bg-gray-800 border-gray-600 text-white"
                          placeholder="Client name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Agency</label>
                        <Input
                          value={editForm.agency}
                          onChange={(e) => setEditForm({ ...editForm, agency: e.target.value })}
                          className="bg-gray-800 border-gray-600 text-white"
                          placeholder="Agency name"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                      <Select value={editForm.category} onValueChange={(value) => setEditForm({ ...editForm, category: value })}>
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          <SelectItem value="commercial">Commercial</SelectItem>
                          <SelectItem value="narrative">Narrative</SelectItem>
                          <SelectItem value="documentary">Documentary</SelectItem>
                          <SelectItem value="music-video">Music Video</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                      <Textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="bg-gray-800 border-gray-600 text-white"
                        placeholder="Project description"
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsEditDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleEditSubmit}
                        disabled={updateProjectMutation.isPending}
                      >
                        {updateProjectMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Biography Tab */}
          {activeTab === 'biography' && (
            <BiographyEditor />
          )}

          {/* AI Assistant Tab */}
          {activeTab === 'ai-status' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">AI Assistant Status</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AIQuotaManager />
                <ContentGenerator />
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}