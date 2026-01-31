import React, { useState, useEffect, useRef, useMemo } from "react";

interface MatchingQuestionProps {
  content: string;
  matching?: {
    leftItems: string[];
    rightItems: string[];
  };
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}

export const MatchingQuestion: React.FC<MatchingQuestionProps> = ({
  content,
  matching,
  value,
  onChange,
  disabled,
}) => {
  const [leftItems, setLeftItems] = useState<string[]>([]);
  const [rightItems, setRightItems] = useState<string[]>([]);

  // Drag State
  const [dragStart, setDragStart] = useState<{
    item: string;
    side: "left" | "right";
    startX: number;
    startY: number;
  } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Parse value into pairs
  const pairs: { left: string; right: string }[] = useMemo(() => {
    if (Array.isArray(value)) return value;
    try {
      if (typeof value === "string") {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      }
      // eslint-disable-next-line no-empty
    } catch (e) {}
    return [];
  }, [value]);

  // DOM Refs for calculating line coordinates
  const containerRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const rightRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  // Force update to redraw lines
  const [, setTick] = useState(0);

  // Initialize items (from matching prop or fallback parsing)
  useEffect(() => {
    if (
      matching &&
      matching.leftItems?.length > 0 &&
      matching.rightItems?.length > 0
    ) {
      setLeftItems(matching.leftItems);
      setRightItems(matching.rightItems);
    } else {
      // Fallback: Parse content
      try {
        const cleanContent = content.replace(/\s+/g, " ");
        const leftIndex = cleanContent.indexOf("左侧");
        const rightIndex = cleanContent.indexOf("右侧");

        if (leftIndex !== -1 && rightIndex !== -1 && rightIndex > leftIndex) {
          const leftPart = cleanContent.substring(leftIndex, rightIndex);
          const rightPart = cleanContent.substring(rightIndex);

          const extract = (text: string) => {
            return text
              .split(/[-–—]/)
              .map((s) => s.trim())
              .filter(
                (s) =>
                  s &&
                  !s.includes("左侧") &&
                  !s.includes("右侧") &&
                  !s.includes("请将"),
              );
          };

          setLeftItems(extract(leftPart));
          setRightItems(extract(rightPart));
        }
      } catch (e) {
        console.error("Failed to parse matching content fallback", e);
      }
    }
  }, [matching, content]);

  // Handle Resize to redraw lines
  useEffect(() => {
    const handleResize = () => setTick((t) => t + 1);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Auto-update positions slightly after render to ensure DOM is ready
  useEffect(() => {
    const timer = setTimeout(() => setTick((t) => t + 1), 100);
    return () => clearTimeout(timer);
  }, [leftItems, rightItems]);

  // Drag Handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStart || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setDragCurrent({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!dragStart) return;

      // Check if dropped on a valid target
      const targetEl = document.elementFromPoint(e.clientX, e.clientY);
      const targetDiv = targetEl?.closest("[data-matching-item]");

      if (targetDiv) {
        const targetItem = targetDiv.getAttribute("data-matching-item");
        const targetSide = targetDiv.getAttribute("data-matching-side");

        if (targetItem && targetSide && targetSide !== dragStart.side) {
          handleConnect(
            dragStart.side === "left" ? dragStart.item : targetItem,
            dragStart.side === "right" ? dragStart.item : targetItem,
          );
        }
      }

      setDragStart(null);
      setDragCurrent(null);
    };

    if (dragStart) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragStart, pairs]);

  const handleMouseDown = (
    e: React.MouseEvent,
    item: string,
    side: "left" | "right",
  ) => {
    if (disabled || !containerRef.current) return;
    e.preventDefault(); // prevent text selection

    const rect = containerRef.current.getBoundingClientRect();
    const node =
      side === "left" ? leftRefs.current[item] : rightRefs.current[item];
    let startX = e.clientX - rect.left;
    let startY = e.clientY - rect.top;

    if (node) {
      const nodeRect = node.getBoundingClientRect();
      startY = nodeRect.top + nodeRect.height / 2 - rect.top;
      startX =
        side === "left"
          ? nodeRect.right - rect.left // Right edge for left items
          : nodeRect.left - rect.left; // Left edge for right items
    }

    setDragStart({ item, side, startX, startY });
    setDragCurrent({ x: startX, y: startY });
  };

  const handleConnect = (left: string, right: string) => {
    const newPairs = [...pairs];
    // One-to-one constraint: Remove existing connections for these items
    const cleanPairs = newPairs.filter(
      (p) => p.left !== left && p.right !== right,
    );
    cleanPairs.push({ left, right });
    onChange(cleanPairs);
  };

  const handleRemovePair = (pairIdx: number) => {
    if (disabled) return;
    const newPairs = [...pairs];
    newPairs.splice(pairIdx, 1);
    onChange(newPairs);
  };

  const renderItemContent = (text: string) => {
    // Match Markdown image: ![alt](url)
    const mdImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/;
    const match = text.match(mdImageRegex);

    if (match) {
      const alt = match[1];
      const url = match[2];
      const textBefore = text.substring(0, match.index).trim();
      const textAfter = text
        .substring((match.index || 0) + match[0].length)
        .trim();

      return (
        <div className="flex flex-col items-center justify-center gap-2 w-full pointer-events-none">
          {textBefore && (
            <span className="text-sm font-medium text-ink-900">
              {textBefore}
            </span>
          )}
          <img
            src={url}
            alt={alt}
            className="max-h-24 max-w-full object-contain rounded border border-gray-100 bg-white"
          />
          {textAfter && (
            <span className="text-sm font-medium text-ink-900">
              {textAfter}
            </span>
          )}
        </div>
      );
    }
    return (
      <span className="text-sm font-medium text-ink-900 pointer-events-none">
        {text}
      </span>
    );
  };

  const renderLines = () => {
    if (!containerRef.current) return null;
    const containerRect = containerRef.current.getBoundingClientRect();

    return (
      <>
        {pairs.map((pair, idx) => {
          const lNode = leftRefs.current[pair.left];
          const rNode = rightRefs.current[pair.right];
          if (!lNode || !rNode) return null;

          const lRect = lNode.getBoundingClientRect();
          const rRect = rNode.getBoundingClientRect();

          const x1 = lRect.right - containerRect.left;
          const y1 = lRect.top + lRect.height / 2 - containerRect.top;
          const x2 = rRect.left - containerRect.left;
          const y2 = rRect.top + rRect.height / 2 - containerRect.top;

          return (
            <g
              key={`${pair.left}-${pair.right}`}
              className="group cursor-pointer"
              onClick={() => handleRemovePair(idx)}
            >
              {/* Invisible thicker line for easier clicking */}
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="transparent"
                strokeWidth="15"
              />
              {/* Visible Line */}
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#3B82F6"
                strokeWidth="2"
                className="group-hover:stroke-red-500 group-hover:stroke-[3px] transition-all"
              />
            </g>
          );
        })}

        {/* Transient Drag Line */}
        {dragStart && dragCurrent && (
          <line
            x1={dragStart.startX}
            y1={dragStart.startY}
            x2={dragCurrent.x}
            y2={dragCurrent.y}
            stroke="#3B82F6"
            strokeWidth="2"
            strokeDasharray="5,5"
            className="pointer-events-none opacity-60"
          />
        )}
      </>
    );
  };

  if (leftItems.length === 0 || rightItems.length === 0) {
    return (
      <div className="p-4 text-gray-500 border border-dashed rounded-lg text-center">
        暂无连线数据，请尝试通过题干描述作答。
      </div>
    );
  }

  return (
    <div className="w-full relative select-none" ref={containerRef}>
      <svg
        className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
        style={{ minHeight: "300px" }}
      >
        <g className="pointer-events-auto">{renderLines()}</g>
      </svg>

      <div className="flex justify-between items-start gap-10 relative z-20">
        {/* Left Column */}
        <div className="flex-1 flex flex-col gap-6">
          {leftItems.map((item) => {
            const isConnected = pairs.some((p) => p.left === item);
            return (
              <div
                key={item}
                ref={(el) => {
                  leftRefs.current[item] = el;
                }}
                onMouseDown={(e) => handleMouseDown(e, item, "left")}
                data-matching-item={item}
                data-matching-side="left"
                className={`
                                relative p-4 rounded-xl border-2 cursor-grab active:cursor-grabbing transition-all flex items-center justify-center min-h-[60px] text-center
                                ${isConnected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-300"}
                            `}
              >
                {renderItemContent(item)}
                {/* Anchor Point (Right) */}
                <div
                  className={`absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-white ${isConnected ? "bg-blue-500" : "bg-gray-300 group-hover:bg-blue-300"}`}
                ></div>
              </div>
            );
          })}
        </div>

        {/* Right Column */}
        <div className="flex-1 flex flex-col gap-6">
          {rightItems.map((item) => {
            const isConnected = pairs.some((p) => p.right === item);
            return (
              <div
                key={item}
                ref={(el) => {
                  rightRefs.current[item] = el;
                }}
                onMouseDown={(e) => handleMouseDown(e, item, "right")}
                data-matching-item={item}
                data-matching-side="right"
                className={`
                                relative p-4 rounded-xl border-2 cursor-grab active:cursor-grabbing transition-all flex items-center justify-center min-h-[60px] text-center
                                ${isConnected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-300"}
                            `}
              >
                {renderItemContent(item)}
                {/* Anchor Point (Left) */}
                <div
                  className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-white ${isConnected ? "bg-blue-500" : "bg-gray-300 group-hover:bg-blue-300"}`}
                ></div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-400 text-center">
        按住选项圆点或卡片拖动到另一侧进行连线。点击已有的连线可删除。
      </div>
    </div>
  );
};
