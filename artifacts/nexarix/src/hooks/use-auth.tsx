import React, { createContext, useContext, useEffect, useState } from "react";
import { User, useGetMe, setAuthTokenGetter } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  isAdmin: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("nexarix_token"));
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("nexarix_token"));
  }, []);

  const { data: meData, isLoading: isMeLoading } = useGetMe({
    query: {
      queryKey: ["me"],
      enabled: !!token,
      retry: false,
    },
  });

  useEffect(() => {
    if (meData) {
      setUser(meData);
    }
  }, [meData]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("nexarix_token", newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("nexarix_token");
    setToken(null);
    setUser(null);
  };

  const isLoading = token ? isMeLoading : false;

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, isAdmin: user?.isAdmin ?? false }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
