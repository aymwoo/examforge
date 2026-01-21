import api from "./api";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  createdAt: string;
  updatedAt: string;
}

export const getUsers = async (): Promise<User[]> => {
  const response = await api.get<User[]>("/api/users");
  return response.data;
};

export const getUserById = async (id: string): Promise<User> => {
  const response = await api.get<User>(`/api/users/${id}`);
  return response.data;
};

export const createUser = async (data: Partial<User>): Promise<User> => {
  const response = await api.post<User>("/api/users", data);
  return response.data;
};

export const updateUser = async (
  id: string,
  data: Partial<User>,
): Promise<User> => {
  const response = await api.put<User>(`/api/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id: string): Promise<void> => {
  await api.delete(`/api/users/${id}`);
};
