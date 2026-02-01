import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Users,
  Edit,
  Trash2,
  UserPlus,
  Upload,
  Download,
} from "lucide-react";
import * as XLSX from "xlsx";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import {
  getClasses,
  createClass,
  deleteClass,
  importStudentsGlobal,
  type Class,
  type CreateClassDto,
  type CreateStudentDto,
} from "@/services/classes";

export default function ClassesPage() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState<CreateClassDto>({
    name: "",
    code: "",
    description: "",
  });
  const [importData, setImportData] = useState<CreateStudentDto[]>([]);
  const [importResult, setImportResult] = useState<any>(null);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const data = await getClasses();
      setClasses(data);
    } catch (err) {
      console.error("加载班级列表失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await createClass(formData);
      setShowCreateModal(false);
      setFormData({ name: "", code: "", description: "" });
      loadClasses();
    } catch (err: any) {
      alert(err.response?.data?.message || "创建失败");
    }
  };

  const handleDelete = async () => {
    if (!selectedClass) return;
    try {
      await deleteClass(selectedClass.id);
      setShowDeleteModal(false);
      setSelectedClass(null);
      loadClasses();
    } catch (err: any) {
      alert(err.response?.data?.message || "删除失败");
    }
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
            className: String(row["班级名称"] || row["className"] || ""),
            classCode: String(row["班级代码"] || row["classCode"] || ""),
          }))
          .filter((student) => student.studentId && student.name);

        setImportData(students);
        setShowImportModal(true);
      } catch (error) {
        alert("文件解析失败，请检查文件格式");
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset input value to allow uploading same file again
    event.target.value = "";
  };

  const handleImport = async () => {
    if (importData.length === 0) return;
    try {
      const result = await importStudentsGlobal(importData);
      setImportResult(result);
      loadClasses();
    } catch (err: any) {
      alert(err.response?.data?.message || "导入失败");
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        学号: "2024001",
        姓名: "张三",
        性别: "男",
        密码: "123456",
        班级名称: "2024级1班",
        班级代码: "202401",
      },
      {
        学号: "2024002",
        姓名: "李四",
        性别: "女",
        密码: "123456",
        班级名称: "2024级1班",
        班级代码: "202401",
      },
      {
        学号: "2024003",
        姓名: "王五",
        性别: "男",
        密码: "123456",
        班级名称: "",
        班级代码: "",
        _说明: "班级名称/代码留空则需后续分配",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "学生信息");
    XLSX.writeFile(wb, "学生批量导入模板.xlsx");
  };

  return (
    <div className="bg-slatebg text-ink-900 antialiased min-h-screen pt-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-ink-900">班级管理</h1>
            <p className="text-ink-600 mt-2">管理班级和学生信息</p>
          </div>
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              下载模板
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                document.getElementById("global-file-upload")?.click()
              }
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              导入学生
            </Button>
            <input
              id="global-file-upload"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              创建班级
            </Button>
          </div>
        </div>

        {/* 班级列表 */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((classItem) => (
            <div
              key={classItem.id}
              className="bg-white rounded-xl p-6 shadow-soft border border-border hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <button
                    type="button"
                    onClick={() => navigate(`/classes/${classItem.id}`)}
                    className="text-left text-xl font-bold text-ink-900 mb-1 hover:text-blue-700"
                  >
                    {classItem.name}
                  </button>
                  <p className="text-sm text-ink-600">
                    班级代码: {classItem.code}
                  </p>
                  {classItem.description && (
                    <p className="text-sm text-ink-600 mt-1">
                      {classItem.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/classes/${classItem.id}`)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="查看详情"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedClass(classItem);
                      setShowDeleteModal(true);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="删除班级"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-ink-600">
                  <Users className="h-4 w-4" />
                  <span>{classItem._count?.students || 0} 名学生</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/classes/${classItem.id}`)}
                  className="flex items-center gap-1"
                >
                  <UserPlus className="h-3 w-3" />
                  管理
                </Button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-ink-500">
                  创建者: {classItem.creator?.name || "未知"}
                </p>
                <p className="text-xs text-ink-500">
                  创建时间:{" "}
                  {new Date(classItem.createdAt).toLocaleDateString("zh-CN")}
                </p>
              </div>
            </div>
          ))}
        </div>

        {classes.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-ink-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-ink-700 mb-2">
              暂无班级
            </h3>
            <p className="text-ink-600 mb-4">创建第一个班级开始管理学生</p>
            <Button onClick={() => setShowCreateModal(true)}>创建班级</Button>
          </div>
        )}

        {/* 创建班级模态框 */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setFormData({ name: "", code: "", description: "" });
          }}
          title="创建班级"
          onConfirm={handleCreate}
          confirmText="创建"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                班级名称 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入班级名称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                班级代码 *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入班级代码"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                班级描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入班级描述"
                rows={3}
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
          title="批量导入学生预览"
          onConfirm={importResult ? undefined : handleImport}
          confirmText={importResult ? undefined : "确认导入"}
          size="large"
        >
          {!importResult ? (
            <div>
              <div className="mb-4 text-sm text-gray-600">
                <p>将导入 {importData.length} 名学生。</p>
                <p>如果提供了班级代码/名称，将自动匹配已有班级或创建新班级。</p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 sticky top-0">
                      <th className="px-2 py-2 text-left bg-gray-50">学号</th>
                      <th className="px-2 py-2 text-left bg-gray-50">姓名</th>
                      <th className="px-2 py-2 text-left bg-gray-50">性别</th>
                      <th className="px-2 py-2 text-left bg-gray-50">
                        班级名称
                      </th>
                      <th className="px-2 py-2 text-left bg-gray-50">
                        班级代码
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {importData.map((student, index) => (
                      <tr key={index} className="border-t hover:bg-gray-50">
                        <td className="px-2 py-1">{student.studentId}</td>
                        <td className="px-2 py-1">{student.name}</td>
                        <td className="px-2 py-1">{student.gender || "-"}</td>
                        <td className="px-2 py-1 text-gray-500">
                          {student.className || "-"}
                        </td>
                        <td className="px-2 py-1 text-gray-500">
                          {student.classCode || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div>
              <h4 className="font-semibold mb-2">导入结果</h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-gray-600 text-sm">基本统计</p>
                  <p>总计: {importResult.total}</p>
                  <p className="text-green-600">成功: {importResult.success}</p>
                  <p className="text-red-600">失败: {importResult.failed}</p>
                </div>
                {importResult.createdClasses &&
                  importResult.createdClasses.length > 0 && (
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-blue-800 text-sm">
                        自动创建班级 ({importResult.createdClasses.length})
                      </p>
                      <ul className="list-disc list-inside text-sm text-blue-700 mt-1 max-h-20 overflow-y-auto">
                        {importResult.createdClasses.map(
                          (cls: string, i: number) => (
                            <li key={i}>{cls}</li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}
              </div>

              {importResult.failed > 0 && (
                <div className="mt-4">
                  <h5 className="font-medium mb-2 text-red-700">失败详情</h5>
                  <div className="max-h-40 overflow-y-auto bg-red-50 p-2 rounded text-sm">
                    {importResult.results
                      .filter((r: any) => !r.success)
                      .map((result: any, index: number) => (
                        <p
                          key={index}
                          className="text-red-600 py-0.5 border-b border-red-100 last:border-0"
                        >
                          {result.studentId} {result.name}
                          {result.className && (
                            <span className="text-gray-500">
                              {" "}
                              ({result.className})
                            </span>
                          )}
                          :<span className="font-medium"> {result.error}</span>
                        </p>
                      ))}
                  </div>
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
            setSelectedClass(null);
          }}
          title="删除班级"
          onConfirm={handleDelete}
          confirmText="删除"
          confirmVariant="danger"
        >
          <p>确定要删除班级 "{selectedClass?.name}" 吗？</p>
          <p className="text-red-600 text-sm mt-2">
            此操作将同时删除班级中的所有学生，且不可撤销。
          </p>
        </Modal>
      </div>
    </div>
  );
}
