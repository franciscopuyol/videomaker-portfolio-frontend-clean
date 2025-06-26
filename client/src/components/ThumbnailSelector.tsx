import { useState } from 'react';
import { motion } from 'framer-motion';
import { Image, Loader2, Upload, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ThumbnailSelectorProps {
  videoUrl?: string;
  onThumbnailSelect: (thumbnailUrl: string) => void;
  currentThumbnail?: string;
}

export default function ThumbnailSelector({ 
  videoUrl, 
  onThumbnailSelect, 
  currentThumbnail 
}: ThumbnailSelectorProps) {
  const { toast } = useToast();
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedThumbnails, setExtractedThumbnails] = useState<string[]>([]);
  const [selectedThumbnail, setSelectedThumbnail] = useState<string>(currentThumbnail || '');
  const [customFile, setCustomFile] = useState<File | null>(null);

  const extractThumbnails = async () => {
    if (!videoUrl) {
      toast({
        title: "No Video",
        description: "Please upload a video first to extract thumbnails.",
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);
    try {
      const response = await apiRequest('/api/admin/extract-thumbnails', {
        method: 'POST',
        body: JSON.stringify({ videoUrl }),
      });

      setExtractedThumbnails(response.thumbnails || []);
      toast({
        title: "Thumbnails Extracted",
        description: "Select one of the generated thumbnails or upload your own.",
      });
    } catch (error) {
      console.error('Thumbnail extraction error:', error);
      toast({
        title: "Extraction Failed",
        description: "Unable to extract thumbnails from video. Please try uploading a custom thumbnail.",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleThumbnailSelect = (thumbnailUrl: string) => {
    setSelectedThumbnail(thumbnailUrl);
    onThumbnailSelect(thumbnailUrl);
    toast({
      title: "Thumbnail Selected",
      description: "Thumbnail has been applied to your project.",
    });
  };

  const handleCustomUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setCustomFile(file);
        const previewUrl = URL.createObjectURL(file);
        setSelectedThumbnail(previewUrl);
        onThumbnailSelect(previewUrl);
        toast({
          title: "Custom Thumbnail",
          description: "Custom thumbnail will be uploaded with the project.",
        });
      } else {
        toast({
          title: "Invalid File",
          description: "Please select an image file.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5 text-blue-500" />
          Thumbnail Options
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={extractThumbnails}
            disabled={isExtracting || !videoUrl}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {isExtracting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Image className="h-4 w-4" />
            )}
            Extract from Video
          </Button>

          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => document.getElementById('thumbnail-upload')?.click()}
            >
              <Upload className="h-4 w-4" />
              Upload Custom
            </Button>
            <Input
              id="thumbnail-upload"
              type="file"
              accept="image/*"
              onChange={handleCustomUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Current Thumbnail */}
        {selectedThumbnail && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Thumbnail</label>
            <div className="relative w-32 h-18 border rounded overflow-hidden">
              <img 
                src={selectedThumbnail} 
                alt="Current thumbnail"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-1 right-1">
                <Check className="h-4 w-4 text-green-500 bg-white rounded-full p-0.5" />
              </div>
            </div>
          </div>
        )}

        {/* Extracted Thumbnails */}
        {extractedThumbnails.length > 0 && (
          <div className="space-y-3">
            <label className="text-sm font-medium">Generated Options</label>
            <div className="grid grid-cols-3 gap-2">
              {extractedThumbnails.map((thumbnail, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleThumbnailSelect(thumbnail)}
                  className={`relative aspect-video border-2 rounded overflow-hidden transition-all hover:border-blue-500 ${
                    selectedThumbnail === thumbnail 
                      ? 'border-blue-500 ring-2 ring-blue-200' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <img 
                    src={thumbnail} 
                    alt={`Thumbnail option ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {selectedThumbnail === thumbnail && (
                    <div className="absolute top-1 right-1">
                      <Check className="h-4 w-4 text-green-500 bg-white rounded-full p-0.5" />
                    </div>
                  )}
                  <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-xs px-1 rounded">
                    {index === 0 ? '10%' : index === 1 ? '50%' : '80%'}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {!videoUrl 
            ? "Upload a video first to extract thumbnails automatically"
            : "Extract thumbnails from your video at different timestamps or upload a custom image"
          }
        </div>
      </CardContent>
    </Card>
  );
}