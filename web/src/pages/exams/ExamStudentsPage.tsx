import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Upload, FileText, Users } from "lucide-react";
import ExamLayout from "@/components/ExamLayout";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { getExamById, type Exam } from "@/services/exams";
import api from "@/services/api";
import * as XLSX from "xlsx";

interface Submission {
  id: string;
  student: {
    id: string;
    username: string;
    displayName?: string;
  };
  submittedAt: string;
  score: number | null;
  isAutoGraded: boolean;
  isReviewed: boolean;
  gradingDetails?: any;
}

interface ExamStudent {
  id: string;
  username: string;
  displayName?: string;
  studentId?: string;
  createdAt: string;
  accountType?: string; // 添加账号类型字段
  className?: string;
}

export default function ExamStudentsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [exam, setExam] = useState<Exam | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [examStudents, setExamStudents] = useState<ExamStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [customPassword, setCustomPassword] = useState("");
  const [importMode, setImportMode] = useState<"text" | "file">("text");
  const [showClassModal, setShowClassModal] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(
    new Set(),
  );
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  // 当选中的班级改变时，重新加载学生
  useEffect(() => {
    if (selectedClasses.size > 0) {
      loadClassStudents();
    } else {
      setClassStudents([]);
      setSelectedStudents(new Set());
    }
  }, [selectedClasses]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [examData, submissionsResponse, studentsResponse] =
        await Promise.all([
          getExamById(id),
          api.get(`/api/exams/${id}/submissions`),
          api.get(`/api/exams/${id}/students`),
        ]);
      setExam(examData);
      setSubmissions(submissionsResponse.data);
      setExamStudents(
        studentsResponse.data.map((student: any) => ({
          ...student,
          className: student.student?.class?.name,
        })),
      );
    } catch (err) {
      console.error("加载数据失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleImportStudents = async () => {
    if (!importText.trim()) return;

    setImporting(true);
    try {
      const lines = importText.trim().split("\n");
      const studentsData = lines
        .map((line) => {
          const name = line.trim();
          return { name };
        })
        .filter((student) => student.name);

      await api.post(`/api/exams/${id}/students/import-temporary`, {
        students: studentsData,
        customPassword: customPassword.trim() || undefined,
      });

      setShowImportModal(false);
      setImportText("");
      setCustomPassword("");
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || "导入失败");
    } finally {
      setImporting(false);
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        let studentsData: string[] = [];

        if (file.name.endsWith(".csv")) {
          // 处理CSV文件
          const text = data as string;
          const lines = text.split("\n");
          studentsData = lines
            .map((line) => line.trim())
            .filter((line) => line);
        } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
          // 处理Excel文件
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          studentsData = jsonData
            .map((row: any) => String(row[0] || "").trim())
            .filter((name) => name);
        }

        setImportText(studentsData.join("\n"));
        setImportMode("text");
      } catch (error) {
        alert("文件解析失败，请检查文件格式");
      }
    };

    if (file.name.endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const loadClasses = async () => {
    try {
      const response = await api.get("/api/classes");
      setClasses(response.data.data || response.data || []);
    } catch (err) {
      console.error("加载班级失败:", err);
    }
  };

  const loadClassStudents = async () => {
    if (selectedClasses.size === 0) {
      setClassStudents([]);
      return;
    }

    try {
      const classIds = Array.from(selectedClasses);
      const promises = classIds.map((classId) =>
        api.get(`/api/classes/${classId}/students`),
      );
      const responses = await Promise.all(promises);

      // 合并所有班级的学生，去重
      const allStudents = responses.flatMap((response) => response.data || []);
      const uniqueStudents = allStudents.filter(
        (student, index, self) =>
          index === self.findIndex((s) => s.id === student.id),
      );

      setClassStudents(uniqueStudents);
    } catch (err) {
      console.error("加载班级学生失败:", err);
    }
  };

  const handleClassImport = async () => {
    if (selectedStudents.size === 0) return;

    setImporting(true);
    try {
      const classIds = Array.from(selectedClasses);

      // 为每个班级分别导入选中的学生
      for (const classId of classIds) {
        const classStudentIds = classStudents
          .filter((s) => selectedStudents.has(s.id))
          .filter((s) => s.classId === classId)
          .map((s) => s.id);

        if (classStudentIds.length > 0) {
          await api.post(`/api/exams/${id}/students/import-from-class`, {
            classId,
            studentIds: classStudentIds,
          });
        }
      }

      setShowClassModal(false);
      setSelectedClasses(new Set());
      setClassStudents([]);
      setSelectedStudents(new Set());
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || "导入失败");
    } finally {
      setImporting(false);
    }
  };

  // 按登录模式分组学生
  const getStudentsByMode = () => {
    console.log(
      "All students:",
      examStudents.map((s) => ({
        name: s.displayName,
        accountType: s.accountType,
      })),
    );

    const groups = {
      PERMANENT: examStudents.filter((s) => s.accountType === "PERMANENT"),
      TEMPORARY_IMPORT: examStudents.filter(
        (s) =>
          s.accountType === "TEMPORARY_IMPORT" || s.accountType === "TEMPORARY",
      ),
      TEMPORARY_REGISTER: examStudents.filter(
        (s) => s.accountType === "TEMPORARY_REGISTER",
      ),
    };

    console.log("Grouped students:", {
      PERMANENT: groups.PERMANENT.length,
      TEMPORARY_IMPORT: groups.TEMPORARY_IMPORT.length,
      TEMPORARY_REGISTER: groups.TEMPORARY_REGISTER.length,
    });

    return groups;
  };

  const studentGroups = getStudentsByMode();

  const getModeLabel = (mode: string) => {
    const labels = {
      PERMANENT: "固定学生",
      TEMPORARY_IMPORT: "临时导入",
      TEMPORARY_REGISTER: "临时注册",
    };
    return labels[mode as keyof typeof labels] || mode;
  };

  if (loading) {
    return (
      <ExamLayout activeTab="students">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </ExamLayout>
    );
  }

  return (
    <ExamLayout activeTab="students">
      <div className="space-y-8">
        <div className="rounded-3xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-8 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-indigo-900">学生管理</h2>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  loadClasses();
                  setShowClassModal(true);
                }}
                className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                从班级导入
              </Button>
              <Button
                onClick={() => setShowImportModal(true)}
                className="bg-indigo-500 hover:bg-indigo-600 text-white flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                临时导入学生
              </Button>
            </div>
          </div>

          {/* 统计信息 */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="bg-white rounded-xl p-4 border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                {studentGroups.PERMANENT.length}
              </div>
              <div className="text-sm text-blue-700">固定学生</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                {studentGroups.TEMPORARY_IMPORT.length}
              </div>
              <div className="text-sm text-green-700">临时导入</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">
                {studentGroups.TEMPORARY_REGISTER.length}
              </div>
              <div className="text-sm text-orange-700">临时注册</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-indigo-200">
              <div className="text-2xl font-bold text-indigo-600">
                {submissions.length}
              </div>
              <div className="text-sm text-indigo-700">已提交</div>
            </div>
          </div>

          {/* 学生列表 */}
          <div className="space-y-6">
            {Object.entries(studentGroups).map(
              ([mode, students]) =>
                students.length > 0 && (
                  <div key={mode} className="space-y-4">
                    <h3 className="text-lg font-semibold text-indigo-900 flex items-center gap-2">
                      {getModeLabel(mode)}
                      <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-sm">
                        {students.length}人
                      </span>
                    </h3>
                    {students.map((student) => {
                      const submission = submissions.find(
                        (s) => s.student.username === student.username,
                      );
                      return (
                        <div
                          key={student.id}
                          className="bg-white rounded-xl p-6 border border-indigo-200 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-indigo-900">
                                {student.displayName || student.username}
                                {mode === "PERMANENT" && student.studentId && (
                                  <span className="ml-2 text-sm text-indigo-500">
                                    {student.studentId}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600">
                                {mode === "PERMANENT" ? "班级:" : "注册时间:"}{" "}
                                {mode === "PERMANENT"
                                  ? student.className || "-"
                                  : new Date(student.createdAt).toLocaleString(
                                      "zh-CN",
                                    )}
                              </div>
                              {submission && (
                                <div className="text-sm text-gray-600">
                                  提交时间:{" "}
                                  {new Date(
                                    submission.submittedAt,
                                  ).toLocaleString("zh-CN")}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              {submission ? (
                                <>
                                  {submission.score !== null && (
                                    <div className="text-lg font-bold text-green-600 mb-1">
                                      {submission.score}/{exam?.totalScore}
                                    </div>
                                  )}
                                  {submission.gradingDetails && (
                                    <div className="text-sm text-blue-600 mb-2">
                                      AI预评分:{" "}
                                      {submission.gradingDetails.totalScore}/
                                      {submission.gradingDetails.maxTotalScore}
                                    </div>
                                  )}
                                  <div className="flex flex-col items-end gap-2">
                                    {submission.isReviewed ? (
                                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                                        已复核
                                      </span>
                                    ) : submission.isAutoGraded ? (
                                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                                        待复核
                                      </span>
                                    ) : (
                                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                                        未评分
                                      </span>
                                    )}
                                    {mode === "PERMANENT" &&
                                      student.studentId && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            navigate(
                                              `/student/${student.studentId}`,
                                            )
                                          }
                                          className="text-xs font-medium text-indigo-600 hover:text-indigo-900"
                                        >
                                          学习情况
                                        </button>
                                      )}
                                  </div>
                                </>
                              ) : (
                                <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                                  未提交
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ),
            )}

            {examStudents.length === 0 && (
              <div className="text-center py-12">
                <p className="text-indigo-700">暂无注册学生</p>
              </div>
            )}
          </div>
        </div>

        {/* 临时导入学生模态框 */}
        <Modal
          isOpen={showImportModal}
          onClose={() => {
            setShowImportModal(false);
            setImportText("");
            setCustomPassword("");
            setImportMode("text");
          }}
          title="临时导入学生名册"
          onConfirm={handleImportStudents}
          confirmText={importing ? "导入中..." : "确认导入"}
          confirmDisabled={importing || !importText.trim()}
        >
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>注意：</strong>
                此功能仅为当前考试临时导入学生，不会添加到系统数据库中。
              </p>
            </div>

            {/* 导入方式选择 */}
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => setImportMode("text")}
                className={`px-4 py-2 rounded-lg border ${
                  importMode === "text"
                    ? "bg-indigo-500 text-white border-indigo-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                手动输入
              </button>
              <button
                onClick={() => setImportMode("file")}
                className={`px-4 py-2 rounded-lg border ${
                  importMode === "file"
                    ? "bg-indigo-500 text-white border-indigo-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                文件导入
              </button>
            </div>

            {/* 自定义密码 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                自定义初始密码（可选）
              </label>
              <input
                type="text"
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                placeholder="留空则使用默认密码"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                建议使用简单易记的密码，如：123456、考试名称等
              </p>
            </div>

            {importMode === "text" ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  学生姓名列表（每行一个姓名）
                </label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="张三&#10;李四&#10;王五"
                  className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  上传Excel或CSV文件
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileImport}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600"
                  >
                    选择文件
                  </label>
                  <p className="text-sm text-gray-500 mt-2">
                    支持 .xlsx, .xls, .csv 格式，只需第一列包含学生姓名
                  </p>
                </div>
                {importText && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      预览数据（可编辑）
                    </label>
                    <textarea
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="text-sm text-gray-600">
              系统将自动为每个学生生成易记的临时账号，仅在此次考试中有效。
            </div>
          </div>
        </Modal>

        {/* 从班级导入学生模态框 */}
        <Modal
          isOpen={showClassModal}
          onClose={() => {
            setShowClassModal(false);
            setSelectedClasses(new Set());
            setClassStudents([]);
            setSelectedStudents(new Set());
          }}
          title="从班级导入学生"
          onConfirm={handleClassImport}
          confirmText={importing ? "导入中..." : "确认导入"}
          confirmDisabled={importing || selectedStudents.size === 0}
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>说明：</strong>
                从您创建的班级中导入固定学生账号到考试中。
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                选择班级 ({selectedClasses.size}个已选择)
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {classes.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => {
                      const newSelected = new Set(selectedClasses);
                      if (newSelected.has(cls.id)) {
                        newSelected.delete(cls.id);
                      } else {
                        newSelected.add(cls.id);
                      }
                      setSelectedClasses(newSelected);
                      setSelectedStudents(new Set());
                    }}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      selectedClasses.has(cls.id)
                        ? "bg-indigo-500 text-white border-indigo-500"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="font-medium">{cls.name}</div>
                    <div className="text-sm opacity-75">
                      {cls._count?.students || 0}人
                    </div>
                  </button>
                ))}
              </div>
              {classes.length === 0 && (
                <p className="text-gray-500 text-center py-4">暂无可用班级</p>
              )}
            </div>

            {classStudents.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    选择学生 ({selectedStudents.size}/{classStudents.length})
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setSelectedStudents(
                          new Set(classStudents.map((s) => s.id)),
                        )
                      }
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      全选
                    </button>
                    <button
                      onClick={() => setSelectedStudents(new Set())}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      清空
                    </button>
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg">
                  {classStudents.map((student) => (
                    <label
                      key={student.id}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudents.has(student.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedStudents);
                          if (e.target.checked) {
                            newSelected.add(student.id);
                          } else {
                            newSelected.delete(student.id);
                          }
                          setSelectedStudents(newSelected);
                        }}
                        className="mr-3 rounded border-gray-300"
                      />
                      <div>
                        <div className="font-medium text-gray-900">
                          {student.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          学号: {student.studentId}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </ExamLayout>
  );
}
