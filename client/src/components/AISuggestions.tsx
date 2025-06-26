import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAIStatus } from '@/contexts/AIStatusContext';

interface AISuggestionsProps {
  title: string;
  category?: string;
  client?: string;
  year?: number;
  description?: string;
  onDescriptionSelect: (description: string) => void;
  onRoleSelect: (roles: string[]) => void;
  onTagSelect: (tags: string[]) => void;
}

interface ProjectSuggestion {
  description: string;
  roles: string[];
  tags: string[];
  category: string;
}

export default function AISuggestions({
  title,
  category,
  client,
  year,
  description,
  onDescriptionSelect,
  onRoleSelect,
  onTagSelect
}: AISuggestionsProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<ProjectSuggestion | null>(null);
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});
  const { isAvailable, isLoading: aiStatusLoading } = useAIStatus();

  const generateFullSuggestions = async () => {
    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a project title first.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiRequest('/api/admin/ai/project-suggestions', {
        method: 'POST',
        body: JSON.stringify({
          title,
          category,
          client,
          year
        }),
      });

      setSuggestions(response);
      toast({
        title: "AI Suggestions Generated",
        description: "Review and select the suggestions you'd like to use.",
      });
    } catch (error) {
      console.error('AI suggestions error:', error);
      toast({
        title: "Generation Failed",
        description: "Unable to generate AI suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateDescriptionOnly = async () => {
    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a project title first.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiRequest('/api/admin/ai/description-suggestion', {
        method: 'POST',
        body: JSON.stringify({
          title,
          category,
          client
        }),
      });

      onDescriptionSelect(response.description);
      toast({
        title: "Description Generated",
        description: "AI description has been applied to your project.",
      });
    } catch (error) {
      console.error('Description generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Unable to generate description. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateRoles = async () => {
    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a project title first.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiRequest('/api/admin/ai/role-suggestions', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          category
        }),
      });

      onRoleSelect(response.roles);
      toast({
        title: "Roles Generated",
        description: "AI role suggestions have been applied.",
      });
    } catch (error) {
      console.error('Role generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Unable to generate roles. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateTags = async () => {
    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a project title first.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiRequest('/api/admin/ai/tag-suggestions', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          category
        }),
      });

      onTagSelect(response.tags);
      toast({
        title: "Tags Generated",
        description: "AI tag suggestions have been applied.",
      });
    } catch (error) {
      console.error('Tag generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Unable to generate tags. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          AI Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={generateFullSuggestions}
            disabled={isGenerating || !title.trim() || !isAvailable || aiStatusLoading}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate All
          </Button>

          <Button
            onClick={generateDescriptionOnly}
            disabled={isGenerating || !title.trim() || !isAvailable || aiStatusLoading}
            variant="outline"
            size="sm"
          >
            Description Only
          </Button>

          <Button
            onClick={generateRoles}
            disabled={isGenerating || !title.trim() || !isAvailable || aiStatusLoading}
            variant="outline"
            size="sm"
          >
            Roles Only
          </Button>

          <Button
            onClick={generateTags}
            disabled={isGenerating || !title.trim() || !isAvailable || aiStatusLoading}
            variant="outline"
            size="sm"
          >
            Tags Only
          </Button>
        </div>

        {/* Generated Suggestions Display */}
        {suggestions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 border-t pt-4"
          >
            {/* Description Suggestion */}
            {suggestions.description && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Suggested Description</label>
                  <div className="flex gap-1">
                    <Button
                      onClick={() => copyToClipboard(suggestions.description, 'description')}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      {copiedStates.description ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      onClick={() => onDescriptionSelect(suggestions.description)}
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                    >
                      Use This
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={suggestions.description}
                  readOnly
                  className="text-sm bg-gray-50 dark:bg-gray-800"
                  rows={3}
                />
              </div>
            )}

            {/* Role Suggestions */}
            {suggestions.roles && suggestions.roles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Suggested Roles</label>
                  <Button
                    onClick={() => onRoleSelect(suggestions.roles)}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                  >
                    Use These
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {suggestions.roles.map((role, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Tag Suggestions */}
            {suggestions.tags && suggestions.tags.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Suggested Tags</label>
                  <Button
                    onClick={() => onTagSelect(suggestions.tags)}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                  >
                    Use These
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {suggestions.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Category Suggestion */}
            {suggestions.category && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Suggested Category</label>
                <Badge variant="default" className="text-xs">
                  {suggestions.category}
                </Badge>
              </div>
            )}
          </motion.div>
        )}

        {/* AI Attribution */}
        <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t">
          AI-powered suggestions via OpenAI
        </div>
      </CardContent>
    </Card>
  );
}