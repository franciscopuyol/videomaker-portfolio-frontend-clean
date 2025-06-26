import { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

interface AIStatus {
  status: string;
  available: boolean;
  models: number;
  message: string;
}

interface AIStatusContextType {
  aiStatus: AIStatus | undefined;
  isLoading: boolean;
  isAvailable: boolean;
  refetch: () => void;
}

const AIStatusContext = createContext<AIStatusContextType | undefined>(undefined);

export function AIStatusProvider({ children }: { children: ReactNode }) {
  const { data: aiStatus, isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/ai/status'],
    refetchInterval: 30000,
    retry: false
  });

  const isAvailable = aiStatus?.available === true;

  return (
    <AIStatusContext.Provider value={{
      aiStatus,
      isLoading,
      isAvailable,
      refetch
    }}>
      {children}
    </AIStatusContext.Provider>
  );
}

export function useAIStatus() {
  const context = useContext(AIStatusContext);
  if (context === undefined) {
    throw new Error('useAIStatus must be used within an AIStatusProvider');
  }
  return context;
}