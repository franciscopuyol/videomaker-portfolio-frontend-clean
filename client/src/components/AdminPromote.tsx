import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';

export default function AdminPromote() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [isPromoting, setIsPromoting] = useState(false);

  const promoteToAdmin = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/auth/promote-admin', {
        method: 'POST',
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setIsPromoting(false);
    },
    onError: (error) => {
      console.error('Failed to promote to admin:', error);
      setIsPromoting(false);
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="admin-page min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Admin Access</h1>
          <p className="text-white/70 mb-6">Please log in to access admin features</p>
          <a 
            href="/api/login"
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Log In
          </a>
        </div>
      </div>
    );
  }

  const isAdmin = (user as any)?.role === 'admin';

  return (
    <div className="admin-page min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold mb-4">Admin Access</h1>
        
        {isAdmin ? (
          <div>
            <p className="text-green-400 mb-6">✓ You have admin access</p>
            <a 
              href="/admin"
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Go to Admin Panel
            </a>
          </div>
        ) : (
          <div>
            <p className="text-white/70 mb-4">Welcome, {(user as any)?.firstName || (user as any)?.email}</p>
            <p className="text-white/60 mb-6">Click below to grant yourself admin access</p>
            <button
              onClick={() => {
                setIsPromoting(true);
                promoteToAdmin.mutate();
              }}
              disabled={isPromoting}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white px-6 py-3 rounded-lg transition-colors"
            >
              {isPromoting ? 'Granting Access...' : 'Grant Admin Access'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}