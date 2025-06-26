import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, RefreshCw, Languages, Search, FileText, AlertTriangle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAIStatus } from '@/contexts/AIStatusContext';

interface ContentSuggestions {
  title: string;
  description: string;
  category: string;
  tags: string[];
  seoDescription: string;
}

interface ContentGeneratorProps {
  filename?: string;
  currentTitle?: string;
  currentDescription?: string;
  currentCategory?: string;
  onApplySuggestions?: (suggestions: ContentSuggestions) => void;
}

export default function ContentGenerator({
  filename,
  currentTitle,
  currentDescription,
  currentCategory,
  onApplySuggestions
}: ContentGeneratorProps) {
  const [suggestions, setSuggestions] = useState<ContentSuggestions | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'es' | 'fr'>('es');
  const [useGPT4, setUseGPT4] = useState(false);
  const [showGPT4Warning, setShowGPT4Warning] = useState(false);
  const [tokenUsage, setTokenUsage] = useState(0);
  const { toast } = useToast();
  const { isAvailable, isLoading: aiStatusLoading } = useAIStatus();

  // Load model preference from localStorage
  useEffect(() => {
    const savedModel = localStorage.getItem('ai-model-preference');
    if (savedModel === 'gpt-4') {
      setUseGPT4(true);
    }
  }, []);

  // Save model preference to localStorage
  const handleModelChange = (checked: boolean) => {
    if (checked) {
      setShowGPT4Warning(true);
    } else {
      setUseGPT4(false);
      localStorage.setItem('ai-model-preference', 'gpt-3.5-turbo');
    }
  };

  const confirmGPT4Usage = () => {
    setUseGPT4(true);
    setShowGPT4Warning(false);
    localStorage.setItem('ai-model-preference', 'gpt-4');
  };

  const cancelGPT4Usage = () => {
    setShowGPT4Warning(false);
  };

  const generateContentMutation = useMutation({
    mutationFn: async (data: { filename: string; existingTitle?: string; existingDescription?: string }) => {
      const payload = {
        ...data,
        model: useGPT4 ? 'gpt-4' : 'gpt-3.5-turbo'
      };
      return await apiRequest('/api/admin/generate-content', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (data: any) => {
      setSuggestions(data.suggestions || data);
      if (data.tokenUsage && useGPT4) {
        setTokenUsage(prev => prev + data.tokenUsage);
      }
      toast({
        title: "Content Generated",
        description: "AI-powered content suggestions are ready for review.",
      });
    },
    onError: (error: any) => {
      let title = "Generation Failed";
      let description = "Failed to generate content";
      
      if (error?.message?.includes('quota exceeded')) {
        title = "OpenAI Quota Exceeded";
        description = "Please add credits to your OpenAI account at platform.openai.com/account/billing";
      } else if (error instanceof Error) {
        description = error.message;
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    }
  });

  const improveContentMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; category: string }) => {
      return await apiRequest('/api/admin/improve-content', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (data: ContentSuggestions) => {
      setSuggestions(data);
      toast({
        title: "Content Improved",
        description: "Enhanced content suggestions are ready for review.",
      });
    },
    onError: (error: any) => {
      let title = "Improvement Failed";
      let description = "Failed to improve content";
      
      if (error?.message?.includes('quota exceeded')) {
        title = "OpenAI Quota Exceeded";
        description = "Please add credits to your OpenAI account at platform.openai.com/account/billing";
      } else if (error instanceof Error) {
        description = error.message;
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    }
  });

  const autoDescriptionMutation = useMutation({
    mutationFn: async (data: { title: string; client?: string }) => {
      return await apiRequest('/api/admin/auto-description', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (data: { description: string }) => {
      if (onApplySuggestions) {
        onApplySuggestions({
          title: currentTitle || '',
          description: data.description,
          category: currentCategory || '',
          tags: [],
          seoDescription: data.description.substring(0, 155)
        });
      }
      toast({
        title: "Description Generated",
        description: "Auto-generated description applied to your project.",
      });
    },
    onError: (error: any) => {
      let title = "Generation Failed";
      let description = "Failed to generate description";
      
      if (error?.message?.includes('quota exceeded')) {
        title = "OpenAI Quota Exceeded";
        description = "Please add credits to your OpenAI account at platform.openai.com/account/billing";
      } else if (error instanceof Error) {
        description = error.message;
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    }
  });

  const translateMutation = useMutation({
    mutationFn: async (data: { text: string; targetLanguage: 'en' | 'es' | 'fr' }) => {
      return await apiRequest('/api/admin/translate', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (data: { translatedText: string }) => {
      if (onApplySuggestions) {
        onApplySuggestions({
          title: currentTitle || '',
          description: data.translatedText,
          category: currentCategory || '',
          tags: [],
          seoDescription: data.translatedText.substring(0, 155)
        });
      }
      toast({
        title: "Translation Complete",
        description: "Translated content applied to your project.",
      });
    },
    onError: (error: any) => {
      let title = "Translation Failed";
      let description = "Failed to translate content";
      
      if (error?.message?.includes('quota exceeded')) {
        title = "OpenAI Quota Exceeded";
        description = "Please add credits to your OpenAI account at platform.openai.com/account/billing";
      } else if (error instanceof Error) {
        description = error.message;
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    }
  });

  const seoBoostMutation = useMutation({
    mutationFn: async (data: { title: string; description: string }) => {
      return await apiRequest('/api/admin/seo-boost', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (data: { seoTitle: string; tags: string[]; metaDescription: string }) => {
      if (onApplySuggestions) {
        onApplySuggestions({
          title: data.seoTitle,
          description: currentDescription || '',
          category: currentCategory || '',
          tags: data.tags,
          seoDescription: data.metaDescription
        });
      }
      toast({
        title: "SEO Optimized",
        description: "SEO-enhanced content applied to your project.",
      });
    },
    onError: (error: any) => {
      let title = "SEO Boost Failed";
      let description = "Failed to optimize for SEO";
      
      if (error?.message?.includes('quota exceeded')) {
        title = "OpenAI Quota Exceeded";
        description = "Please add credits to your OpenAI account at platform.openai.com/account/billing";
      } else if (error instanceof Error) {
        description = error.message;
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    }
  });

  const handleGenerateContent = () => {
    if (!filename) {
      toast({
        title: "No Filename",
        description: "Please upload a video file first.",
        variant: "destructive",
      });
      return;
    }

    generateContentMutation.mutate({
      filename,
      existingTitle: currentTitle,
      existingDescription: currentDescription
    });
  };

  const handleImproveContent = () => {
    if (!currentTitle || !currentDescription || !currentCategory) {
      toast({
        title: "Missing Content",
        description: "Please fill in title, description, and category first.",
        variant: "destructive",
      });
      return;
    }

    improveContentMutation.mutate({
      title: currentTitle,
      description: currentDescription,
      category: currentCategory
    });
  };

  const handleApplySuggestions = () => {
    if (suggestions && onApplySuggestions) {
      onApplySuggestions(suggestions);
      toast({
        title: "Content Applied",
        description: "AI suggestions have been applied to your project.",
      });
    }
  };

  const handleAutoDescription = () => {
    if (!currentTitle) {
      toast({
        title: "No Title",
        description: "Please enter a project title first.",
        variant: "destructive",
      });
      return;
    }

    autoDescriptionMutation.mutate({
      title: currentTitle,
      client: ''
    });
  };

  const handleTranslate = () => {
    if (!currentDescription) {
      toast({
        title: "No Description",
        description: "Please enter a description to translate.",
        variant: "destructive",
      });
      return;
    }

    translateMutation.mutate({
      text: currentDescription,
      targetLanguage: selectedLanguage
    });
  };

  const handleSEOBoost = () => {
    if (!currentTitle || !currentDescription) {
      toast({
        title: "Missing Content",
        description: "Please fill in both title and description for SEO optimization.",
        variant: "destructive",
      });
      return;
    }

    seoBoostMutation.mutate({
      title: currentTitle,
      description: currentDescription
    });
  };

  const isLoading = generateContentMutation.isPending || improveContentMutation.isPending || 
                   autoDescriptionMutation.isPending || translateMutation.isPending || 
                   seoBoostMutation.isPending;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          AI Content Assistant
        </CardTitle>
        <CardDescription>
          Generate compelling titles, descriptions, and categories using ChatGPT
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Model Selection */}
        <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="gpt4-toggle"
                checked={useGPT4}
                onCheckedChange={handleModelChange}
              />
              <Label htmlFor="gpt4-toggle" className="text-sm font-medium">
                Use GPT-4 (may use paid credits)
              </Label>
            </div>
            <Badge variant={useGPT4 ? "destructive" : "secondary"}>
              Currently using: {useGPT4 ? "GPT-4" : "GPT-3.5"}
            </Badge>
          </div>
          
          {useGPT4 && tokenUsage > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              GPT-4 tokens used this session: {tokenUsage}
            </div>
          )}
        </div>

        {/* GPT-4 Warning Dialog */}
        {showGPT4Warning && (
          <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <p>⚠️ You are using GPT-4. This may consume OpenAI paid credits.</p>
                <div className="flex space-x-2">
                  <Button size="sm" onClick={confirmGPT4Usage}>
                    Continue with GPT-4
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelGPT4Usage}>
                    Use GPT-3.5 instead
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Primary Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={handleGenerateContent}
            disabled={!filename || isLoading || !isAvailable || aiStatusLoading}
            variant="default"
          >
            {generateContentMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Generate Content
          </Button>
          
          <Button 
            onClick={handleImproveContent}
            disabled={!currentTitle || !currentDescription || !currentCategory || isLoading || !isAvailable || aiStatusLoading}
            variant="outline"
          >
            {improveContentMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Improve Existing
          </Button>
        </div>

        {/* Advanced Features */}
        <div className="space-y-3 border-t pt-4">
          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={handleAutoDescription}
              disabled={!currentTitle || isLoading || !isAvailable || aiStatusLoading}
              variant="secondary"
              size="sm"
            >
              {autoDescriptionMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Auto Description
            </Button>
            
            <Button 
              onClick={handleSEOBoost}
              disabled={!currentTitle || !currentDescription || isLoading || !isAvailable || aiStatusLoading}
              variant="secondary"
              size="sm"
            >
              {seoBoostMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              SEO Boost
            </Button>
          </div>

          <div className="flex gap-2 items-center">
            <Select value={selectedLanguage} onValueChange={(value: 'en' | 'es' | 'fr') => setSelectedLanguage(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              onClick={handleTranslate}
              disabled={!currentDescription || isLoading || !isAvailable || aiStatusLoading}
              variant="secondary"
              size="sm"
              className="flex-1"
            >
              {translateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Languages className="h-4 w-4 mr-2" />
              )}
              Translate
            </Button>
          </div>
        </div>

        {suggestions && (
          <div className="space-y-4 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-purple-900 dark:text-purple-100">AI Suggestions</h4>
              <Button 
                onClick={handleApplySuggestions}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
              >
                Apply All
              </Button>
            </div>
            
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-purple-800 dark:text-purple-200">
                  Title
                </Label>
                <Input 
                  value={suggestions.title} 
                  readOnly 
                  className="bg-white dark:bg-gray-800 mt-1"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium text-purple-800 dark:text-purple-200">
                  Category
                </Label>
                <Input 
                  value={suggestions.category} 
                  readOnly 
                  className="bg-white dark:bg-gray-800 mt-1"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium text-purple-800 dark:text-purple-200">
                  Description
                </Label>
                <Textarea 
                  value={suggestions.description} 
                  readOnly 
                  rows={4}
                  className="bg-white dark:bg-gray-800 mt-1"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium text-purple-800 dark:text-purple-200">
                  SEO Description
                </Label>
                <Textarea 
                  value={suggestions.seoDescription} 
                  readOnly 
                  rows={2}
                  className="bg-white dark:bg-gray-800 mt-1"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium text-purple-800 dark:text-purple-200">
                  Tags
                </Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {suggestions.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}