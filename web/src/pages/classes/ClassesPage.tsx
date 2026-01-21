import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Users, Edit, Trash2, UserPlus } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import {
  getClasses,
  createClass,
  deleteClass,
  type Class,
  type CreateClassDto,
} from "@/services/classes";

export default function ClassesPage() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState<CreateClassDto>({
    name: "",
    code: "",
    description: "",
  });

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

  return (
    <div className="bg-slatebg text-ink-900 antialiased min-h-screen pt-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-ink-900">班级管理</h1>
            <p className="text-ink-600 mt-2">管理班级和学生信息</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            创建班级
          </Button>
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
