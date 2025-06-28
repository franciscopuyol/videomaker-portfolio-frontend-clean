import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, CheckCircle, Play, Pause, GripVertical, Save, Tags } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { AIStatusProvider } from '@/contexts/AIStatusContext';
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
import type { Project, Category, ContactSettings, InsertContactSettings } from '@shared/schema';
import ContentGenerator from '@/components/ContentGenerator';
import AIQuotaManager from '@/components/AIQuotaManager';
import BiographyEditor from '@/components/BiographyEditorFixed';
import ProjectUploaderFixed from '@/components/ProjectUploaderFixed';
import SortableProjectCard from '@/components/SortableProjectCard';
import AISuggestions from '@/components/AISuggestions';
import ThumbnailSelector from '@/components/ThumbnailSelector';
import Login from './Login';

interface CreateProjectForm {
  title: string;
  client: string;
  agency: string;
  category: string;
  description: string;
  role: string;
  tags: string;
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
  const [, setLocation] = useLocation();
  const { isAuthenticated, logout, user } = useAuth();
  
  // State
  const [activeTab, setActiveTab] = useState<'projects' | 'biography' | 'ai-status' | 'categories' | 'contact'>('projects');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [contactSettings, setContactSettings] = useState<{
    ctaText: string;
    destinationEmail: string;
    formEnabled: boolean;
  }>({
    ctaText: "Let's Chat.",
    destinationEmail: "franciscopuyol@gmail.com",
    formEnabled: true,
  });
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // Drag and drop state
  const [projectOrder, setProjectOrder] = useState<Project[]>([]);
  
