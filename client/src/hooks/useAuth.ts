import { useState, useEffect, useCallback } from 'react';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = useCallback(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // Check if token is expired
        if (payload.exp * 1000 > Date.now()) {
          setUser(payload);
          return true;
        } else {
          localStorage.removeItem('authToken');
          setUser(null);
          return false;
        }
      } catch (error) {
        localStorage.removeItem('authToken');
        setUser(null);
        return false;
      }
    }
    setUser(null);
    return false;
  }, []);

  useEffect(() => {
    checkAuthStatus();
    setIsLoading(false);
  }, [checkAuthStatus]);

  const login = (token: string, userData: any) => {
    localStorage.setItem('authToken', token);
    setUser(userData);
    // Force re-check to ensure state is properly updated
    setTimeout(() => checkAuthStatus(), 100);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login,
    logout,
    checkAuthStatus,
  };
}