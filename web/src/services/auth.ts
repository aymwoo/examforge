import api from "./api";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    username: string;
    name: string;
    role: string;
    email?: string;
  };
}

export interface RegisterResponse {
  access_token?: string;
  message?: string;
  user: {
    id: string;
    username: string;
    name: string;
    role: string;
    email?: string;
    isActive?: boolean;
    isApproved?: boolean;
  };
}

export interface CheckFirstUserResponse {
  isFirstUser: boolean;
}

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post("/api/auth/login", data);
    return response.data;
  },

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await api.post("/api/auth/register", data);
    return response.data;
  },

  async checkFirstUser(): Promise<CheckFirstUserResponse> {
    const response = await api.get("/api/auth/check-first-user");
    return response.data;
  },
};
