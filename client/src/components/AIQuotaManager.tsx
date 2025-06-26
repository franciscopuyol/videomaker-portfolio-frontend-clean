import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, CreditCard, ExternalLink, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AIQuotaManagerProps {
  onApiKeyUpdate?: () => void;
}

export default function AIQuotaManager({ onApiKeyUpdate }: AIQuotaManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newApiKey, setNewApiKey] = useState("");

  // Fetch AI status
  const { data: aiStatus, isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/ai/status'],
    refetchInterval: 10000, // Refresh every 10 seconds
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  const handleUpdateApiKey = async () => {
    if (!newApiKey.startsWith('sk-')) {
      toast({
        title: "Invalid API Key",
        description: "OpenAI API keys must start with 'sk-'",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/admin/update-openai-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: newApiKey }),
      });

      if (response.ok) {
        toast({
          title: "API Key Updated",
          description: "OpenAI API key has been updated successfully",
        });
        setIsDialogOpen(false);
        setNewApiKey("");
        onApiKeyUpdate?.();
        // Refresh AI status after key update
        refetch();
        queryClient.invalidateQueries({ queryKey: ['/api/admin/ai/status'] });
      } else {
        throw new Error('Failed to update API key');
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update API key. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRefreshStatus = () => {
    refetch();
    toast({
      title: "Refreshing",
      description: "Checking AI Assistant status...",
    });
  };

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Settings className="w-5 h-5" />
          AI Assistant Status
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshStatus}
            disabled={isLoading}
            className="ml-auto"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Alert>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Checking AI Assistant status...
            </AlertDescription>
          </Alert>
        ) : aiStatus?.available ? (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              AI Assistant is operational. All features available. ({aiStatus.models} models accessible)
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {aiStatus?.message || 'AI Assistant is currently unavailable. Please check your API key.'}
            </AlertDescription>
          </Alert>
        )}

        {!aiStatus?.available && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-300">To restore AI features:</h4>
            
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>Visit OpenAI Platform</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://platform.openai.com/account/billing', '_blank')}
                className="ml-auto gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Open Billing
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>Add credits to your account</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://platform.openai.com/account/billing/overview', '_blank')}
                className="ml-auto gap-1"
              >
                <CreditCard className="w-3 h-3" />
                Add Credits
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>Update API key if needed</span>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="ml-auto">
                    Update Key
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-gray-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">Update OpenAI API Key</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-300 mb-2 block">
                        New OpenAI API Key
                      </label>
                      <Input
                        type="password"
                        placeholder="sk-..."
                        value={newApiKey}
                        onChange={(e) => setNewApiKey(e.target.value)}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleUpdateApiKey} className="flex-1">
                        Update API Key
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
        )}

        <Alert>
          <AlertDescription className="text-xs">
            AI features include: Content generation, auto-descriptions, translations, SEO optimization, and content enhancement.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}