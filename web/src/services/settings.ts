import api from "./api";

export interface SystemSettings {
  aiProvider: string;
  aiApiKey: string;
  aiBaseUrl: string;
  aiModel: string;
  promptTemplate: string;
  gradingPromptTemplate: string;
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
  value: string,
): Promise<void> => {
  await api.put("/api/settings", { key, value });
};

export const generateExamFromAI = async (
  imageBase64: string,
): Promise<{ questions: AIQuestion[] }> => {
  const response = await api.post<{ questions: AIQuestion[] }>(
    "/api/ai/generate-questions",
    { image: imageBase64 },
  );
  return response.data;
};

export const testAIConnection = async (
  message?: string,
): Promise<{ response: string }> => {
  const response = await api.post<{ response: string }>("/api/ai/test", {
    message,
  });
  return response.data;
};
