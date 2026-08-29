"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function safeUrlTransform(url: string): string {
  const u = url.trim().toLowerCase();
  if (u.startsWith("javascript:") || u.startsWith("data:")) return "#";
  return url;
}

export function MarkdownView({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={safeUrlTransform}
        components={{
          a({ children, ...props }) {
            return (
              <a {...props} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
