import { useState, useEffect, useCallback } from 'react';

/** Chave única usada em localStorage para guardar o JWT */
const ACCESS_TOKEN_KEY = 'authToken';

export function useAuth() {
  const [user, setUser]   = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /** Verifica se há token válido no localStorage e preenche o estado. */
  const checkAuthStatus = useCallback(() => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Token ainda é válido?
      if (payload.exp * 1_000 > Date.now()) {
        setUser(payload);           // ← mantém usuário no estado
        return true;
      }
    } catch {
      /* token mal-formado: vai cair no return false logo abaixo */
    }
    // Se chegou aqui, algo deu errado: força logout
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    setUser(null);
    return false;
  }, []);

  /** Grava token + dados do usuário e dispara nova verificação. */
  const login = (token: string, userData: any) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    setUser(userData);
    // Depois de gravar, força sincronizar estado (útil p/ abas diferentes)
    setTimeout(() => checkAuthStatus(), 100);
  };

  /** Remove tudo e limpa estado. */
  const logout = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    setUser(null);
  };

  /* Executa uma única vez ao montar o componente/SPA */
  useEffect(() => {
    checkAuthStatus();
    setIsLoading(false);
  }, [checkAuthStatus]);

  return { user, isLoading, login, logout, checkAuthStatus };
}