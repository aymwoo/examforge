import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

type HeatmapMode = "mastery" | "matrix";

type ExamAnalyticsChartsProps = {
  scoreDistributionData: Array<{ name: string; count: number }>;
  questionTypeData: Array<{ name: string; value: number }>;
  difficultyData: Array<{ name: string; value: number }>;
  knowledgePointRadarData: Array<{
    subject: string;
    score: number;
    mastery: number;
  }>;
  boxPlotData: Array<Record<string, number | string>>;
  scatterData: Array<{
    x: number;
    y: number;
    name: string;
    type: string;
  }>;
  histogramData: Array<{
    score: string;
    count: number;
    percentage: string | number;
  }>;
  knowledgePointTrendData: Array<Record<string, any>>;
  heatmapMasteryData: Array<{
    question: string;
    masteryRate: number;
    averageScore: number;
    maxScore: number;
    order: number;
  }>;
  heatmapMatrixData: Array<{
    student: string;
    question: string;
    score: number;
    rate: number;
    maxScore: number;
    x: number;
    y: number;
  }>;
  heatmapMode: HeatmapMode;
  onHeatmapModeChange: (mode: HeatmapMode) => void;
};

const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
  "#8dd1e1",
  "#d084d0",
];

const BoxPlot = ({ data }: { data: Array<Record<string, any>> }) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip
        formatter={(value, name: any) => {
          const labels: Record<string, string> = {
            min: "最小值",
            q1: "第一四分位数",
            median: "中位数",
            q3: "第三四分位数",
            max: "最大值",
          };
          const key = String(name);
          return [value, labels[key] || key];
        }}
      />
      <Bar dataKey="min" fill="#e5e7eb" />
      <Bar dataKey="q1" fill="#9ca3af" />
      <Bar dataKey="median" fill="#374151" />
      <Bar dataKey="q3" fill="#6b7280" />
      <Bar dataKey="max" fill="#d1d5db" />
    </BarChart>
  </ResponsiveContainer>
);

