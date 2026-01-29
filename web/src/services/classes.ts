import api from "./api";

export interface Class {
  id: string;
  name: string;
  code: string;
  description?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    name: string;
    username: string;
  };
  students?: Student[];
  _count?: {
    students: number;
  };
}

export interface Student {
  id: string;
  studentId: string;
  name: string;
  gender?: string;
  classId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClassDto {
  name: string;
  code: string;
  description?: string;
}

export interface CreateStudentDto {
  studentId: string;
  name: string;
  password: string;
  gender?: string;
  classId?: string;
  className?: string; // 班级名称（用于自动创建或匹配班级）
  classCode?: string; // 班级代码（用于匹配已有班级）
}

export const getClasses = async (): Promise<Class[]> => {
  const response = await api.get<Class[]>("/api/classes");
  return response.data;
};

export const getClassById = async (id: string): Promise<Class> => {
  const response = await api.get<Class>(`/api/classes/${id}`);
  return response.data;
};

export const createClass = async (data: CreateClassDto): Promise<Class> => {
  const response = await api.post<Class>("/api/classes", data);
  return response.data;
};

export const updateClass = async (
  id: string,
  data: Partial<CreateClassDto>,
): Promise<Class> => {
  const response = await api.patch<Class>(`/api/classes/${id}`, data);
  return response.data;
};

export const deleteClass = async (id: string): Promise<void> => {
  await api.delete(`/api/classes/${id}`);
};

export const addStudentToClass = async (
  classId: string,
  data: CreateStudentDto,
): Promise<Student> => {
  const response = await api.post<Student>(
    `/api/classes/${classId}/students`,
    data,
  );
  return response.data;
};

export const removeStudentFromClass = async (
  classId: string,
  studentId: string,
): Promise<void> => {
  await api.delete(`/api/classes/${classId}/students/${studentId}`);
};

export const importStudentsToClass = async (
  classId: string,
  students: CreateStudentDto[],
) => {
  const response = await api.post(
    `/api/classes/${classId}/students/import`,
    students,
  );
  return response.data;
};

export const importStudentsGlobal = async (students: CreateStudentDto[]) => {
  const response = await api.post("/api/classes/import-students", students);
  return response.data;
};

export const resetStudentPasswords = async (
  classId: string,
  studentIds: string[],
  newPassword: string,
) => {
  const response = await api.post(
    `/api/classes/${classId}/students/reset-password`,
    {
      studentIds,
      newPassword,
    },
  );
  return response.data;
};

export const updateStudent = async (
  classId: string,
  studentId: string,
  data: Partial<CreateStudentDto>,
): Promise<Student> => {
  const response = await api.patch<Student>(
    `/api/classes/${classId}/students/${studentId}`,
    data,
  );
  return response.data;
};
