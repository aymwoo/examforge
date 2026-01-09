import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

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

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, data);
    return response.data;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, data);
    return response.data;
  },
};
