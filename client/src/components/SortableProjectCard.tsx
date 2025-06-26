import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Edit2, Trash2, GripVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Project } from '@shared/schema';

interface SortableProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

export default function SortableProjectCard({ 
  project, 
  onEdit, 
  onDelete, 
  isDeleting 
}: SortableProjectCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className={`bg-gray-800 border-gray-700 transition-all duration-200 hover:shadow-md w-full ${
        isDragging ? 'opacity-50 shadow-xl scale-[0.98]' : 'hover:border-gray-600'
      }`}
    >
      <CardHeader className="pb-2 px-4 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="cursor-grab hover:cursor-grabbing text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700 transition-colors"
              {...attributes}
              {...listeners}
              title="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </div>
            <CardTitle className="text-white text-base font-medium truncate">{project.title}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant={project.status === 'published' ? 'default' : 'secondary'} className="text-xs px-2 py-0.5">
              {project.status}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(project);
              }}
              className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 p-1 h-7 w-7"
              title="Edit project"
            >
              <Edit2 className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(project.id);
              }}
              disabled={isDeleting}
              className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-1 h-7 w-7"
              title="Delete project"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-4 pb-3">
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
          <div className="truncate">
            <span className="text-gray-500">Client:</span> {project.client || 'N/A'}
          </div>
          <div className="truncate">
            <span className="text-gray-500">Agency:</span> {project.agency || 'N/A'}
          </div>
          <div className="truncate">
            <span className="text-gray-500">Category:</span> {project.category || 'N/A'}
          </div>
          <div>
            <span className="text-gray-500">Order:</span> {project.displayOrder || 0}
          </div>
        </div>
        {project.description && (
          <p className="text-gray-400 mt-2 text-xs line-clamp-2">{project.description}</p>
        )}
        {project.videoUrl && (
          <div className="mt-2">
            <span className="text-xs text-green-400">✓ Video uploaded</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}