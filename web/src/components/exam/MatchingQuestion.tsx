import React, { useState, useEffect, useRef, useMemo } from 'react';

interface MatchingPair {
  left: string;
  right: string;
}

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
  disabled
}) => {
  const [leftItems, setLeftItems] = useState<string[]>([]);
  const [rightItems, setRightItems] = useState<string[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  
  // Parse value into pairs
  const pairs: MatchingPair[] = useMemo(() => {
    if (Array.isArray(value)) return value;
    try {
      if (typeof value === 'string') {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) return parsed;
      }
    } catch(e) {}
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
    if (matching && matching.leftItems?.length > 0 && matching.rightItems?.length > 0) {
      setLeftItems(matching.leftItems);
      setRightItems(matching.rightItems);
    } else {
        // Fallback: Parse content
        // Pattern: "左侧" ... "右侧" ...
        try {
            const cleanContent = content.replace(/\s+/g, ' ');
            // Simple split by "左侧" and "右侧"
            const leftIndex = cleanContent.indexOf("左侧");
            const rightIndex = cleanContent.indexOf("右侧");
            
            if (leftIndex !== -1 && rightIndex !== -1 && rightIndex > leftIndex) {
                 const leftPart = cleanContent.substring(leftIndex, rightIndex);
                 const rightPart = cleanContent.substring(rightIndex);
                 
                 const extract = (text: string) => {
                     // Split by dash or commonly used separators
                     return text
                        .split(/[-–—]/)
                        .map(s => s.trim())
                        .filter(s => s && !s.includes('左侧') && !s.includes('右侧') && !s.includes('请将'));
                 };
                 
                 setLeftItems(extract(leftPart));
                 setRightItems(extract(rightPart));
            }
        } catch(e) {
            console.error("Failed to parse matching content fallback", e);
        }
    }
  }, [matching, content]);

  // Handle Resize to redraw lines
  useEffect(() => {
      const handleResize = () => setTick(t => t+1);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Auto-update positions slightly after render to ensure DOM is ready
  useEffect(() => {
     const timer = setTimeout(() => setTick(t => t+1), 100);
     return () => clearTimeout(timer);
  }, [leftItems, rightItems]);

  const handleLeftClick = (item: string) => {
    if (disabled) return;
    // Toggle selection
    if (selectedLeft === item) {
        setSelectedLeft(null);
    } else {
        setSelectedLeft(item);
    }
  };

  const handleRightClick = (item: string) => {
      if (disabled) return;
      if (!selectedLeft) return;
      
      // Update pairs
      const newPairs = [...pairs];
      // Remove existing pair for the selected left item if any
      const existingIdx = newPairs.findIndex(p => p.left === selectedLeft);
      if (existingIdx !== -1) {
          newPairs.splice(existingIdx, 1);
      }
      
      // Remove existing pair having this right item (assuming 1-to-1)
      const existingRightIdx = newPairs.findIndex(p => p.right === item);
      if (existingRightIdx !== -1) {
          newPairs.splice(existingRightIdx, 1);
      }
      
      newPairs.push({ left: selectedLeft, right: item });
      onChange(newPairs);
      setSelectedLeft(null); // Deselect after connecting
  };

  // Calculate Lines
  const renderLines = () => {
      if (!containerRef.current) return null;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      
      return pairs.map((pair) => {
          const lNode = leftRefs.current[pair.left];
          const rNode = rightRefs.current[pair.right];
          if (!lNode || !rNode) return null;
          
          const lRect = lNode.getBoundingClientRect();
          const rRect = rNode.getBoundingClientRect();
          
          // Calculate relative coords
          const x1 = lRect.right - containerRect.left;
          const y1 = lRect.top + lRect.height/2 - containerRect.top;
          const x2 = rRect.left - containerRect.left;
          const y2 = rRect.top + rRect.height/2 - containerRect.top;
          
          return (
              <line 
                key={`${pair.left}-${pair.right}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#3B82F6"
                strokeWidth="2"
                strokeDasharray="0"
              />
          );
      });
  };
  
  // Handle Current Selection Line (Phantom Line)
  // This would require tracking mouse position, might be overkill for now.

  if (leftItems.length === 0 || rightItems.length === 0) {
      return (
          <div className="p-4 text-gray-500 border border-dashed rounded-lg text-center">
              暂无连线数据，请尝试通过题干描述作答。
          </div>
      );
  }

  return (
    <div className="w-full relative select-none" ref={containerRef}>
        {/* SVG Layer */}
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-10" style={{ minHeight: '300px' }}>
            {renderLines()}
        </svg>
        
        <div className="flex justify-between items-start gap-10 relative z-20">
            {/* Left Column */}
            <div className="flex-1 flex flex-col gap-6">
                {leftItems.map((item) => {
                    const isSelected = selectedLeft === item;
                    const isConnected = pairs.some(p => p.left === item);
                    return (
                        <div 
                            key={item}
                            ref={el => { leftRefs.current[item] = el; }}
                            onClick={() => handleLeftClick(item)}
                            className={`
                                p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-center min-h-[60px] text-center
                                ${isSelected ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200' : 'border-gray-200 bg-white hover:border-blue-300'}
                                ${isConnected ? 'border-blue-500 bg-blue-50' : ''}
                            `}
                        >
                            <span className="text-sm font-medium text-ink-900">{item}</span>
                        </div>
                    );
                })}
            </div>
            
            {/* Right Column */}
            <div className="flex-1 flex flex-col gap-6">
                {rightItems.map((item) => {
                    const isConnected = pairs.some(p => p.right === item);
                    return (
                        <div 
                            key={item}
                            ref={el => { rightRefs.current[item] = el; }}
                            onClick={() => handleRightClick(item)}
                            className={`
                                p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-center min-h-[60px] text-center
                                ${isConnected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'}
                            `}
                        >
                             <span className="text-sm font-medium text-ink-900">{item}</span>
                        </div>
                    );
                })}
            </div>
        </div>
        
        <div className="mt-4 text-xs text-gray-400 text-center">
           点击左侧选项选中，再点击右侧选项进行连线。再次点击可修改。
        </div>
    </div>
  );
};
