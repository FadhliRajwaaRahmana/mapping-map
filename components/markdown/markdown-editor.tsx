"use client";

import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { useTheme } from "next-themes";

export function MarkdownEditor({
  value,
  onChange,
  readOnly = false,
}: {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const editorTheme = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <CodeMirror
      value={value}
      height="100%"
      readOnly={readOnly}
      theme={editorTheme}
      extensions={[
        markdown({ base: markdownLanguage, codeLanguages: languages }),
      ]}
      onChange={onChange}
    />
  );
}
