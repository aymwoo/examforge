import ExamLayout from "@/components/ExamLayout";

export default function ExamStudentsPage() {
  return (
    <ExamLayout activeTab="students">
      <div className="space-y-8">
        <div className="rounded-3xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-indigo-900 mb-6">学生管理</h2>
          <div className="text-center py-12">
            <p className="text-indigo-700">学生管理功能开发中...</p>
          </div>
        </div>
      </div>
    </ExamLayout>
  );
}
