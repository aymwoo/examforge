export interface User {
  id: string;
  username: string;
  email?: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export type TabType = "ai-provider" | "prompts" | "users";

export interface AIProviderItem {
  id: string;
  name: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
  isGlobal: boolean;
  isActive: boolean;
  createdBy?: string;
  creator?: {
    id: string;
    name: string;
    username: string;
  };
  createdAt: string;
}

export interface AIProviderFormData {
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  isGlobal: boolean;
  isActive: boolean;
}
