import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Upload,
  Download,
  Edit,
  Trash2,
  Users,
  Key,
  CheckSquare,
  Square,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import {
  getClassById,
  addStudentToClass,
  removeStudentFromClass,
  importStudentsToClass,
  resetStudentPasswords,
  updateStudent,
  type Class,
  type Student,
  type CreateStudentDto,
} from "@/services/classes";
import * as XLSX from "xlsx";

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [classData, setClassData] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [importData, setImportData] = useState<CreateStudentDto[]>([]);
  const [importResult, setImportResult] = useState<any>(null);
  const [resetPasswordResult, setResetPasswordResult] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("123456");
  const [editForm, setEditForm] = useState<CreateStudentDto>({
    studentId: "",
    name: "",
    password: "",
    gender: "",
  });

  const [studentForm, setStudentForm] = useState<CreateStudentDto>({
    studentId: "",
    name: "",
    password: "",
    gender: "",
  });

  useEffect(() => {
    if (id) {
      loadClass();
    }
  }, [id]);

  const loadClass = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getClassById(id);
      setClassData(data);
    } catch (err) {
      console.error("加载班级信息失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async () => {
    if (!id) return;
    try {
      await addStudentToClass(id, studentForm);
      setShowAddModal(false);
      setStudentForm({ studentId: "", name: "", password: "", gender: "" });
      loadClass();
    } catch (err: any) {
      alert(err.response?.data?.message || "添加学生失败");
    }
  };

  const handleDeleteStudent = async () => {
    if (!id || !selectedStudent) return;
    try {
      await removeStudentFromClass(id, selectedStudent.studentId);
      setShowDeleteModal(false);
      setSelectedStudent(null);
      loadClass();
    } catch (err: any) {
      alert(err.response?.data?.message || "删除学生失败");
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const students: CreateStudentDto[] = jsonData
          .map((row: any) => ({
            studentId: String(row["学号"] || row["studentId"] || ""),
            name: String(row["姓名"] || row["name"] || ""),
            password: String(row["密码"] || row["password"] || "123456"),
            gender: String(row["性别"] || row["gender"] || ""),
          }))
          .filter((student) => student.studentId && student.name);

        setImportData(students);
        setShowImportModal(true);
      } catch (error) {
        alert("文件解析失败，请检查文件格式");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!id || importData.length === 0) return;
    try {
      const result = await importStudentsToClass(id, importData);
      setImportResult(result);
      loadClass();
    } catch (err: any) {
      alert(err.response?.data?.message || "导入失败");
    }
  };

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  const handleSelectAll = () => {
    if (!classData?.students) return;
    if (selectedStudents.length === classData.students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(classData.students.map((s) => s.studentId));
    }
  };

  const handleResetPasswords = async () => {
    if (!id || selectedStudents.length === 0) return;
    try {
      const result = await resetStudentPasswords(
        id,
        selectedStudents,
        newPassword,
      );
      setResetPasswordResult(result);
    } catch (err: any) {
      alert(err.response?.data?.message || "重置密码失败");
    }
  };

  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student);
    setEditForm({
      studentId: student.studentId,
      name: student.name,
      password: "", // 不显示原密码
      gender: student.gender || "",
    });
    setShowEditModal(true);
  };

  const handleUpdateStudent = async () => {
    if (!id || !selectedStudent) return;
    try {
      const updateData: Partial<CreateStudentDto> = {
        studentId: editForm.studentId,
        name: editForm.name,
        gender: editForm.gender,
      };

      // 只有输入了新密码才更新密码
      if (editForm.password) {
        updateData.password = editForm.password;
      }

      await updateStudent(id, selectedStudent.studentId, updateData);
      setShowEditModal(false);
      setSelectedStudent(null);
      setEditForm({ studentId: "", name: "", password: "", gender: "" });
      loadClass();
    } catch (err: any) {
      alert(err.response?.data?.message || "更新学生信息失败");
    }
  };

  const downloadTemplate = () => {
    const template = [
      { 学号: "2024001", 姓名: "张三", 性别: "男", 密码: "123456" },
      { 学号: "2024002", 姓名: "李四", 性别: "女", 密码: "123456" },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "学生信息");
    XLSX.writeFile(wb, "学生导入模板.xlsx");
  };

  if (loading) {
    return (
      <div className="bg-slatebg text-ink-900 antialiased min-h-screen pt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-ink-700">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="bg-slatebg text-ink-900 antialiased min-h-screen pt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-red-600">班级不存在</p>
            <Button onClick={() => navigate("/classes")} className="mt-4">
              返回班级列表
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slatebg text-ink-900 antialiased min-h-screen pt-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 页面头部 */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => navigate("/classes")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-ink-900">
              {classData.name}
            </h1>
            <p className="text-ink-600">班级代码: {classData.code}</p>
            {classData.description && (
              <p className="text-ink-600">{classData.description}</p>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-4 mb-8">
          <Button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            添加学生
          </Button>
          <Button
            variant="outline"
            onClick={() => document.getElementById("file-upload")?.click()}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            导入学生
          </Button>
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            下载模板
          </Button>
          {selectedStudents.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowResetPasswordModal(true)}
              className="flex items-center gap-2 bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100"
            >
              <Key className="h-4 w-4" />
              重置密码 ({selectedStudents.length})
            </Button>
          )}
          <input
            id="file-upload"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* 学生统计 */}
        <div className="bg-white rounded-xl p-6 shadow-soft border border-border mb-8">
          <div className="flex items-center gap-4">
            <Users className="h-8 w-8 text-blue-600" />
            <div>
              <h3 className="text-xl font-bold text-ink-900">学生统计</h3>
              <p className="text-ink-600">
                共 {classData.students?.length || 0} 名学生
              </p>
            </div>
          </div>
        </div>

        {/* 学生列表 */}
        <div className="bg-white rounded-xl shadow-soft border border-border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-ink-900">学生列表</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={handleSelectAll}
                      className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                    >
                      {selectedStudents.length === classData.students?.length &&
                      classData.students?.length > 0 ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                      全选
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    学号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    姓名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    性别
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classData.students?.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleSelectStudent(student.studentId)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {selectedStudents.includes(student.studentId) ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <button
                        onClick={() =>
                          navigate(`/student/${student.studentId}`)
                        }
                        className="text-indigo-600 hover:text-indigo-900 hover:underline"
                      >
                        {student.studentId}
                      </button>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button
                        onClick={() => navigate(`/student/${student.id}`)}
                        className="text-indigo-600 hover:text-indigo-900 hover:underline"
                      >
                        {student.name}
                      </button>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.gender || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(student.createdAt).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/student/${student.id}`)}
                          className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                          title="查看学习情况"
                        >
                          学习情况
                        </button>
                        <button
                          onClick={() => handleEditStudent(student)}
                          className="text-blue-600 hover:text-blue-900"
                          title="编辑学生"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="删除学生"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!classData.students || classData.students.length === 0) && (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">暂无学生</p>
              </div>
            )}
          </div>
        </div>

        {/* 添加学生模态框 */}
        <Modal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setStudentForm({
              studentId: "",
              name: "",
              password: "",
              gender: "",
            });
          }}
          title="添加学生"
          onConfirm={handleAddStudent}
          confirmText="添加"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                学号 *
              </label>
              <input
                type="text"
                value={studentForm.studentId}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, studentId: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入学号"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                姓名 *
              </label>
              <input
                type="text"
                value={studentForm.name}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入姓名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                性别
              </label>
              <select
                value={studentForm.gender}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, gender: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">请选择性别</option>
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                初始密码 *
              </label>
              <input
                type="password"
                value={studentForm.password}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, password: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入初始密码"
              />
            </div>
          </div>
        </Modal>

        {/* 导入预览模态框 */}
        <Modal
          isOpen={showImportModal}
          onClose={() => {
            setShowImportModal(false);
            setImportData([]);
            setImportResult(null);
          }}
          title="导入学生预览"
          onConfirm={importResult ? undefined : handleImport}
          confirmText={importResult ? undefined : "确认导入"}
        >
          {!importResult ? (
            <div>
              <p className="mb-4">将导入 {importData.length} 名学生：</p>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-2 py-1 text-left">学号</th>
                      <th className="px-2 py-1 text-left">姓名</th>
                      <th className="px-2 py-1 text-left">性别</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importData.map((student, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-2 py-1">{student.studentId}</td>
                        <td className="px-2 py-1">{student.name}</td>
                        <td className="px-2 py-1">{student.gender || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div>
              <h4 className="font-semibold mb-2">导入结果</h4>
              <p>总计: {importResult.total}</p>
              <p className="text-green-600">成功: {importResult.success}</p>
              <p className="text-red-600">失败: {importResult.failed}</p>
              {importResult.failed > 0 && (
                <div className="mt-4 max-h-40 overflow-y-auto">
                  <h5 className="font-medium mb-2">失败详情:</h5>
                  {importResult.results
                    .filter((r: any) => !r.success)
                    .map((result: any, index: number) => (
                      <p key={index} className="text-sm text-red-600">
                        {result.studentId} {result.name}: {result.error}
                      </p>
                    ))}
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* 删除确认模态框 */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedStudent(null);
          }}
          title="删除学生"
          onConfirm={handleDeleteStudent}
          confirmText="删除"
          confirmVariant="danger"
        >
          <p>确定要删除学生 "{selectedStudent?.name}" 吗？</p>
          <p className="text-red-600 text-sm mt-2">此操作不可撤销。</p>
        </Modal>

        {/* 重置密码模态框 */}
        <Modal
          isOpen={showResetPasswordModal}
          onClose={() => {
            setShowResetPasswordModal(false);
            setResetPasswordResult(null);
            setNewPassword("123456");
          }}
          title="重置学生密码"
          onConfirm={resetPasswordResult ? undefined : handleResetPasswords}
          confirmText={resetPasswordResult ? undefined : "确认重置"}
        >
          {!resetPasswordResult ? (
            <div className="space-y-4">
              <p>将为 {selectedStudents.length} 名学生重置密码：</p>
              <div className="max-h-32 overflow-y-auto bg-gray-50 p-3 rounded">
                {selectedStudents.map((studentId) => {
                  const student = classData?.students?.find(
                    (s) => s.studentId === studentId,
                  );
                  return (
                    <div key={studentId} className="text-sm">
                      {studentId} - {student?.name}
                    </div>
                  );
                })}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  新密码
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="请输入新密码"
                />
              </div>
            </div>
          ) : (
            <div>
              <h4 className="font-semibold mb-2">重置结果</h4>
              <p>总计: {resetPasswordResult.total}</p>
              <p className="text-green-600">
                成功: {resetPasswordResult.success}
              </p>
              <p className="text-red-600">失败: {resetPasswordResult.failed}</p>
              {resetPasswordResult.failed > 0 && (
                <div className="mt-4 max-h-40 overflow-y-auto">
                  <h5 className="font-medium mb-2">失败详情:</h5>
                  {resetPasswordResult.results
                    .filter((r: any) => !r.success)
                    .map((result: any, index: number) => (
                      <p key={index} className="text-sm text-red-600">
                        {result.studentId}: {result.error}
                      </p>
                    ))}
                </div>
              )}
              <div className="mt-4">
                <Button
                  onClick={() => {
                    setShowResetPasswordModal(false);
                    setResetPasswordResult(null);
                    setSelectedStudents([]);
                    setNewPassword("123456");
                  }}
                  className="w-full"
                >
                  完成
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* 编辑学生模态框 */}
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedStudent(null);
            setEditForm({ studentId: "", name: "", password: "", gender: "" });
          }}
          title="编辑学生信息"
          onConfirm={handleUpdateStudent}
          confirmText="保存"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                学号 *
              </label>
              <input
                type="text"
                value={editForm.studentId}
                onChange={(e) =>
                  setEditForm({ ...editForm, studentId: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入学号"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                姓名 *
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入姓名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                性别
              </label>
              <select
                value={editForm.gender}
                onChange={(e) =>
                  setEditForm({ ...editForm, gender: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">请选择性别</option>
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                新密码
              </label>
              <input
                type="password"
                value={editForm.password}
                onChange={(e) =>
                  setEditForm({ ...editForm, password: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="留空则不修改密码"
              />
              <p className="text-xs text-gray-500 mt-1">留空则不修改密码</p>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
