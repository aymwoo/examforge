import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

import "katex/dist/katex.min.css";

type MarkdownRendererProps = {
  content: string;
  className?: string;
};

export default function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[
          [
            rehypeKatex,
            {
              throwOnError: false,
              trust: false,
              strict: false,
            },
          ],
          rehypeHighlight,
        ]}
        components={{
          p: ({ node, ...props }) => <p className="my-2" {...props} />,
          h1: ({ node, ...props }) => (
            <h1 className="text-xl font-bold mt-4 mb-2" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-lg font-bold mt-3 mb-2" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-base font-bold mt-2 mb-1" {...props} />
          ),
          code: ({ node, className, ...props }) => {
            const isBlock = Boolean(className);
            if (!isBlock) {
              return (
                <code
                  className="bg-gray-100 px-1 py-0.5 rounded text-sm"
                  {...props}
                />
              );
            }
            return (
              <code
                className="block bg-gray-100 p-3 rounded text-sm overflow-x-auto"
                {...props}
              />
            );
          },
          pre: ({ node, ...props }) => (
            <pre
              className="bg-gray-100 p-3 rounded my-2 overflow-x-auto"
              {...props}
            />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-semibold" {...props} />
          ),
          em: ({ node, ...props }) => <em className="italic" {...props} />,
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside ml-4 my-2" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside ml-4 my-2" {...props} />
          ),
          li: ({ node, ...props }) => <li className="my-1" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-gray-300 pl-4 italic text-gray-600"
              {...props}
            />
          ),
          div: ({ node, ...props }) => {
            if (props.className?.includes("math")) {
              return <div className="my-2" {...props} />;
            }
            return <div {...props} />;
          },
          span: ({ node, ...props }) => {
            if (props.className?.includes("math")) {
              return <span className="align-middle" {...props} />;
            }
            return <span {...props} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