const HeatmapMastery = ({
  data,
}: {
  data: ExamAnalyticsChartsProps["heatmapMasteryData"];
}) => {
  const questions = data.map((d) => d.question);
  const getColor = (value: number) => {
    const clamped = Math.max(0, Math.min(100, value));
    const intensity = clamped / 100;
    const hue = 10 - 10 * intensity;
    const lightness = 95 - 45 * intensity;
    return `hsl(${hue}, 80%, ${lightness}%)`;
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="grid grid-cols-11 gap-1 text-xs mb-1">
          <div className="font-semibold p-2 text-center">题号</div>
          {questions.map((q) => (
            <div key={q} className="text-center font-semibold p-2">
              {q}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-11 gap-1 text-xs">
          <div className="font-semibold p-2 text-right">掌握度</div>
          {data.map((item) => (
            <div
              key={item.question}
              className="aspect-square flex flex-col items-center justify-center text-[11px] font-semibold rounded"
              style={{
                backgroundColor: getColor(item.masteryRate),
                color: item.masteryRate > 55 ? "white" : "#1f2937",
              }}
              title={`${item.question} 掌握度 ${item.masteryRate}% (均分 ${item.averageScore.toFixed(
                1,
              )}/${item.maxScore})`}
            >
              <span>{item.masteryRate}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const HeatmapMatrix = ({
  data,
}: {
  data: ExamAnalyticsChartsProps["heatmapMatrixData"];
}) => {
  const students = [...new Set(data.map((d) => d.student))];
  const questions = [...new Set(data.map((d) => d.question))];

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="grid grid-cols-11 gap-1 text-xs mb-1">
          <div className="font-semibold p-2 text-center">学生</div>
          {questions.map((q) => (
            <div key={q} className="text-center font-semibold p-2">
              {q}
            </div>
          ))}
        </div>

        {students.map((student) => (
          <div key={student} className="grid grid-cols-11 gap-1 text-xs">
            <div className="font-semibold p-2 text-right">{student}</div>
            {questions.map((question) => {
              const item = data.find(
                (d) => d.student === student && d.question === question,
              );
              const score = item?.score || 0;
              const rate = item?.rate ?? 0;
              const intensity = rate / 100;
              return (
                <div
                  key={`${student}-${question}`}
                  className="aspect-square flex flex-col items-center justify-center text-white text-[11px] font-semibold rounded"
                  style={{
                    backgroundColor: `rgba(59, 130, 246, ${intensity})`,
                    color: intensity > 0.5 ? "white" : "black",
                  }}
                  title={`${student} - ${question}: ${score}分 (${rate}%)`}
                >
                  <span>{rate}%</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function ExamAnalyticsCharts({
  scoreDistributionData,
  questionTypeData,
  difficultyData,
  knowledgePointRadarData,
  boxPlotData,
  scatterData,
  histogramData,
  knowledgePointTrendData,
  heatmapMasteryData,
  heatmapMatrixData,
  heatmapMode,
  onHeatmapModeChange,
}: ExamAnalyticsChartsProps) {
  return (
    <>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-3xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white p-8 shadow-lg">
          <h3 className="text-xl font-bold text-blue-900 mb-6">分数分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scoreDistributionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-3xl border-2 border-green-100 bg-gradient-to-br from-green-50 to-white p-8 shadow-lg">
          <h3 className="text-xl font-bold text-green-900 mb-6">
            题目类型分布
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={questionTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {questionTypeData.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-3xl border-2 border-orange-100 bg-gradient-to-br from-orange-50 to-white p-8 shadow-lg">
          <h3 className="text-xl font-bold text-orange-900 mb-6">
            题目难度分布
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={difficultyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-3xl border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-white p-8 shadow-lg">
          <h3 className="text-xl font-bold text-purple-900 mb-6">
            知识点掌握情况
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={knowledgePointRadarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar
                name="掌握率"
                dataKey="mastery"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.3}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-gray-900">高级数据分析</h2>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border-2 border-cyan-100 bg-gradient-to-br from-cyan-50 to-white p-8 shadow-lg">
            <h3 className="text-xl font-bold text-cyan-900 mb-6">
              题目得分分布箱线图
            </h3>
            <BoxPlot data={boxPlotData} />
            <p className="text-sm text-cyan-700 mt-2">
              显示每道题目的得分分布情况，包括最值、四分位数等统计信息
            </p>
          </div>

          <div className="rounded-3xl border-2 border-pink-100 bg-gradient-to-br from-pink-50 to-white p-8 shadow-lg">
            <h3 className="text-xl font-bold text-pink-900 mb-6">
              题目难度与正确率关系
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={scatterData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="x"
                  label={{
                    value: "难度等级",
                    position: "insideBottom",
                    offset: -5,
                  }}
                />
                <YAxis
                  label={{
                    value: "正确率(%)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip
                  formatter={(value, name) => [
                    name === "y" ? `${value}%` : value,
                    name === "y" ? "正确率" : "难度",
                  ]}
                  labelFormatter={(label, payload) =>
                    payload?.[0]?.payload?.name || `题目 ${label}`
                  }
                />
                <Line
                  type="monotone"
                  dataKey="y"
                  stroke="#ec4899"
                  strokeWidth={2}
                  dot={{ fill: "#ec4899", r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-sm text-pink-700 mt-2">
              分析题目难度设置与学生答题正确率的相关性
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-8 shadow-lg">
            <h3 className="text-xl font-bold text-indigo-900 mb-6">
              详细分数分布直方图
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={histogramData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="score" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => [
                    name === "count" ? `${value}人` : `${value}%`,
                    name === "count" ? "人数" : "占比",
                  ]}
                />
                <Bar dataKey="count" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-sm text-indigo-700 mt-2">
              更细粒度的分数分布，每5分为一个区间
            </p>
          </div>

          <div className="rounded-3xl border-2 border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-8 shadow-lg">
            <h3 className="text-xl font-bold text-emerald-900 mb-6">
              知识点掌握趋势
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={knowledgePointTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="knowledgePoint" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="masteryRate"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: "#10b981", r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="averageScore"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={{ fill: "#059669", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-sm text-emerald-700 mt-2">
              展示各知识点的掌握率和平均得分趋势
            </p>
          </div>
        </div>

        <div className="rounded-3xl border-2 border-amber-100 bg-gradient-to-br from-amber-50 to-white p-8 shadow-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
            <h3 className="text-xl font-bold text-amber-900">
              试题掌握度热力图
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-amber-800">视图</span>
              <div className="inline-flex rounded-full border border-amber-200 bg-white p-1 text-xs">
                <button
                  type="button"
                  onClick={() => onHeatmapModeChange("mastery")}
                  className={`px-3 py-1 rounded-full transition ${
                    heatmapMode === "mastery"
                      ? "bg-amber-500 text-white"
                      : "text-amber-800"
                  }`}
                >
                  按题掌握度
                </button>
                <button
                  type="button"
                  onClick={() => onHeatmapModeChange("matrix")}
                  className={`px-3 py-1 rounded-full transition ${
                    heatmapMode === "matrix"
                      ? "bg-amber-500 text-white"
                      : "text-amber-800"
                  }`}
                >
                  学生矩阵
                </button>
              </div>
            </div>
          </div>
          <p className="text-sm text-amber-700 mb-6">
            {heatmapMode === "mastery"
              ? "题目重叠汇总学生答题情况，越热表示掌握越好，越冷表示掌握越差。"
              : "展示每位学生在每道题的得分，颜色越深表示得分越高。"}
          </p>
          {heatmapMode === "mastery" ? (
            <HeatmapMastery data={heatmapMasteryData} />
          ) : (
            <HeatmapMatrix data={heatmapMatrixData} />
          )}
        </div>
      </div>
    </>
  );
}
