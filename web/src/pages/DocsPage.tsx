import { useState } from "react";
import { ChevronRight, Settings, Upload, BookOpen, Users, BarChart3, CheckSquare } from "lucide-react";

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', title: '系统概览', icon: BookOpen },
    { id: 'provider', title: 'AI Provider 设置', icon: Settings },
    { id: 'import', title: '导入试题', icon: Upload },
    { id: 'exam', title: '创建和发布考试', icon: BookOpen },
    { id: 'take', title: '参加考试', icon: Users },
    { id: 'grading', title: '审核分数', icon: CheckSquare },
    { id: 'analytics', title: '统计分析', icon: BarChart3 }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">ExamForge 智考工坊</h2>
            <div className="prose max-w-none">
              <p className="text-lg text-gray-700 mb-6">
                ExamForge 是一个基于AI的智能考试系统，支持多种题型的自动导入、智能评分和数据分析。
              </p>
              
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                  <Settings className="h-8 w-8 text-blue-600 mb-3" />
                  <h3 className="font-semibold text-blue-900 mb-2">AI Provider 配置</h3>
                  <p className="text-blue-700 text-sm">配置AI服务提供商，支持智能评分和题目解析</p>
                </div>
                
                <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                  <Upload className="h-8 w-8 text-green-600 mb-3" />
                  <h3 className="font-semibold text-green-900 mb-2">批量导入题目</h3>
                  <p className="text-green-700 text-sm">支持Excel、PDF等格式的题目批量导入</p>
                </div>
                
                <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
                  <BarChart3 className="h-8 w-8 text-purple-600 mb-3" />
                  <h3 className="font-semibold text-purple-900 mb-2">智能分析</h3>
                  <p className="text-purple-700 text-sm">提供详细的考试数据分析和可视化图表</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'provider':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">AI Provider 设置</h2>
            <div className="prose max-w-none">
              <h3 className="text-xl font-semibold mb-4">1. 进入设置页面</h3>
              <p>点击导航栏中的"设置"按钮，进入系统设置页面。</p>
              
              <h3 className="text-xl font-semibold mb-4">2. 配置AI服务商</h3>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium mb-2">支持的AI服务商：</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>通义千问 (Qwen)</strong> - 阿里云大语言模型</li>
                  <li><strong>OpenAI GPT</strong> - OpenAI官方API</li>
                  <li><strong>Claude</strong> - Anthropic AI助手</li>
                  <li><strong>自定义API</strong> - 兼容OpenAI格式的其他服务</li>
                </ul>
              </div>
              
              <h3 className="text-xl font-semibold mb-4">3. 配置步骤</h3>
              <ol className="list-decimal list-inside space-y-2">
                <li>选择AI服务商类型</li>
                <li>输入API密钥 (API Key)</li>
                <li>设置API基础URL（如需要）</li>
                <li>选择模型名称</li>
                <li>点击"测试连接"验证配置</li>
                <li>保存配置</li>
              </ol>
              
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mt-4">
                <p className="text-yellow-800">
                  <strong>注意：</strong>AI Provider用于智能评分主观题，如简答题、论述题等。客观题（选择题、判断题）会自动评分。
                </p>
              </div>
            </div>
          </div>
        );

      case 'import':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">导入试题</h2>
            <div className="prose max-w-none">
              <h3 className="text-xl font-semibold mb-4">1. 支持的导入格式</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Excel 文件 (.xlsx, .xls)</h4>
                  <p className="text-blue-700 text-sm">支持标准格式的Excel题库文件</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-900 mb-2">PDF 文件</h4>
                  <p className="text-green-700 text-sm">通过OCR识别PDF中的题目内容</p>
                </div>
              </div>
              
              <h3 className="text-xl font-semibold mb-4">2. Excel 导入格式要求</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-300 px-4 py-2 text-left">列名</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">说明</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">示例</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">题干/content</td>
                      <td className="border border-gray-300 px-4 py-2">题目内容（必填）</td>
                      <td className="border border-gray-300 px-4 py-2">以下哪个是正确的？</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">题型/type</td>
                      <td className="border border-gray-300 px-4 py-2">题目类型</td>
                      <td className="border border-gray-300 px-4 py-2">单选题/SINGLE_CHOICE</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">选项/options</td>
                      <td className="border border-gray-300 px-4 py-2">选择题选项</td>
                      <td className="border border-gray-300 px-4 py-2">A.选项1 B.选项2 C.选项3</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">答案/answer</td>
                      <td className="border border-gray-300 px-4 py-2">正确答案</td>
                      <td className="border border-gray-300 px-4 py-2">A</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">解析/explanation</td>
                      <td className="border border-gray-300 px-4 py-2">答案解析</td>
                      <td className="border border-gray-300 px-4 py-2">因为...</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <h3 className="text-xl font-semibold mb-4">3. 导入步骤</h3>
              <ol className="list-decimal list-inside space-y-2">
                <li>点击导航栏"导入"按钮</li>
                <li>选择"上传文件"</li>
                <li>选择Excel或PDF文件</li>
                <li>预览导入内容</li>
                <li>确认导入</li>
                <li>查看导入结果</li>
              </ol>
            </div>
          </div>
        );

      case 'exam':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">创建和发布考试</h2>
            <div className="prose max-w-none">
              <h3 className="text-xl font-semibold mb-4">1. 创建考试</h3>
              <ol className="list-decimal list-inside space-y-2">
                <li>点击导航栏"考试"按钮</li>
                <li>点击"新建考试"</li>
                <li>填写考试基本信息：
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>考试标题</li>
                    <li>考试描述</li>
                    <li>考试时长（分钟）</li>
                    <li>总分</li>
                  </ul>
                </li>
                <li>保存考试</li>
              </ol>
              
              <h3 className="text-xl font-semibold mb-4">2. 添加题目</h3>
              <ol className="list-decimal list-inside space-y-2">
                <li>进入考试详情页面</li>
                <li>点击"考试题目"标签</li>
                <li>点击"添加题目"</li>
                <li>从题库中选择题目</li>
                <li>设置每道题的分值</li>
                <li>调整题目顺序</li>
              </ol>
              
              <h3 className="text-xl font-semibold mb-4">3. 发布考试</h3>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">发布前检查清单：</h4>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>✓ 考试信息完整</li>
                  <li>✓ 题目数量充足</li>
                  <li>✓ 分值设置合理</li>
                  <li>✓ AI Provider已配置（如有主观题）</li>
                </ul>
              </div>
              
              <p className="mt-4">考试发布后，学生可以通过考试链接参加考试。</p>
            </div>
          </div>
        );

      case 'take':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">参加考试</h2>
            <div className="prose max-w-none">
              <h3 className="text-xl font-semibold mb-4">1. 考试入口</h3>
              <p>学生通过以下方式参加考试：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>教师分享的考试链接</li>
                <li>考试二维码</li>
                <li>考试ID直接访问</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-4">2. 考试流程</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">1</div>
                  <div>
                    <h4 className="font-medium">身份验证</h4>
                    <p className="text-gray-600 text-sm">输入姓名和学号进行身份验证</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">2</div>
                  <div>
                    <h4 className="font-medium">阅读考试说明</h4>
                    <p className="text-gray-600 text-sm">查看考试时长、题目数量、注意事项</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">3</div>
                  <div>
                    <h4 className="font-medium">开始答题</h4>
                    <p className="text-gray-600 text-sm">按顺序回答题目，支持跳题和回看</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">4</div>
                  <div>
                    <h4 className="font-medium">提交考试</h4>
                    <p className="text-gray-600 text-sm">检查答案后提交，或时间到自动提交</p>
                  </div>
                </div>
              </div>
              
              <h3 className="text-xl font-semibold mb-4">3. 答题技巧</h3>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <ul className="list-disc list-inside space-y-1 text-green-800">
                  <li>合理分配时间，先易后难</li>
                  <li>仔细阅读题目，理解题意</li>
                  <li>不确定的题目可以先跳过</li>
                  <li>提交前检查是否有遗漏</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'grading':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">审核分数</h2>
            <div className="prose max-w-none">
              <h3 className="text-xl font-semibold mb-4">1. 自动评分</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-900 mb-2">客观题自动评分</h4>
                  <ul className="list-disc list-inside text-green-700 text-sm space-y-1">
                    <li>单选题</li>
                    <li>多选题</li>
                    <li>判断题</li>
                    <li>填空题（精确匹配）</li>
                  </ul>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">AI智能评分</h4>
                  <ul className="list-disc list-inside text-blue-700 text-sm space-y-1">
                    <li>简答题</li>
                    <li>论述题</li>
                    <li>案例分析题</li>
                    <li>开放性问题</li>
                  </ul>
                </div>
              </div>
              
              <h3 className="text-xl font-semibold mb-4">2. 人工复核</h3>
              <ol className="list-decimal list-inside space-y-2">
                <li>进入考试管理页面</li>
                <li>点击"评分管理"标签</li>
                <li>查看学生提交列表</li>
                <li>点击需要复核的学生</li>
                <li>查看AI评分建议</li>
                <li>调整分数（如需要）</li>
                <li>添加评语</li>
                <li>确认评分</li>
              </ol>
              
              <h3 className="text-xl font-semibold mb-4">3. 评分状态</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">待复核</span>
                  <span>AI已评分，等待教师复核</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">已复核</span>
                  <span>教师已确认评分</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">未评分</span>
                  <span>等待评分处理</span>
                </div>
              </div>
              
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg mt-4">
                <p className="text-orange-800">
                  <strong>建议：</strong>对于重要考试，建议教师对AI评分进行人工复核，确保评分的准确性和公平性。
                </p>
              </div>
            </div>
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">统计分析</h2>
            <div className="prose max-w-none">
              <h3 className="text-xl font-semibold mb-4">1. 基础统计</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-center">
                  <div className="text-2xl font-bold text-blue-600">85.6</div>
                  <div className="text-blue-700 text-sm">平均分</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
                  <div className="text-2xl font-bold text-green-600">78.5%</div>
                  <div className="text-green-700 text-sm">及格率</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 text-center">
                  <div className="text-2xl font-bold text-purple-600">92.3%</div>
                  <div className="text-purple-700 text-sm">参与率</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 text-center">
                  <div className="text-2xl font-bold text-orange-600">65-98</div>
                  <div className="text-orange-700 text-sm">分数区间</div>
                </div>
              </div>
              
              <h3 className="text-xl font-semibold mb-4">2. 可视化图表</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">分数分布图</h4>
                  <p className="text-gray-600 text-sm">柱状图显示各分数段的学生分布</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">题目类型分布</h4>
                  <p className="text-gray-600 text-sm">饼图显示不同题型的占比</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">难度分析</h4>
                  <p className="text-gray-600 text-sm">分析题目难度与正确率的关系</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">知识点掌握</h4>
                  <p className="text-gray-600 text-sm">雷达图显示各知识点掌握情况</p>
                </div>
              </div>
              
              <h3 className="text-xl font-semibold mb-4">3. 高级分析</h3>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>箱线图</strong> - 显示题目得分的统计分布</li>
                <li><strong>散点图</strong> - 分析题目难度与正确率关系</li>
                <li><strong>直方图</strong> - 详细的分数分布分析</li>
                <li><strong>热力图</strong> - 学生答题情况矩阵</li>
                <li><strong>趋势图</strong> - 知识点掌握趋势分析</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-4">4. 数据导出</h3>
              <p>支持导出以下格式的分析报告：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Excel格式的详细数据</li>
                <li>PDF格式的分析报告</li>
                <li>图表图片文件</li>
              </ul>
              
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mt-4">
                <p className="text-blue-800">
                  <strong>提示：</strong>统计分析功能帮助教师了解教学效果，识别学生薄弱环节，为后续教学提供数据支持。
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return <div>请选择一个章节</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">使用文档</h1>
          <p className="text-xl text-gray-600">ExamForge 智考工坊完整使用指南</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-4">
          {/* 侧边栏导航 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-8">
              <h3 className="font-semibold text-gray-900 mb-4">目录</h3>
              <nav className="space-y-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeSection === section.id
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{section.title}</span>
                      {activeSection === section.id && (
                        <ChevronRight className="h-4 w-4 ml-auto" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* 主要内容 */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
