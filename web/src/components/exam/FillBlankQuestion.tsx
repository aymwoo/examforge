import React, { useMemo } from "react";

interface FillBlankQuestionProps {
  id: string;
  content: string;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}

export const FillBlankQuestion: React.FC<FillBlankQuestionProps> = ({
  id,
  content,
  value,
  onChange,
  disabled,
}) => {
  // 解析当前值为字符串数组
  const values = useMemo(() => {
    if (Array.isArray(value)) return value.map(String);
    if (!value) return [];
    try {
      if (
        typeof value === "string" &&
        (value.startsWith("[") || value.includes(","))
      ) {
        // 尝试解析 JSON
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) return parsed.map(String);
        } catch (e) {
          // 如果不是JSON，可能是逗号分隔 (CSV style for simple blanks?)
          // 但考虑到答案本身可能包含逗号，这里慎重。
          // 暂时假设如果不是 JSON array，就是单个字符串
        }
      }
    } catch (e) {
      // ignore
    }
    return [String(value)];
  }, [value]);

  // 匹配规则：
  // 1. 连续3个及以上下划线: _____
  // 2. 中文括号: （ ） (注意中间可能有空格)
  // 3. 英文括号: ( )
  // 4. 中文方括号: 【 】
  // 5. 下划线加括号组合
  const regex = /(_+|（\s*）|\(\s*\)|【\s*】)/g;

  const parts = content.split(regex);
  const matches = content.match(regex);
  const blankCount = matches ? matches.length : 0;

  // 如果没有检测到占位符，回退到默认的单个文本域模式
  if (blankCount === 0) {
    return (
      <div className="w-full" data-question-id={id}>
        <p className="mb-4 text-ink-900 leading-relaxed whitespace-pre-wrap text-lg">
          {content}
        </p>
        <div className="mt-2">
          <textarea
            className="w-full p-4 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-ink-900"
            rows={4}
            value={values[0] || ""}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            placeholder="请输入答案..."
          />
        </div>
      </div>
    );
  }

  // 渲染带有嵌入式 Input 的文本
  let blankIndex = 0;

  return (
    <div className="text-lg leading-loose text-ink-900" data-question-id={id}>
      {parts.map((part, index) => {
        // 检查这一部分是否是分隔符（即填空位）
        if (regex.test(part)) {
          const currentIdx = blankIndex++;
          return (
            <span
              key={index}
              className="inline-block mx-1 align-baseline relative group"
            >
              <input
                type="text"
                disabled={disabled}
                value={values[currentIdx] || ""}
                onChange={(e) => {
                  const newValues = [...values];
                  // 补齐数组长度
                  while (newValues.length <= currentIdx) newValues.push("");
                  newValues[currentIdx] = e.target.value;
                  onChange(newValues);
                }}
                className="min-w-[100px] border-b-2 border-gray-300 px-2 py-0.5 text-center focus:border-blue-600 focus:outline-none bg-blue-50/30 text-blue-700 font-medium transition-colors rounded-t"
                style={{
                  width: `${Math.max(100, (values[currentIdx]?.length || 0) * 16)}px`,
                }}
              />
              <span className="absolute -bottom-5 left-0 w-full text-center text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                填空 {currentIdx + 1}
              </span>
            </span>
          );
        }
        return (
          <span key={index} className="whitespace-pre-wrap">
            {part}
          </span>
        );
      })}
    </div>
  );
};
