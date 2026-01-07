import api from "./api";

export interface SystemSettings {
  aiProvider: string;
  aiApiKey: string;
  aiBaseUrl: string;
  aiModel: string;
  promptTemplate: string;
  ocrEngine: string;
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
