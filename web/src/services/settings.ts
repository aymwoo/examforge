import api from "./api";

export interface SystemSettings {
  aiProvider: string;
  aiApiKey: string;
  aiBaseUrl: string;
  aiModel: string;
  promptTemplate: string;
  gradingPromptTemplate: string;
  analysisPromptTemplate: string;
  studentAiAnalysisPromptTemplate: string;
  jsonGenerationPromptTemplate: string;
}

export interface AIModelConfig {
  id: string;
  name: string;
  provider: string;
  defaultBaseUrl?: string;
  defaultModel?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface AIQuestion {
  content: string;
  type: string;
  options?: Array<{ label: string; content: string }>;
  answer: string;
  explanation?: string;
  difficulty: number;
  tags: string[];
  knowledgePoint?: string;
}

export const getSettings = async (): Promise<SystemSettings> => {
  const response = await api.get<SystemSettings>("/api/settings");
  return response.data;
};

export const getUserSettings = async (): Promise<SystemSettings> => {
  const response = await api.get<SystemSettings>("/api/settings/user");
  return response.data;
};

export const getJsonStructureTemplate = async (): Promise<string> => {
  const response = await api.get<{ template: string }>(
    "/api/settings/json-structure"
  );
  return response.data.template;
};

export const getProviders = async (): Promise<AIModelConfig[]> => {
  const response = await api.get<AIModelConfig[]>("/api/settings/providers");
  return response.data;
};

export const getPromptTemplate = async (): Promise<string> => {
  const response = await api.get<{ template: string }>("/api/settings/prompt");
  return response.data.template;
};

export const updateSetting = async (
  key: string,
  value: string
): Promise<void> => {
  await api.put("/api/settings", { key, value });
};

export const updateUserSetting = async (
  key: string,
  value: string
): Promise<void> => {
  await api.put("/api/settings/user", { key, value });
};

export const deleteAIProvider = async (providerId: string): Promise<void> => {
  await api.delete(`/api/ai-providers/${providerId}`);
};

export const getAIProviderDetails = async (
  providerId: string
): Promise<{
  id: string;
  name: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
}> => {
  const response = await api.get(`/api/ai-providers/${providerId}`);
  return response.data;
};

export const createAIProvider = async (provider: {
  name: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
  isGlobal?: boolean;
}): Promise<{ id: string }> => {
  const response = await api.post("/api/ai-providers", provider);
  return response.data;
};

export const updateAIProvider = async (
  providerId: string,
  updates: {
    name?: string;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    isGlobal?: boolean;
    isActive?: boolean;
  }
): Promise<void> => {
  await api.patch(`/api/ai-providers/${providerId}`, updates);
};

export const generateExamFromAI = async (
  imageBase64: string
): Promise<{ questions: AIQuestion[] }> => {
  const response = await api.post<{ questions: AIQuestion[] }>(
    "/api/ai/generate-questions",
    { image: imageBase64 }
  );
  return response.data;
};

export const testAIConnection = async (
  message?: string
): Promise<{ response: string }> => {
  const response = await api.post<{ response: string }>("/api/ai/test", {
    message,
  });
  return response.data;
};

export const getDefaultProviderId = async (): Promise<string> => {
  const response = await api.get<{ defaultProviderId: string }>(
    "/api/settings/default-provider"
  );
  return response.data.defaultProviderId;
};

export const setDefaultProvider = async (
  providerId: string
): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>(
    `/api/ai-providers/${providerId}/set-default`
  );
  return response.data;
};

export const deleteUserSetting = async (
  key: string
): Promise<void> => {
  await api.delete(`/api/settings/user`, {
    params: { key }
  });
};
