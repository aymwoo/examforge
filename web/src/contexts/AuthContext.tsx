import React, { createContext, useContext, useState } from "react";
import { AxiosRequestConfig } from "axios";

interface PendingRequest {
  config: AxiosRequestConfig;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

interface AuthContextType {
  showGlobalLogin: boolean;
  setShowGlobalLogin: (show: boolean) => void;
  addPendingRequest: (request: PendingRequest) => void;
  retryPendingRequests: () => void;
  clearPendingRequests: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [showGlobalLogin, setShowGlobalLogin] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);

  const addPendingRequest = (request: PendingRequest) => {
    setPendingRequests((prev) => [...prev, request]);
  };

  const retryPendingRequests = async () => {
    const { default: api } = await import("../services/api");

    for (const request of pendingRequests) {
      try {
        const response = await api.request(request.config);
        request.resolve(response);
      } catch (error) {
        request.reject(error);
      }
    }

    setPendingRequests([]);
  };

  const clearPendingRequests = () => {
    pendingRequests.forEach((request) => {
      request.reject(new Error("Login cancelled"));
    });
    setPendingRequests([]);
  };

  return (
    <AuthContext.Provider
      value={{
        showGlobalLogin,
        setShowGlobalLogin,
        addPendingRequest,
        retryPendingRequests,
        clearPendingRequests,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