  // Edit form state
  const [editForm, setEditForm] = useState<CreateProjectForm>({
    title: '',
    client: '',
    agency: '',
    category: '',
    description: '',
    role: '',
    tags: '',
    displayOrder: 0,
    thumbnailOption: 'auto'
  });
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch projects
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['/api/admin/projects'],
    retry: false,
  });

  // Fetch contact settings
  const { data: currentContactSettings, isLoading: isContactLoading } = useQuery<ContactSettings>({
    queryKey: ['/api/admin/contact/settings'],
    retry: false,
  });

  // Update local contact settings when data loads
  useEffect(() => {
    if (currentContactSettings) {
      setContactSettings({
        ctaText: currentContactSettings.ctaText,
        destinationEmail: currentContactSettings.destinationEmail,
        formEnabled: currentContactSettings.formEnabled,
      });
    }
  }, [currentContactSettings]);

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
      role: project.role || '',
      tags: project.tags || '',
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

  // Fetch categories for dynamic dropdown
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/admin/categories'],
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
          window.location.href = `${import.meta.env.VITE_API_URL}/api/login`;
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
          window.location.href = `${import.meta.env.VITE_API_URL}/api/login`;
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
        role: editForm.role || null,
        tags: editForm.tags || null,
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
          window.location.href = `${import.meta.env.VITE_API_URL}/api/login`;
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
          window.location.href = `${import.meta.env.VITE_API_URL}/api/login`;
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

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: { name: string; slug: string }) => {
      return apiRequest('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      setNewCategoryName('');
      setIsCategoryDialogOpen(false);
      toast({
        title: "Category created successfully",
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
          window.location.href = `${import.meta.env.VITE_API_URL}/api/login`;
        }, 500);
        return;
      }
      
      toast({
        title: "Failed to create category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Contact settings mutation
  const updateContactSettingsMutation = useMutation({
    mutationFn: async (settingsData: Omit<InsertContactSettings, 'updatedBy'>) => {
      return apiRequest('/api/admin/contact/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/contact/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contact/settings'] });
      toast({
        title: "Contact settings updated successfully",
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
          window.location.href = `${import.meta.env.VITE_API_URL}/api/login`;
        }, 500);
        return;
      }
      
      toast({
        title: "Failed to update contact settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle create category
  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    
    const slug = newCategoryName.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
    
    createCategoryMutation.mutate({
      name: newCategoryName.trim(),
      slug: slug
    });
  };

  // Handle contact settings update
  const handleContactSettingsUpdate = () => {
    updateContactSettingsMutation.mutate(contactSettings);
  };

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <Login />;
  }

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
    <AIStatusProvider>
      <div className="min-h-screen bg-black text-white admin-page" style={{ cursor: 'default' }}>
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header with Title and Back Button */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-white">Admin Panel</h1>
            <a 
              href="/" 
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md transition-colors text-sm font-medium"
            >
              Back to Site
            </a>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('projects')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'projects' 
                    ? 'text-red-500 border-b-2 border-red-500' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Project Management
              </button>
              <button
                onClick={() => setActiveTab('biography')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'biography' 
                    ? 'text-red-500 border-b-2 border-red-500' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                About Section
              </button>
              <button
                onClick={() => setActiveTab('ai-status')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'ai-status' 
                    ? 'text-red-500 border-b-2 border-red-500' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                AI Assistant
              </button>
              <button
                onClick={() => setActiveTab('contact')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'contact' 
                    ? 'text-red-500 border-b-2 border-red-500' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Contact Settings
              </button>
            </div>
          </div>

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-light text-white/90 tracking-wide">Project Management</h2>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 bg-red-600 hover:bg-red-700 text-white">
                      <Plus className="w-4 h-4" />
                      Create Project
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-900 border-gray-700 max-w-4xl max-h-[90vh] overflow-y-auto pointer-events-auto">
                    <DialogHeader>
                      <DialogTitle className="text-white">Create New Project</DialogTitle>
                    </DialogHeader>
                    
                    <div className="overflow-y-auto pr-2">
                      <ProjectUploaderFixed 
                        onSuccess={() => setIsCreateDialogOpen(false)} 
                        categories={categories}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Projects List with Drag & Drop */}
              <div className="min-h-[400px]">
                {projects.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed border-gray-700 rounded-lg">
                    <p className="text-gray-400 mb-4">No projects found</p>
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="gap-2 bg-red-600 hover:bg-red-700">
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
                      <div className="flex flex-col gap-3">
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
                      <div className="flex gap-2">
                        <Select value={editForm.category} onValueChange={(value) => setEditForm({ ...editForm, category: value })}>
                          <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-600">
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.slug}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsCategoryDialogOpen(true)}
                          className="px-3"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
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

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                        <Input
                          value={editForm.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          className="bg-gray-800 border-gray-600 text-white"
                          placeholder="e.g., Editing, Motion, Color"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Tags</label>
                        <Input
                          value={editForm.tags}
                          onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                          className="bg-gray-800 border-gray-600 text-white"
                          placeholder="e.g., commercial, animation"
                        />
                      </div>
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

              {/* Add New Category Dialog */}
              <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogContent className="bg-gray-900 border-gray-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">Add New Category</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Category Name</label>
                      <Input
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="bg-gray-800 border-gray-600 text-white"
                        placeholder="Enter category name"
                        onKeyPress={(e) => e.key === 'Enter' && handleCreateCategory()}
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsCategoryDialogOpen(false);
                          setNewCategoryName('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateCategory}
                        disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                      >
                        {createCategoryMutation.isPending ? 'Creating...' : 'Create Category'}
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
              <h2 className="text-2xl font-light text-white/90 tracking-wide">AI Assistant Status</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AIQuotaManager />
                <ContentGenerator />
              </div>
            </div>
          )}

          {/* Contact Settings Tab */}
          {activeTab === 'contact' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-light text-white/90 tracking-wide">Contact Settings</h2>
              
              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Contact Form Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isContactLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
                      <p className="text-gray-400">Loading contact settings...</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">
                          Contact Page Header Text
                        </label>
                        <Input
                          value={contactSettings.ctaText}
                          onChange={(e) => setContactSettings(prev => ({ ...prev, ctaText: e.target.value }))}
                          placeholder="Enter header text"
                          className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-500 focus:border-red-500"
                        />
                        <p className="text-xs text-gray-500">
                          This text appears as the main header on the contact page
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">
                          Destination Email
                        </label>
                        <Input
                          type="email"
                          value={contactSettings.destinationEmail}
                          onChange={(e) => setContactSettings(prev => ({ ...prev, destinationEmail: e.target.value }))}
                          placeholder="email@example.com"
                          className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-500 focus:border-red-500"
                        />
                        <p className="text-xs text-gray-500">
                          Contact form submissions will be sent to this email address
                        </p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="form-enabled"
                          checked={contactSettings.formEnabled}
                          onChange={(e) => setContactSettings(prev => ({ ...prev, formEnabled: e.target.checked }))}
                          className="w-4 h-4 text-red-600 bg-gray-800 border-gray-600 rounded focus:ring-red-500"
                        />
                        <label htmlFor="form-enabled" className="text-sm font-medium text-gray-300">
                          Enable Contact Form
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 ml-7">
                        When disabled, the form will be hidden and users will see contact information only
                      </p>

                      <div className="pt-4">
                        <Button
                          onClick={handleContactSettingsUpdate}
                          disabled={updateContactSettingsMutation.isPending}
                          className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 transition-colors"
                        >
                          {updateContactSettingsMutation.isPending ? (
                            <>
                              <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save Settings
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                        <h4 className="text-sm font-medium text-white mb-2">Preview</h4>
                        <div className="text-sm text-gray-300">
                          <p><strong>Header:</strong> {contactSettings.ctaText}</p>
                          <p><strong>Email:</strong> {contactSettings.destinationEmail}</p>
                          <p><strong>Form Status:</strong> {contactSettings.formEnabled ? 'Enabled' : 'Disabled'}</p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      </div>

      {/* Admin Panel Navigation and Logout */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 flex gap-2">
        <Button
          onClick={logout}
          variant="outline"
          size="sm"
          className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
          style={{ cursor: 'pointer' }}
        >
          Logout
        </Button>
      </div>
    </div>
    </AIStatusProvider>
  );
}