import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GripVertical, Save } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Project } from '@shared/schema';

interface ProjectReorderProps {
  projects: Project[];
}

export default function ProjectReorder({ projects }: ProjectReorderProps) {
  const [reorderedProjects, setReorderedProjects] = useState(projects);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveOrderMutation = useMutation({
    mutationFn: async (orderedProjects: Project[]) => {
      const updates = orderedProjects.map((project, index) => ({
        id: project.id,
        displayOrder: index
      }));
      
      return await apiRequest('/api/admin/projects/reorder', {
        method: 'POST',
        body: JSON.stringify({ updates }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Order Saved",
        description: "Project order has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Failed to save project order. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setIsDragging(true);
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newProjects = [...reorderedProjects];
    const draggedProject = newProjects[draggedIndex];
    
    // Remove from original position
    newProjects.splice(draggedIndex, 1);
    
    // Insert at new position
    newProjects.splice(index, 0, draggedProject);
    
    setReorderedProjects(newProjects);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedIndex(null);
  };

  const handleSaveOrder = () => {
    saveOrderMutation.mutate(reorderedProjects);
  };

  const hasChanges = JSON.stringify(projects.map(p => p.id)) !== JSON.stringify(reorderedProjects.map(p => p.id));

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GripVertical className="h-5 w-5" />
            Reorder Projects
          </CardTitle>
          {hasChanges && (
            <Button 
              onClick={handleSaveOrder}
              disabled={saveOrderMutation.isPending}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Order
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {reorderedProjects.map((project, index) => (
            <div
              key={project.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragEnd={handleDragEnd}
              className={`
                flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-move
                transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700
                ${isDragging && draggedIndex === index ? 'opacity-50' : ''}
                ${isDragging ? 'select-none' : ''}
              `}
            >
              <GripVertical className="h-4 w-4 text-gray-400" />
              <div className="flex-1">
                <div className="font-medium text-sm">{project.title}</div>
                <div className="text-xs text-gray-500">
                  {project.client && `${project.client} • `}
                  {project.category}
                </div>
              </div>
              <div className="text-xs text-gray-400">
                Order: {index + 1}
              </div>
            </div>
          ))}
        </div>
        
        {reorderedProjects.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No projects available to reorder
          </div>
        )}
      </CardContent>
    </Card>
  );
}